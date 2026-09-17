from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config  # noqa: F401  # Load .env before application modules read settings.
from app.api.auth import router as auth_router
from app.api.deps import dictionary_service
from app.api.dictionaries import router as dictionaries_router
from app.api.games import router as games_router

app = FastAPI(title="Telegram Alias API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dictionaries_router)
app.include_router(games_router)


@app.on_event("startup")
def startup() -> None:
    dictionary_service.ensure_seed_dictionary()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
