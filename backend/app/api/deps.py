from __future__ import annotations

from pathlib import Path

from fastapi import Depends, Header, HTTPException

from app.services.dictionary_service import DictionaryService
from app.services.game_service import GameService
from app.services.tokens import verify_token
from app.storage.json_storage import JsonStorage

storage = JsonStorage(Path(__file__).resolve().parents[2] / "data")
dictionary_service = DictionaryService(storage)
game_service = GameService(storage)


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    try:
        payload = verify_token(authorization.removeprefix("Bearer ").strip())
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return str(payload["sub"])


def dictionaries() -> DictionaryService:
    return dictionary_service


def games() -> GameService:
    return game_service


CurrentUser = Depends(current_user_id)
