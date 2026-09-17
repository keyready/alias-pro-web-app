from __future__ import annotations

import csv
import io
import re
import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.models.dictionary import Dictionary, DictionaryWord, ImportErrorRow, ImportPreview
from app.storage.json_storage import JsonStorage

MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 50_000
SAFE_DICTIONARY_ID = re.compile(r"^[A-Za-z0-9_-]+$")
SAFE_IMPORT_TOKEN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")


def normalize_word(value: str) -> str:
    return value.strip().lower()


def normalize_gender(value: str | None) -> str | None:
    normalized = (value or "").strip().lower()
    if not normalized:
        return "neutral"
    aliases = {
        "male": "male",
        "м": "male",
        "муж": "male",
        "мужской": "male",
        "female": "female",
        "ж": "female",
        "жен": "female",
        "женский": "female",
        "neutral": "neutral",
        "н": "neutral",
        "нейтральный": "neutral",
    }
    return aliases.get(normalized)


class DictionaryService:
    def __init__(self, storage: JsonStorage) -> None:
        self.storage = storage

    def ensure_seed_dictionary(self) -> None:
        index_path = self.storage.path("dictionaries", "index.json")
        if self.storage.read_json(index_path, []):
            return
        now = datetime.now(UTC)
        seed_words = [
            ("Капибара", 1, "Крупный южноамериканский грызун", "neutral"),
            ("Дрель", 1, "Инструмент для сверления", "male"),
            ("Помада", 1, "Косметика для губ", "female"),
            ("Карбюратор", 3, "Часть двигателя", "male"),
            ("Тушь", 2, "Для ресниц", "female"),
            ("Minecraft", 1, "Игра с блоками", "neutral"),
        ]
        words = [
            DictionaryWord(
                id=f"seed-{index}",
                word=word,
                normalizedWord=normalize_word(word),
                difficulty=difficulty,  # type: ignore[arg-type]
                hint=hint,
                gender=gender,  # type: ignore[arg-type]
            )
            for index, (word, difficulty, hint, gender) in enumerate(seed_words, start=1)
        ]
        dictionary = Dictionary(
            id="classic",
            title="Классический",
            description="Стартовый словарь для проверки MVP",
            wordsCount=len(words),
            createdAt=now,
            updatedAt=now,
            source="system",
            words=words,
        )
        self._save_dictionary(dictionary)

    def list_dictionaries(self, search: str | None = None) -> list[dict]:
        items = self.storage.read_json(self.storage.path("dictionaries", "index.json"), []) or []
        if search:
            query = search.lower()
            items = [item for item in items if query in item.get("title", "").lower()]
        return items

    def get_dictionary(self, dictionary_id: str) -> dict | None:
        self._validate_dictionary_id(dictionary_id)
        items = self.storage.read_json(self.storage.path("dictionaries", "index.json"), []) or []
        if not any(item.get("id") == dictionary_id for item in items):
            return None
        return self.storage.read_json(self.storage.path("dictionaries", f"{dictionary_id}.json"))

    async def preview_import(self, file: UploadFile) -> ImportPreview:
        suffix = Path(file.filename or "").suffix.lower().lstrip(".")
        if suffix not in {"txt", "csv"}:
            raise ValueError("only .txt and .csv files are supported")
        content = await file.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError("file is larger than 5 MB")
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("file must be valid UTF-8") from exc
        parsed = self._parse_txt(text) if suffix == "txt" else self._parse_csv(text)
        token = secrets.token_urlsafe(24)
        self.storage.write_json(
            self.storage.path("imports", f"{token}.json"),
            {"schemaVersion": 1, "format": suffix, "words": [word.model_dump() for word in parsed[0]]},
        )
        return ImportPreview(
            importToken=token,
            format=suffix,  # type: ignore[arg-type]
            totalRows=parsed[1],
            validRows=len(parsed[0]),
            duplicates=parsed[2],
            invalidRows=len(parsed[3]),
            errors=parsed[3],
            preview=parsed[0][:25],
        )

    def commit_import(
        self, import_token: str, title: str, description: str, telegram_user_id: str
    ) -> Dictionary:
        self._validate_import_token(import_token)
        data = self.storage.read_json(self.storage.path("imports", f"{import_token}.json"))
        if not data:
            raise ValueError("unknown or expired import token")
        words = [DictionaryWord(**word) for word in data["words"]]
        if not words:
            raise ValueError("cannot import an empty dictionary")
        now = datetime.now(UTC)
        dictionary = Dictionary(
            id=uuid4().hex[:12],
            title=title.strip() or "Новый словарь",
            description=description.strip(),
            createdByTelegramUserId=telegram_user_id,
            wordsCount=len(words),
            createdAt=now,
            updatedAt=now,
            source="upload",
            words=words,
        )
        self._save_dictionary(dictionary)
        return dictionary

    def _save_dictionary(self, dictionary: Dictionary) -> None:
        self._validate_dictionary_id(dictionary.id)
        self.storage.write_json(
            self.storage.path("dictionaries", f"{dictionary.id}.json"), dictionary.model_dump()
        )
        meta = dictionary.model_dump(exclude={"words"})
        self.storage.update_json_list(self.storage.path("dictionaries", "index.json"), meta)

    def _parse_txt(self, text: str) -> tuple[list[DictionaryWord], int, int, list[ImportErrorRow]]:
        lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        return self._build_words([(index, [line]) for index, line in enumerate(lines, start=1)], "txt")

    def _parse_csv(self, text: str) -> tuple[list[DictionaryWord], int, int, list[ImportErrorRow]]:
        rows = list(csv.reader(io.StringIO(text)))
        first = [cell.strip().lower() for cell in rows[0]] if rows else []
        if first and first[0] == "word":
            rows = rows[1:]
        return self._build_words([(index, row) for index, row in enumerate(rows, start=1)], "csv")

    def _build_words(
        self, rows: list[tuple[int, list[str]]], file_format: str
    ) -> tuple[list[DictionaryWord], int, int, list[ImportErrorRow]]:
        if len(rows) > MAX_ROWS:
            raise ValueError("file has more than 50 000 rows")
        words: list[DictionaryWord] = []
        errors: list[ImportErrorRow] = []
        seen: set[str] = set()
        duplicates = 0
        total = 0
        for row_number, row in rows:
            total += 1
            word = (row[0] if row else "").strip()
            if not word:
                continue
            if len(word) > 100:
                errors.append(ImportErrorRow(row=row_number, field="word", value=word, message="1–100 chars"))
                continue
            difficulty_raw = "1" if file_format == "txt" or len(row) < 2 or not row[1].strip() else row[1].strip()
            if difficulty_raw not in {"1", "2", "3"}:
                errors.append(
                    ImportErrorRow(row=row_number, field="difficulty", value=difficulty_raw, message="must be 1–3")
                )
                continue
            hint = None if file_format == "txt" or len(row) < 4 or not row[3].strip() else row[3].strip()
            if hint and len(hint) > 200:
                errors.append(ImportErrorRow(row=row_number, field="hint", value=hint, message="max 200 chars"))
                continue
            gender = "neutral" if file_format == "txt" or len(row) < 5 else normalize_gender(row[4])
            if gender is None:
                errors.append(ImportErrorRow(row=row_number, field="gender", value=row[4], message="unknown gender"))
                continue
            normalized = normalize_word(word)
            if normalized in seen:
                duplicates += 1
                continue
            seen.add(normalized)
            words.append(
                DictionaryWord(
                    id=uuid4().hex,
                    word=word,
                    normalizedWord=normalized,
                    difficulty=int(difficulty_raw),  # type: ignore[arg-type]
                    hint=hint,
                    gender=gender,  # type: ignore[arg-type]
                )
            )
        return words, total, duplicates, errors

    def _validate_dictionary_id(self, dictionary_id: str) -> None:
        if not SAFE_DICTIONARY_ID.fullmatch(dictionary_id):
            raise ValueError("invalid dictionary id")

    def _validate_import_token(self, import_token: str) -> None:
        if not SAFE_IMPORT_TOKEN.fullmatch(import_token):
            raise ValueError("invalid import token")
