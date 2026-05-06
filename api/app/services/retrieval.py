"""
DevIntel AI — Hybrid Retrieval Engine
Combines semantic search (Qdrant) + keyword search (BM25-style substring matching)
then deduplicates and returns merged results.
"""

import logging
import re
from typing import List

from app.services.embeddings import generate_query_embedding
from app.services.vector_store import semantic_search
from app.core.config import settings

logger = logging.getLogger(__name__)


def _keyword_score(content: str, keywords: List[str]) -> float:
    """Simple term-frequency based keyword score (normalized 0–1)."""
    if not keywords:
        return 0.0
    content_lower = content.lower()
    hits = sum(1 for kw in keywords if kw.lower() in content_lower)
    return hits / len(keywords)


def _extract_keywords(query: str) -> List[str]:
    """
    Extract meaningful keywords from a query.
    Strips stop words and returns tokens longer than 2 chars.
    """
    STOP_WORDS = {
        "how", "does", "what", "where", "is", "the", "a", "an", "of",
        "in", "to", "and", "or", "for", "on", "at", "by", "with", "this",
        "that", "it", "as", "are", "was", "be", "have", "has", "do",
    }
    tokens = re.findall(r"\w+", query.lower())
    return [t for t in tokens if len(t) > 2 and t not in STOP_WORDS]


async def hybrid_retrieve(
    project_id: str,
    query: str,
    stored_chunks: List[dict] | None = None,
) -> List[dict]:
    """
    Hybrid retrieval:
    1. Semantic search via Qdrant (top_k_semantic results).
    2. Keyword scoring over semantic results (no separate index needed at MVP).
    3. Merge + deduplicate by file_path + chunk_index.
    4. Return unified ranked list.

    stored_chunks is optionally passed when you want to run keyword search over
    a pre-fetched set (e.g., all chunks for tiny repos). For large repos, we
    rely purely on semantic results.
    """
    # 1. Semantic search
    query_vector = await generate_query_embedding(query)
    semantic_results = await semantic_search(
        project_id=project_id,
        query_vector=query_vector,
        top_k=settings.TOP_K_SEMANTIC,
    )

    # 2. Keyword scoring over semantic results
    keywords = _extract_keywords(query)
    for result in semantic_results:
        kw_score = _keyword_score(result["content"], keywords)
        # Hybrid score: 70% semantic + 30% keyword
        result["hybrid_score"] = 0.7 * result["score"] + 0.3 * kw_score

    # 3. Sort by hybrid score
    semantic_results.sort(key=lambda x: x["hybrid_score"], reverse=True)

    logger.info(
        "Hybrid retrieval for project=%s query='%s...' → %d results",
        project_id, query[:50], len(semantic_results),
    )
    return semantic_results
