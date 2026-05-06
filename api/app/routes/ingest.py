"""
DevIntel AI — Ingestion Routes
Handles async repo ingestion pipeline.
"""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db, AsyncSessionLocal
from app.db.models import Project, FileRecord
from app.core.security import get_current_user_id
from app.schemas import IngestRequest, IngestStatus, ArchitectureSummary
from app.services.github_loader import load_repository
from app.services.parser import parse_file
from app.services.chunker import chunk_file
from app.services.embeddings import generate_embeddings
from app.services.vector_store import upsert_chunks, ensure_collection
from app.services.architecture import generate_architecture_summary

logger = logging.getLogger(__name__)
router = APIRouter()

EMBED_BATCH_SIZE = 50  # chunks per embedding batch


async def _run_ingestion_pipeline(project_id: str, github_url: str):
    """
    Full ingestion pipeline (runs as a background task):
    1. Load files from GitHub
    2. Parse & classify
    3. Chunk intelligently
    4. Generate embeddings (batched)
    5. Upsert into Qdrant
    6. Save file metadata to PostgreSQL
    7. Update project status
    """
    async with AsyncSessionLocal() as db:
        try:
            # Mark as ingesting
            result = await db.execute(select(Project).where(Project.id == project_id))
            project = result.scalar_one_or_none()
            if not project:
                return
            project.status = "ingesting"
            await db.commit()

            # 1. Load repo files
            logger.info("[%s] Loading repository: %s", project_id, github_url)
            raw_files = await load_repository(github_url)
            logger.info("[%s] Loaded %d files", project_id, len(raw_files))

            if not raw_files:
                project.status = "failed"
                project.error_message = "No processable files found in repository"
                await db.commit()
                return

            # 2. Parse files
            parsed_files = [parse_file(f["path"], f["content"]) for f in raw_files]

            # 3. Chunk
            all_chunks = []
            for pf in parsed_files:
                chunks = chunk_file(pf)
                all_chunks.extend(chunks)
            logger.info("[%s] Total chunks: %d", project_id, len(all_chunks))

            # 4. Embeddings (batched)
            await ensure_collection()
            for i in range(0, len(all_chunks), EMBED_BATCH_SIZE):
                batch = all_chunks[i : i + EMBED_BATCH_SIZE]
                texts = [c["content"] for c in batch]
                vectors = await generate_embeddings(texts)
                await upsert_chunks(project_id, batch, vectors)
                logger.info("[%s] Embedded batch %d-%d", project_id, i, i + len(batch))

            # 5. Save file records to PostgreSQL
            file_path_to_chunks: dict[str, int] = {}
            for chunk in all_chunks:
                fp = chunk["file_path"]
                file_path_to_chunks[fp] = file_path_to_chunks.get(fp, 0) + 1

            # Detect primary language
            lang_counts: dict[str, int] = {}
            for pf in parsed_files:
                lang = pf.get("language")
                if lang:
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
            primary_language = max(lang_counts, key=lang_counts.get) if lang_counts else None

            for pf in parsed_files:
                fr = FileRecord(
                    project_id=project_id,
                    file_path=pf["path"],
                    file_type=pf["file_type"],
                    language=pf.get("language"),
                    size_bytes=len(pf["content"].encode()),
                    chunk_count=file_path_to_chunks.get(pf["path"], 0),
                )
                db.add(fr)

            # 6. Update project stats
            project.status = "ready"
            project.total_files = len(parsed_files)
            project.total_chunks = len(all_chunks)
            project.primary_language = primary_language
            await db.commit()

            logger.info(
                "[%s] Ingestion complete: %d files, %d chunks",
                project_id, len(parsed_files), len(all_chunks),
            )

        except Exception as e:
            logger.exception("[%s] Ingestion failed: %s", project_id, e)
            try:
                result = await db.execute(select(Project).where(Project.id == project_id))
                project = result.scalar_one_or_none()
                if project:
                    project.status = "failed"
                    project.error_message = str(e)[:500]
                    await db.commit()
            except Exception:
                pass


@router.post("/repo", response_model=IngestStatus)
async def ingest_repo(
    payload: IngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Trigger async repository ingestion for a project."""
    result = await db.execute(
        select(Project).where(Project.id == payload.project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status == "ingesting":
        raise HTTPException(status_code=409, detail="Ingestion already in progress")

    background_tasks.add_task(
        _run_ingestion_pipeline,
        project_id=project.id,
        github_url=project.github_url,
    )

    return IngestStatus(
        project_id=project.id,
        status="ingesting",
        total_files=0,
        total_chunks=0,
        message="Ingestion started. Poll /ingest/status/{project_id} for updates.",
    )


@router.get("/status/{project_id}", response_model=IngestStatus)
async def ingestion_status(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Poll ingestion status for a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return IngestStatus(
        project_id=project.id,
        status=project.status,
        total_files=project.total_files,
        total_chunks=project.total_chunks,
        message=project.error_message,
    )


@router.get("/architecture/{project_id}", response_model=ArchitectureSummary)
async def get_architecture(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Generate or retrieve architecture summary for a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "ready":
        raise HTTPException(status_code=400, detail="Project not yet ingested")

    # Get file records
    from app.db.models import FileRecord
    fr_result = await db.execute(
        select(FileRecord).where(FileRecord.project_id == project_id)
    )
    file_records = [
        {"path": fr.file_path, "content": "", "file_type": fr.file_type}
        for fr in fr_result.scalars().all()
    ]
    file_paths = [fr["path"] for fr in file_records]

    return await generate_architecture_summary(
        project_id=project_id,
        file_records=file_records,
        file_paths=file_paths,
    )
