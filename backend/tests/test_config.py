from __future__ import annotations

from pathlib import Path

from app.config import DEFAULT_LOCAL_STORAGE_DIR, get_storage_root


def test_storage_root_defaults_to_backend_data_locally(monkeypatch):
    monkeypatch.delenv("ALIAS_STORAGE_DIR", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)

    assert get_storage_root() == DEFAULT_LOCAL_STORAGE_DIR


def test_storage_root_uses_configured_directory(monkeypatch, tmp_path):
    configured = tmp_path / "alias-data"
    monkeypatch.setenv("ALIAS_STORAGE_DIR", str(configured))
    monkeypatch.setenv("VERCEL", "1")

    assert get_storage_root() == configured.resolve()


def test_storage_root_defaults_to_tmp_on_vercel(monkeypatch):
    monkeypatch.delenv("ALIAS_STORAGE_DIR", raising=False)
    monkeypatch.setenv("VERCEL", "1")

    assert get_storage_root() == Path("/tmp/alias-web-data")
