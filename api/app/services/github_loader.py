"""
DevIntel AI — GitHub Repository Loader
Fetches repository contents via the GitHub API (no git clone needed).
"""

import base64
import logging
from pathlib import PurePosixPath
from typing import Iterator
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── File filters ───────────────────────────────────────────────────────────────

IGNORE_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "__pycache__",
    ".venv", "venv", "env", ".env", "coverage", ".nyc_output",
    "vendor", "target", "out", "bin", "obj", ".idea", ".vscode",
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
    ".lock", ".woff", ".woff2", ".ttf", ".eot",
    ".pyc", ".class", ".o", ".so", ".dll", ".exe",
}

MAX_FILE_SIZE_BYTES = 200_000  # 200 KB per file


def _build_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return headers


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL."""
    url = url.rstrip("/").replace(".git", "")
    parts = url.split("github.com/")
    if len(parts) != 2:
        raise ValueError(f"Invalid GitHub URL: {url}")
    segments = parts[1].split("/")
    if len(segments) < 2:
        raise ValueError(f"Cannot parse owner/repo from: {url}")
    return segments[0], segments[1]


async def fetch_repo_tree(owner: str, repo: str) -> list[dict]:
    """
    Fetch the flat file tree of a GitHub repo using the Git Trees API.
    Returns list of {path, size} dicts for blobs only.
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_build_headers())
        resp.raise_for_status()
        data = resp.json()

    files = []
    for item in data.get("tree", []):
        if item["type"] != "blob":
            continue
        path = item["path"]
        size = item.get("size", 0)
        # Skip oversized files
        if size > MAX_FILE_SIZE_BYTES:
            logger.debug("Skipping large file: %s (%d bytes)", path, size)
            continue
        # Skip ignored directories
        parts = PurePosixPath(path).parts
        if any(part in IGNORE_DIRS for part in parts):
            continue
        # Skip ignored extensions
        ext = PurePosixPath(path).suffix.lower()
        if ext in IGNORE_EXTENSIONS:
            continue
        files.append({"path": path, "size": size, "sha": item["sha"]})
    return files


async def fetch_file_content(owner: str, repo: str, path: str) -> str:
    """Fetch a single file's content from GitHub, decoded from base64."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_build_headers())
        if resp.status_code == 404:
            return ""
        resp.raise_for_status()
        data = resp.json()

    encoding = data.get("encoding", "")
    content_b64 = data.get("content", "")
    if encoding == "base64":
        try:
            return base64.b64decode(content_b64).decode("utf-8", errors="replace")
        except Exception as e:
            logger.warning("Failed to decode %s: %s", path, e)
            return ""
    return data.get("content", "")


async def load_repository(github_url: str) -> Iterator[dict]:
    """
    Main entry point for repo loading.
    Yields dicts: {path, content, size}.
    """
    owner, repo = parse_github_url(github_url)
    logger.info("Loading repo: %s/%s", owner, repo)

    file_tree = await fetch_repo_tree(owner, repo)
    logger.info("Total eligible files found: %d", len(file_tree))

    results = []
    for file_info in file_tree:
        content = await fetch_file_content(owner, repo, file_info["path"])
        if content.strip():
            results.append({
                "path": file_info["path"],
                "content": content,
                "size": file_info["size"],
            })
    return results
