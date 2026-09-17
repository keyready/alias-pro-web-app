from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.deps import current_user_id, dictionaries
from app.services.dictionary_service import DictionaryService

router = APIRouter(prefix="/api/dictionaries", tags=["dictionaries"])


class CommitImportRequest(BaseModel):
    importToken: str
    title: str
    description: str = ""


@router.get("")
def list_dictionaries(
    service: Annotated[DictionaryService, Depends(dictionaries)],
    search: str | None = None,
) -> list[dict]:
    return service.list_dictionaries(search)


@router.get("/{dictionary_id}")
def get_dictionary(
    dictionary_id: str,
    service: Annotated[DictionaryService, Depends(dictionaries)],
) -> dict:
    try:
        dictionary = service.get_dictionary(dictionary_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not dictionary:
        raise HTTPException(status_code=404, detail="dictionary not found")
    return dictionary


@router.post("/import/preview")
async def preview_import(
    file: Annotated[UploadFile, File(...)],
    _user_id: Annotated[str, Depends(current_user_id)],
    service: Annotated[DictionaryService, Depends(dictionaries)],
) -> dict:
    try:
        return (await service.preview_import(file)).model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/import/commit")
def commit_import(
    payload: CommitImportRequest,
    user_id: Annotated[str, Depends(current_user_id)],
    service: Annotated[DictionaryService, Depends(dictionaries)],
) -> dict:
    try:
        return service.commit_import(
            payload.importToken, payload.title, payload.description, user_id
        ).model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/import")
async def import_compat(
    title: Annotated[str, Form(...)],
    file: Annotated[UploadFile, File(...)],
    user_id: Annotated[str, Depends(current_user_id)],
    service: Annotated[DictionaryService, Depends(dictionaries)],
    description: Annotated[str, Form()] = "",
) -> dict:
    try:
        preview = await service.preview_import(file)
        return service.commit_import(preview.importToken, title, description, user_id).model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
