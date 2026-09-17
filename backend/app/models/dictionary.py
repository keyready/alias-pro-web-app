from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Gender = Literal["male", "female", "neutral"]
Difficulty = Literal[1, 2, 3]


class DictionaryWord(BaseModel):
    id: str
    word: str = Field(min_length=1, max_length=100)
    normalizedWord: str
    difficulty: Difficulty = 1
    hint: str | None = Field(default=None, max_length=200)
    gender: Gender = "neutral"


class Dictionary(BaseModel):
    schemaVersion: int = 1
    id: str
    title: str
    description: str = ""
    createdByTelegramUserId: str | None = None
    wordsCount: int = 0
    createdAt: datetime
    updatedAt: datetime
    source: Literal["system", "upload"] = "upload"
    words: list[DictionaryWord]


class DictionaryIndexItem(BaseModel):
    id: str
    title: str
    description: str = ""
    createdByTelegramUserId: str | None = None
    wordsCount: int
    createdAt: datetime
    updatedAt: datetime
    source: Literal["system", "upload"]


class ImportErrorRow(BaseModel):
    row: int
    field: str
    value: str
    message: str


class ImportPreview(BaseModel):
    importToken: str
    format: Literal["txt", "csv"]
    totalRows: int
    validRows: int
    duplicates: int
    invalidRows: int
    errors: list[ImportErrorRow]
    preview: list[DictionaryWord]
