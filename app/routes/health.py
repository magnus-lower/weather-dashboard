"""Health and maintenance routes."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify

from app.repositories.cache_repository import InMemoryCache


def create_health_blueprint(cache_repo: InMemoryCache) -> Blueprint:
    """Create the health blueprint wired with the cache repository."""

    health_bp = Blueprint("health", __name__)

    @health_bp.route("/health", methods=["GET"])
    def health_check():
        """Return a basic health status with cache hygiene information."""

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

        cleared = cache_repo.clear()
        return jsonify({"message": "Alle cacher tømt", "cleared_entries": cleared})

    return health_bp
