"""Health and maintenance routes."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify

from app_refactored import get_container

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Return a basic health status with cache hygiene information."""

    cache_repo = get_container(current_app).cache_repository
    expired = cache_repo.clear_expired()
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
    """Explicitly clear the in-memory cache."""

    cache_repo = get_container(current_app).cache_repository
    cleared = cache_repo.clear()
    return jsonify({"message": "Alle cacher tømt", "cleared_entries": cleared})
