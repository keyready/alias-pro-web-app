from __future__ import annotations

import json
import os
import threading
from collections import defaultdict
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any


class JsonStorage:
    def __init__(self, root: Path) -> None:
        self.root = root
        self._locks: dict[Path, threading.RLock] = defaultdict(threading.RLock)
        for child in ["dictionaries", "games", "users", "imports"]:
            (self.root / child).mkdir(parents=True, exist_ok=True)

    def path(self, *parts: str) -> Path:
        candidate = (self.root / Path(*parts)).resolve()
        root = self.root.resolve()
        if root != candidate and root not in candidate.parents:
            raise ValueError("storage path escapes data root")
        return candidate

    def read_json(self, path: Path, default: Any = None) -> Any:
        if not path.exists():
            return default
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def write_json(self, path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        lock = self._locks[path]
        with lock:
            with NamedTemporaryFile(
                "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False
            ) as tmp:
                json.dump(data, tmp, ensure_ascii=False, indent=2, default=str)
                tmp.write("\n")
                tmp.flush()
                os.fsync(tmp.fileno())
                tmp_name = tmp.name
            os.replace(tmp_name, path)

    def update_json_list(self, path: Path, item: dict[str, Any], key: str = "id") -> None:
        lock = self._locks[path]
        with lock:
            items = self.read_json(path, []) or []
            items = [existing for existing in items if existing.get(key) != item[key]]
            items.append(item)
            items.sort(key=lambda value: value.get("updatedAt", ""), reverse=True)
            self.write_json(path, items)
