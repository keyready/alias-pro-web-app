from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def token_secret() -> str:
    return os.getenv("APP_TOKEN_SECRET") or os.getenv("TELEGRAM_BOT_TOKEN") or "dev-secret-change-me"


def create_token(subject: str, ttl_seconds: int = 60 * 60 * 24 * 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": subject, "exp": int(time.time()) + ttl_seconds}
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(payload).encode())}"
    signature = hmac.new(token_secret().encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64(signature)}"


def verify_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise ValueError("malformed token") from exc
    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(token_secret().encode(), signing_input.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _unb64(signature_b64)):
        raise ValueError("invalid token signature")
    payload = json.loads(_unb64(payload_b64))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("expired token")
    return payload
