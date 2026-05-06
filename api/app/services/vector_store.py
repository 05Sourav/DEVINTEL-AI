"""
DevIntel AI — Qdrant Vector Store
Handles collection management, upsert, and vector search.
"""

import logging
import uuid
from typing import List

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchRequest,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
        )
    return _client


async def ensure_collection():
    """Create Qdrant collection if it doesn't already exist."""
    client = get_qdrant_client()
    collections = await client.get_collections()
    existing = [c.name for c in collections.collections]
    if settings.QDRANT_COLLECTION not in existing:
        await client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=settings.VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection: %s", settings.QDRANT_COLLECTION)


async def upsert_chunks(project_id: str, chunks: List[dict], embeddings: List[List[float]]):
    """
    Upsert chunk embeddings into Qdrant with payload metadata.
    Each point payload includes: project_id, file_path, file_type, language, chunk_index, content.
    """
    client = get_qdrant_client()
    await ensure_collection()

    points = []
    for chunk, vector in zip(chunks, embeddings):
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "project_id": project_id,
                    "file_path": chunk["file_path"],
                    "file_type": chunk.get("file_type", "other"),
                    "language": chunk.get("language"),
                    "chunk_index": chunk.get("chunk_index", 0),
                    "chunk_type": chunk.get("chunk_type", "raw"),
                    "content": chunk["content"],
                },
            )
        )

    # Qdrant upsert in batches
    BATCH = 100
    for i in range(0, len(points), BATCH):
        await client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points[i : i + BATCH],
        )
    logger.info("Upserted %d points for project %s", len(points), project_id)


async def semantic_search(project_id: str, query_vector: List[float], top_k: int) -> List[dict]:
    """Perform vector similarity search filtered by project_id."""
    client = get_qdrant_client()

    results = await client.query_points(
        collection_name=settings.QDRANT_COLLECTION,
        query=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
        ),
        limit=top_k,
        with_payload=True,
    )

    return [
        {
            "score": hit.score,
            "content": hit.payload.get("content", ""),
            "file_path": hit.payload.get("file_path", ""),
            "file_type": hit.payload.get("file_type", ""),
            "language": hit.payload.get("language"),
            "chunk_index": hit.payload.get("chunk_index", 0),
        }
        for hit in results.points
    ]


async def delete_project_chunks(project_id: str):
    """Remove all Qdrant points belonging to a project."""
    client = get_qdrant_client()
    await client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
        ),
    )
    logger.info("Deleted all Qdrant chunks for project %s", project_id)
