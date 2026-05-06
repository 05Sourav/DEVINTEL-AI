"""
DevIntel AI — Embeddings Service
Generates vector embeddings using OpenAI or Gemini.
"""

import logging
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


async def _embed_openai(texts: List[str]) -> List[List[float]]:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        resp = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=batch,
        )
        all_embeddings.extend([item.embedding for item in resp.data])
    return all_embeddings


async def _embed_gemini(texts: List[str]) -> List[List[float]]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    all_embeddings = []

    for text in texts:
        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        all_embeddings.append(result.embeddings[0].values)

    return all_embeddings


async def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    provider = settings.AI_PROVIDER.lower()
    logger.info("Generating embeddings for %d texts via %s", len(texts), provider)

    if provider == "openai":
        return await _embed_openai(texts)
    elif provider == "gemini":
        return await _embed_gemini(texts)
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")


async def generate_query_embedding(query: str) -> List[float]:
    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=[query],
        )
        return resp.data[0].embedding

    elif provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=query,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        return result.embeddings[0].values

    raise ValueError(f"Unknown AI_PROVIDER: {provider}")