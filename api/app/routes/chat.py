"""
DevIntel AI — Chat Routes
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Chat, Message, Project
from app.core.security import get_current_user_id
from app.schemas import ChatCreate, ChatOut, MessageOut, AskRequest, AskResponse
from app.services.chat_engine import answer_question

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ChatOut, status_code=201)
async def create_chat(
    payload: ChatCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == payload.project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "ready":
        raise HTTPException(status_code=400, detail="Project not yet ingested — cannot chat")

    chat = Chat(project_id=payload.project_id, user_id=user_id, title=payload.title)
    db.add(chat)
    await db.flush()
    await db.refresh(chat)
    return chat


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
async def get_messages(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    msgs_result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()

    # Deserialize citations JSON
    out = []
    for m in messages:
        citations = json.loads(m.citations) if m.citations else []
        out.append(MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=citations,
            created_at=m.created_at,
        ))
    return out


@router.post("/ask", response_model=AskResponse)
async def ask(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Ask a question within a chat session."""
    # Verify chat belongs to user
    result = await db.execute(
        select(Chat).where(Chat.id == payload.chat_id, Chat.user_id == user_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Load conversation history for context
    msgs_result = await db.execute(
        select(Message).where(Message.chat_id == payload.chat_id).order_by(Message.created_at)
    )
    history_rows = msgs_result.scalars().all()
    conversation_history = [
        {"role": m.role, "content": m.content}
        for m in history_rows[-8:]  # last 4 turns
    ]

    # Save user message
    user_msg = Message(
        chat_id=payload.chat_id,
        role="user",
        content=payload.question,
    )
    db.add(user_msg)
    await db.flush()

    # Run RAG pipeline
    result_data = await answer_question(
        project_id=chat.project_id,
        question=payload.question,
        conversation_history=conversation_history,
    )

    # Save assistant message
    assistant_msg = Message(
        chat_id=payload.chat_id,
        role="assistant",
        content=result_data["answer"],
        citations=json.dumps(result_data["citations"]),
    )
    db.add(assistant_msg)
    await db.flush()
    await db.refresh(assistant_msg)

    return AskResponse(
        answer=result_data["answer"],
        citations=result_data["citations"],
        chat_id=payload.chat_id,
        message_id=assistant_msg.id,
    )


@router.get("/project/{project_id}", response_model=list[ChatOut])
async def list_project_chats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Chat)
        .where(Chat.project_id == project_id, Chat.user_id == user_id)
        .order_by(Chat.created_at.desc())
    )
    return result.scalars().all()
