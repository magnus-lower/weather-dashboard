"""Health and maintenance routes."""
from __future__ import annotations

from datetime import datetime, timezone
from flask import Blueprint, jsonify

from app_refactored.repositories.cache_repository import cache_store

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    expired = cache_store.clear_expired()
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.2.0",
            "mode": "in-memory",
            "cache_cleaned": expired,
        }
    )


@health_bp.route("/clear_cache", methods=["POST"])
def clear_cache():
    cleared = cache_store.clear()
    return jsonify({"message": "Alle cacher tømt", "cleared_entries": cleared})
