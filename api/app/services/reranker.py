"""
DevIntel AI — Reranker
Takes top-N retrieved chunks and reranks them using LLM scoring
for higher relevance before the final answer generation.
"""

import logging
import json
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)


RERANK_SYSTEM_PROMPT = """You are a code search relevance expert.
Given a user query and a list of code/documentation chunks, 
score each chunk for relevance (0.0 to 1.0).
Return ONLY a JSON array of scores in the same order as the input chunks.
Example: [0.95, 0.3, 0.72]"""


async def _rerank_with_llm(query: str, chunks: List[dict]) -> List[float]:
    """Use LLM to score each chunk's relevance to the query."""
    chunk_texts = []
    for i, chunk in enumerate(chunks):
        preview = chunk["content"][:300].replace("\n", " ")
        chunk_texts.append(f"[{i}] ({chunk['file_path']}) {preview}")

    user_content = (
        f"Query: {query}\n\n"
        f"Chunks:\n" + "\n".join(chunk_texts) +
        "\n\nReturn a JSON array of relevance scores (0.0-1.0) for each chunk."
    )

    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": RERANK_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        # LLM returns {"scores": [...]} or just [...]
        parsed = json.loads(raw)
        scores = parsed if isinstance(parsed, list) else parsed.get("scores", [])

    elif provider == "gemini":
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=settings.CHAT_MODEL,
            contents=RERANK_SYSTEM_PROMPT + "\n\n" + user_content,
        )
        text = resp.text.strip().strip("```json").strip("```").strip()
        scores = json.loads(text)
        if isinstance(scores, dict):
            scores = list(scores.values())[0]
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")

    # Ensure we have a score for every chunk
    while len(scores) < len(chunks):
        scores.append(0.0)
    return [float(s) for s in scores[: len(chunks)]]


async def rerank(query: str, chunks: List[dict]) -> List[dict]:
    """
    Rerank chunks by LLM relevance scores.
    Falls back to original order on any error.
    Returns top-K reranked chunks.
    """
    if not chunks:
        return []

    try:
        scores = await _rerank_with_llm(query, chunks)
        for chunk, score in zip(chunks, scores):
            chunk["rerank_score"] = score

        reranked = sorted(chunks, key=lambda x: x.get("rerank_score", 0.0), reverse=True)
        logger.info("Reranked %d chunks → keeping top %d", len(chunks), settings.TOP_K_RERANKED)
        return reranked[: settings.TOP_K_RERANKED]

    except Exception as e:
        logger.warning("Reranker failed (%s), using original order", e)
        return chunks[: settings.TOP_K_RERANKED]
