from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class User(BaseModel):
    schemaVersion: int = 1
    telegramUserId: str
    firstName: str = "Dev"
    username: str | None = None
    createdAt: datetime
    updatedAt: datetime
