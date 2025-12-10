"""Request-related helpers."""
from __future__ import annotations

from flask import Request, request


def get_user_ip() -> str:
    forwarded_for = request.environ.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.environ.get("HTTP_X_REAL_IP")
    if real_ip:
        return real_ip
    return request.remote_addr or "unknown"


def get_client_info() -> dict:
    return {
        "ip": get_user_ip(),
        "user_agent": request.headers.get("User-Agent", "Unknown"),
        "referrer": request.headers.get("Referer", "Direct"),
    }
