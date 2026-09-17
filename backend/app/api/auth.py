from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import storage
from app.services.telegram_auth import extract_user, validate_init_data
from app.services.tokens import create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TelegramAuthRequest(BaseModel):
    initData: str


@router.post("/telegram")
def telegram_auth(payload: TelegramAuthRequest) -> dict:
    try:
        fields = validate_init_data(payload.initData)
        user = extract_user(fields)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    path = storage.path("users", f"{user['telegramUserId']}.json")
    existing = storage.read_json(path)
    if existing:
        user["createdAt"] = existing.get("createdAt", user["createdAt"])
        user["updatedAt"] = datetime.now(UTC).isoformat()
    storage.write_json(path, user)
    return {"token": create_token(user["telegramUserId"]), "user": user}
