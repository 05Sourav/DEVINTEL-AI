"""
DevIntel AI — Smart File Chunker
Chunks files intelligently by type:
  - Code  → by function/class definitions
  - Markdown → by heading sections
  - Config → whole file or logical block
"""

import re
import logging
from typing import List

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MAX_CHUNK_SIZE = 1500        # characters
MIN_CHUNK_SIZE = 50          # discard smaller chunks
CHUNK_OVERLAP = 150          # character overlap between fallback chunks


# ── Regex patterns ────────────────────────────────────────────────────────────

# Python / JavaScript / TypeScript function & class definitions
CODE_SPLIT_PATTERN = re.compile(
    r"(?=\n(?:"
    r"def\s+\w+|"                          # Python def
    r"async\s+def\s+\w+|"                  # Python async def
    r"class\s+\w+|"                        # Python / TS class
    r"function\s+\w+|"                     # JS function
    r"const\s+\w+\s*=\s*(?:async\s*)?\(?.*\)?\s*=>|"  # JS/TS arrow func
    r"export\s+(?:default\s+)?(?:async\s+)?function\s+\w+|"  # TS export
    r"export\s+(?:default\s+)?class\s+\w+|"  # TS export class
    r"(?:public|private|protected|static|async)\s+\w+\s*\("  # Java/TS methods
    r"))",
    re.MULTILINE,
)

# Markdown headings (# / ## / ###)
MARKDOWN_SPLIT_PATTERN = re.compile(r"(?=\n#{1,3}\s)", re.MULTILINE)


def _sliding_window(text: str, max_size: int = MAX_CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Fallback: fixed-size chunks with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_size, len(text))
        chunks.append(text[start:end])
        start += max_size - overlap
    return chunks


def _merge_small_chunks(chunks: List[str]) -> List[str]:
    """Merge adjacent chunks that are too small into the next chunk."""
    merged = []
    buffer = ""
    for chunk in chunks:
        buffer += chunk
        if len(buffer) >= MIN_CHUNK_SIZE:
            merged.append(buffer)
            buffer = ""
    if buffer:
        if merged:
            merged[-1] += buffer
        else:
            merged.append(buffer)
    return merged


def chunk_code(content: str, path: str) -> List[dict]:
    """Chunk a code file by function/class boundaries."""
    parts = CODE_SPLIT_PATTERN.split(content)
    chunks = []
    for i, part in enumerate(parts):
        part = part.strip()
        if not part or len(part) < MIN_CHUNK_SIZE:
            continue
        if len(part) > MAX_CHUNK_SIZE:
            # Too large — sliding window fallback
            sub_chunks = _sliding_window(part)
            for j, sub in enumerate(sub_chunks):
                chunks.append({
                    "content": sub,
                    "chunk_index": len(chunks),
                    "chunk_type": "code_block",
                })
        else:
            chunks.append({
                "content": part,
                "chunk_index": len(chunks),
                "chunk_type": "code_block",
            })
    if not chunks:
        # Fallback for files with no recognizable definitions
        for c in _sliding_window(content):
            chunks.append({"content": c, "chunk_index": len(chunks), "chunk_type": "code_raw"})
    return chunks


def chunk_markdown(content: str, path: str) -> List[dict]:
    """Chunk markdown by heading sections."""
    parts = MARKDOWN_SPLIT_PATTERN.split(content)
    merged = _merge_small_chunks([p.strip() for p in parts if p.strip()])
    return [
        {"content": c, "chunk_index": i, "chunk_type": "markdown_section"}
        for i, c in enumerate(merged)
    ]


def chunk_config(content: str, path: str) -> List[dict]:
    """Config files: store as-is (small) or split by empty lines (large)."""
    if len(content) <= MAX_CHUNK_SIZE:
        return [{"content": content.strip(), "chunk_index": 0, "chunk_type": "config_full"}]
    # Split by blank lines for large configs
    blocks = re.split(r"\n\s*\n", content)
    merged = _merge_small_chunks([b.strip() for b in blocks if b.strip()])
    return [
        {"content": c, "chunk_index": i, "chunk_type": "config_block"}
        for i, c in enumerate(merged)
    ]


def chunk_file(parsed_file: dict) -> List[dict]:
    """
    Main chunking dispatcher.
    parsed_file: {path, file_type, language, content}
    Returns list of chunk dicts with metadata attached.
    """
    path = parsed_file["path"]
    content = parsed_file["content"]
    file_type = parsed_file["file_type"]
    language = parsed_file.get("language")

    if not content or len(content.strip()) < MIN_CHUNK_SIZE:
        return []

    if file_type == "code":
        raw_chunks = chunk_code(content, path)
    elif file_type == "markdown":
        raw_chunks = chunk_markdown(content, path)
    elif file_type == "config":
        raw_chunks = chunk_config(content, path)
    else:
        raw_chunks = _sliding_window(content)
        raw_chunks = [{"content": c, "chunk_index": i, "chunk_type": "raw"} for i, c in enumerate(raw_chunks)]

    # Attach shared metadata to each chunk
    for chunk in raw_chunks:
        chunk.update({
            "file_path": path,
            "file_type": file_type,
            "language": language,
        })

    logger.debug("Chunked %s → %d chunks", path, len(raw_chunks))
    return raw_chunks
