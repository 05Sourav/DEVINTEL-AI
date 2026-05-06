"""
DevIntel AI — Architecture Summary Service
Analyzes a repository's structure to produce an architecture overview.
"""

import json
import logging
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)

ARCH_SYSTEM_PROMPT = """You are DevIntel AI, a senior software architect.
Analyze the provided repository file tree and config file contents.
Produce a structured architecture summary in JSON format with this exact schema:

{
  "frontend": "...",
  "backend": "...",
  "database": "...",
  "auth": "...",
  "caching": "...",
  "deployment": "...",
  "languages": ["..."],
  "frameworks": ["..."],
  "summary": "2-3 sentence narrative description of the architecture"
}

If a field is unknown, use null.
Base your answer strictly on the file tree and configs provided.
Return only valid JSON, no markdown, no backticks.
"""


def _extract_config_snippets(file_records: List[dict]) -> str:
    CONFIG_FILES = {
        "package.json", "pyproject.toml", "requirements.txt",
        "docker-compose.yml", "docker-compose.yaml",
        "dockerfile", "go.mod", "cargo.toml", "pom.xml",
    }
    snippets = []
    for f in file_records:
        name = f["path"].split("/")[-1].lower()
        if name in CONFIG_FILES and f.get("content"):
            snippets.append(f"=== {f['path']} ===\n{f['content'][:800]}")
    return "\n\n".join(snippets[:5])


async def generate_architecture_summary(
    project_id: str,
    file_records: List[dict],
    file_paths: List[str],
) -> dict:
    tree_lines = "\n".join(sorted(file_paths)[:200])
    config_snippets = _extract_config_snippets(file_records)

    user_content = (
        f"Repository File Tree:\n{tree_lines}\n\n"
        f"Key Config Files:\n{config_snippets}"
    )

    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=[
                {"role": "system", "content": ARCH_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        detected_stack = json.loads(raw)

    elif provider == "gemini":
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=ARCH_SYSTEM_PROMPT + "\n\n" + user_content,
        )
        text = resp.text.strip().strip("```json").strip("```").strip()
        detected_stack = json.loads(text)

    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")

    summary = detected_stack.pop("summary", "Architecture analysis complete.")

    logger.info("Generated architecture summary for project=%s", project_id)
    return {
        "project_id": project_id,
        "summary": summary,
        "detected_stack": detected_stack,
    }