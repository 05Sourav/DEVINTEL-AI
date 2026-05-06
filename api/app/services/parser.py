"""
DevIntel AI — File Classifier / Parser
Classifies files by type and extracts clean text content.
"""

from pathlib import PurePosixPath
from typing import Literal

FileType = Literal["code", "markdown", "config", "other"]

# ── Language/Type Maps ────────────────────────────────────────────────────────

CODE_EXTENSIONS: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
}

MARKDOWN_EXTENSIONS = {".md", ".mdx", ".rst", ".txt"}

CONFIG_EXTENSIONS = {
    ".json", ".yaml", ".yml", ".toml", ".ini", ".env",
    ".env.example", ".cfg", ".conf", ".xml",
}

CONFIG_FILENAMES = {
    "package.json", "tsconfig.json", "pyproject.toml", "setup.py",
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".gitignore", "makefile", "justfile", "cargo.toml",
}


def classify_file(path: str) -> tuple[FileType, str | None]:
    """
    Returns (file_type, language_or_None).
    """
    p = PurePosixPath(path)
    ext = p.suffix.lower()
    name = p.name.lower()

    if ext in CODE_EXTENSIONS:
        return "code", CODE_EXTENSIONS[ext]
    if ext in MARKDOWN_EXTENSIONS:
        return "markdown", None
    if ext in CONFIG_EXTENSIONS or name in CONFIG_FILENAMES:
        return "config", None
    return "other", None


def clean_content(content: str, file_type: FileType) -> str:
    """
    Light cleaning: strip null bytes, normalize line endings.
    Preserves code formatting exactly.
    """
    content = content.replace("\x00", "")
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    # Truncate absurdly long lines (minified files etc.)
    lines = []
    for line in content.splitlines():
        if len(line) > 2000:
            lines.append(line[:2000] + "  ... [truncated]")
        else:
            lines.append(line)
    return "\n".join(lines)


def parse_file(path: str, content: str) -> dict:
    """
    Parse a raw file into structured metadata + cleaned content.
    Returns dict with: path, file_type, language, content.
    """
    file_type, language = classify_file(path)
    cleaned = clean_content(content, file_type)
    return {
        "path": path,
        "file_type": file_type,
        "language": language,
        "content": cleaned,
    }
