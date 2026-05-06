"""
DevIntel AI — Application Configuration
Reads from environment variables / .env file via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "DevIntel AI"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/devintel"

    # ── Qdrant ────────────────────────────────────────────────────────────────
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "devintel_chunks"

    # ── AI Providers ──────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_PROVIDER: str = "openai"          # "openai" | "gemini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    CHAT_MODEL: str = "gpt-4o-mini"

    # ── GitHub ────────────────────────────────────────────────────────────────
    GITHUB_TOKEN: str = ""               # optional — raises rate limit

    # ── Retrieval ─────────────────────────────────────────────────────────────
    TOP_K_SEMANTIC: int = 10
    TOP_K_KEYWORD: int = 5
    TOP_K_RERANKED: int = 5
    VECTOR_SIZE: int = 1536              # must match embedding model


settings = Settings()
