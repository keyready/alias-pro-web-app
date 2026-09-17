from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user_id, games
from app.models.game import GameCreate, RoundSync
from app.services.game_service import GameService

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("")
def create_game(
    payload: GameCreate,
    user_id: Annotated[str, Depends(current_user_id)],
    service: Annotated[GameService, Depends(games)],
) -> dict:
    return service.create_game(payload, user_id).model_dump()


@router.post("/{game_id}/rounds")
def sync_round(
    game_id: str,
    payload: RoundSync,
    user_id: Annotated[str, Depends(current_user_id)],
    service: Annotated[GameService, Depends(games)],
) -> dict:
    try:
        return service.sync_round(game_id, payload, user_id).model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
