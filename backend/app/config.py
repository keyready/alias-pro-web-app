from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load local configuration while keeping explicitly provided environment variables authoritative.
load_dotenv()

DEFAULT_LOCAL_STORAGE_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_VERCEL_STORAGE_DIR = Path("/tmp/alias-web-data")


def get_storage_root() -> Path:
    configured = os.getenv("ALIAS_STORAGE_DIR")
    if configured:
        return Path(configured).expanduser().resolve()
    if os.getenv("VERCEL"):
        return DEFAULT_VERCEL_STORAGE_DIR
    return DEFAULT_LOCAL_STORAGE_DIR
