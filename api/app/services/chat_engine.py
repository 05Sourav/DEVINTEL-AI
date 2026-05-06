"""
DevIntel AI — Chat Engine
Orchestrates retrieval → reranking → LLM generation → citation extraction.
"""

import json
import logging
from typing import List

from app.core.config import settings
from app.services.retrieval import hybrid_retrieve
from app.services.reranker import rerank

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are DevIntel AI, an expert software engineering assistant.
You help developers understand codebases by analyzing retrieved code chunks.

Rules:
1. Answer based ONLY on the provided code context.
2. If the context doesn't contain enough information, say so clearly. Do NOT hallucinate.
3. Always cite the specific files where you found the information.
4. Be precise and technical. Developers reading this are experienced.
5. Format code examples using markdown code blocks with language tags.
6. Structure long answers with headers for clarity.
"""


def _build_context_block(chunks: List[dict]) -> str:
    """Format retrieved chunks as a context block for the LLM."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        header = f"--- [{i}] {chunk['file_path']} ---"
        parts.append(f"{header}\n{chunk['content']}")
    return "\n\n".join(parts)


def _extract_citations(chunks: List[dict]) -> List[str]:
    """Extract unique file paths from top chunks (preserving order)."""
    seen = set()
    citations = []
    for chunk in chunks:
        path = chunk.get("file_path", "")
        if path and path not in seen:
            seen.add(path)
            citations.append(path)
    return citations


async def _call_llm(messages: list) -> str:
    """Send messages to the configured LLM and return the response text."""
    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=messages,
            temperature=0.2,
        )
        return resp.choices[0].message.content

    elif provider == "gemini":
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Build contents with system + history + user message
        system = messages[0]["content"] if messages[0]["role"] == "system" else ""
        user_msg = messages[-1]["content"]
        history_parts = ""
        for msg in messages[1:-1]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_parts += f"{role}: {msg['content']}\n\n"

        full_prompt = f"{system}\n\n{history_parts}User: {user_msg}"

        resp = client.models.generate_content(
            model=settings.CHAT_MODEL,
            contents=full_prompt,
        )
        return resp.text

    raise ValueError(f"Unknown AI_PROVIDER: {provider}")


async def answer_question(
    project_id: str,
    question: str,
    conversation_history: List[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline:
    1. Hybrid retrieve relevant chunks
    2. Rerank
    3. Build LLM messages with context + history
    4. Call LLM
    5. Return answer + citations

    Returns: {answer, citations, top_chunks}
    """
    # 1. Retrieval
    retrieved = await hybrid_retrieve(project_id=project_id, query=question)

    # 2. Reranking
    top_chunks = await rerank(query=question, chunks=retrieved)

    if not top_chunks:
        return {
            "answer": "I couldn't find relevant code in this repository to answer your question. Please try rephrasing or ask about a different aspect.",
            "citations": [],
            "top_chunks": [],
        }

    # 3. Build messages
    context = _build_context_block(top_chunks)
    citations = _extract_citations(top_chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add recent conversation history (last 4 turns = 8 messages)
    if conversation_history:
        messages.extend(conversation_history[-8:])

    messages.append({
        "role": "user",
        "content": (
            f"Code Context:\n{context}\n\n"
            f"Question: {question}\n\n"
            f"Please answer the question using the code context above. "
            f"Include specific file references in your answer."
        ),
    })

    # 4. LLM call
    answer = await _call_llm(messages)

    logger.info(
        "Answered question for project=%s | citations=%s",
        project_id, citations,
    )

    return {
        "answer": answer,
        "citations": citations,
        "top_chunks": top_chunks,
    }
