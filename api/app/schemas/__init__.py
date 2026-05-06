"""
DevIntel AI — Pydantic Schemas
"""

from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Projects ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    github_url: str
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    github_url: str
    description: Optional[str]
    status: str
    total_files: int
    total_chunks: int
    primary_language: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Ingestion ─────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    project_id: str


class IngestStatus(BaseModel):
    project_id: str
    status: str
    total_files: int
    total_chunks: int
    message: Optional[str] = None


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatCreate(BaseModel):
    project_id: str
    title: Optional[str] = "New Chat"


class ChatOut(BaseModel):
    id: str
    project_id: str
    title: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[str]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    chat_id: str
    question: str


class AskResponse(BaseModel):
    answer: str
    citations: List[str]
    chat_id: str
    message_id: str


# ── Architecture ──────────────────────────────────────────────────────────────

class ArchitectureSummary(BaseModel):
    project_id: str
    summary: str
    detected_stack: dict
