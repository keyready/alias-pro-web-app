from __future__ import annotations

import asyncio

import pytest

from app.services.dictionary_service import DictionaryService
from app.storage.json_storage import JsonStorage


def test_csv_normalizes_gender_and_dedupes(tmp_path):
    service = DictionaryService(JsonStorage(tmp_path))
    words, total, duplicates, errors = service._parse_csv(
        "word,difficulty,reserved,hint,gender\nДрель,1,,инструмент,муж\nдрель,2,,дубль,male\nТушь,2,,ресницы,ж\n"
    )
    assert total == 3
    assert duplicates == 1
    assert not errors
    assert [(word.word, word.gender, word.difficulty) for word in words] == [
        ("Дрель", "male", 1),
        ("Тушь", "female", 2),
    ]


def test_invalid_csv_rows_are_reported(tmp_path):
    service = DictionaryService(JsonStorage(tmp_path))
    words, _total, _duplicates, errors = service._parse_csv("помада,8,,подсказка,boy\n")
    assert words == []
    assert errors[0].field == "difficulty"


def test_dictionary_id_rejects_path_traversal(tmp_path):
    service = DictionaryService(JsonStorage(tmp_path))

    for dictionary_id in ["../users/secret", "..\\users\\secret", "classic.json", "nested/id"]:
        with pytest.raises(ValueError, match="invalid dictionary id"):
            service.get_dictionary(dictionary_id)


def test_dictionary_read_is_constrained_to_index(tmp_path):
    storage = JsonStorage(tmp_path)
    service = DictionaryService(storage)
    storage.write_json(storage.path("dictionaries", "orphan.json"), {"id": "orphan", "words": []})

    assert service.get_dictionary("orphan") is None


def test_commit_import_rejects_malformed_token_before_storage_read(tmp_path):
    service = DictionaryService(JsonStorage(tmp_path))

    for import_token in ["../imports/secret", "..\\imports\\secret", "token.json", "nested/token", "short"]:
        with pytest.raises(ValueError, match="invalid import token"):
            service.commit_import(import_token, "Title", "", "user-1")


def test_invalid_utf8_upload_is_rejected(tmp_path):
    class BadUpload:
        filename = "words.txt"

        async def read(self, _limit: int) -> bytes:
            return b"\xff\xfe\xff"

    service = DictionaryService(JsonStorage(tmp_path))

    with pytest.raises(ValueError, match="valid UTF-8"):
        asyncio.run(service.preview_import(BadUpload()))  # type: ignore[arg-type]
