from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Team(BaseModel):
    id: str
    name: str
    color: str
    score: int = 0
    order: int
    side: Literal["maleTeam", "femaleTeam"] | None = None


class GameCreate(BaseModel):
    mode: Literal["classic", "genderBattle"] = "classic"
    dictionaryIds: list[str] = Field(default_factory=list)
    difficulties: list[Literal[1, 2, 3]] = Field(default_factory=lambda: [1, 2])
    targetScore: int = Field(default=50, ge=20, le=200)
    roundDuration: int = Field(default=60, ge=10, le=300)
    skipPenalty: int = Field(default=-1, ge=-1, le=0)
    lastWordEnabled: bool = True
    hintsEnabled: bool = True
    teams: list[Team] = Field(default_factory=list)
    includeNeutral: bool = False
    clientRequestId: str | None = None


class RoundWordResult(BaseModel):
    wordId: str
    word: str
    result: Literal["guessed", "skipped"]
    points: int
    hintUsed: bool = False


class RoundSync(BaseModel):
    clientRoundId: str
    teamId: str
    roundIndex: int
    words: list[RoundWordResult]
    scoreDelta: int
    finishedAt: datetime | None = None


class StoredGame(BaseModel):
    schemaVersion: int = 1
    id: str
    createdByTelegramUserId: str
    createdAt: datetime
    updatedAt: datetime
    config: GameCreate
    rounds: list[RoundSync] = Field(default_factory=list)
    roundIds: list[str] = Field(default_factory=list)
