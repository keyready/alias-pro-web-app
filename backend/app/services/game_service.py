from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.models.game import GameCreate, RoundSync, StoredGame
from app.storage.json_storage import JsonStorage


class GameService:
    def __init__(self, storage: JsonStorage) -> None:
        self.storage = storage

    def create_game(self, payload: GameCreate, telegram_user_id: str) -> StoredGame:
        if payload.clientRequestId:
            existing = self._find_by_client_request(payload.clientRequestId, telegram_user_id)
            if existing:
                return existing
        now = datetime.now(UTC)
        game = StoredGame(
            id=uuid4().hex,
            createdByTelegramUserId=telegram_user_id,
            createdAt=now,
            updatedAt=now,
            config=payload,
        )
        self.storage.write_json(self.storage.path("games", f"{game.id}.json"), game.model_dump())
        return game

    def sync_round(self, game_id: str, payload: RoundSync, telegram_user_id: str) -> StoredGame:
        path = self.storage.path("games", f"{game_id}.json")
        data = self.storage.read_json(path)
        if not data:
            raise ValueError("game not found")
        game = StoredGame(**data)
        if game.createdByTelegramUserId != telegram_user_id:
            raise PermissionError("cannot sync another user's game")
        if payload.clientRoundId not in game.roundIds:
            game.rounds.append(payload)
            game.roundIds.append(payload.clientRoundId)
            game.updatedAt = datetime.now(UTC)
            self.storage.write_json(path, game.model_dump())
        return game

    def _find_by_client_request(self, client_request_id: str, telegram_user_id: str) -> StoredGame | None:
        for path in self.storage.path("games").glob("*.json"):
            data = self.storage.read_json(path)
            if data and data.get("createdByTelegramUserId") == telegram_user_id:
                config = data.get("config", {})
                if config.get("clientRequestId") == client_request_id:
                    return StoredGame(**data)
        return None
