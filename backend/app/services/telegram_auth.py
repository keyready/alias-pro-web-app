from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from datetime import UTC, datetime
from urllib.parse import parse_qsl


def validate_init_data(init_data: str) -> dict[str, str]:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if os.getenv("DEV_AUTH", "").lower() == "true" and not init_data:
        return {"user": json.dumps({"id": 1, "first_name": "Dev", "username": "dev"})}
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is required unless DEV_AUTH=true")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise ValueError("missing hash")
    auth_date = int(pairs.get("auth_date", "0") or "0")
    if auth_date and time.time() - auth_date > 60 * 60 * 24:
        raise ValueError("initData expired")
    data_check = "\n".join(f"{key}={value}" for key, value in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise ValueError("invalid initData signature")
    return pairs


def extract_user(init_fields: dict[str, str]) -> dict[str, str]:
    raw_user = init_fields.get("user")
    if not raw_user:
        raise ValueError("initData user is missing")
    user = json.loads(raw_user)
    telegram_id = str(user["id"])
    now = datetime.now(UTC).isoformat()
    return {
        "schemaVersion": 1,
        "telegramUserId": telegram_id,
        "firstName": str(user.get("first_name") or "Telegram"),
        "username": user.get("username"),
        "createdAt": now,
        "updatedAt": now,
    }
