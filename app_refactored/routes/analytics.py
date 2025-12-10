"""Analytics routes."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from app_refactored import get_container

analytics_bp = Blueprint("analytics", __name__)


def _service():
    """Return the analytics service from the application container."""

    return get_container(current_app).analytics_service


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    """Return aggregated analytics for the dashboard."""

    service = _service()
    stats = service.get_stats()
    popular_cities = service.popular_cities()
    return jsonify({"stats": stats, "popular_cities": popular_cities})


@analytics_bp.route("/popular_cities", methods=["GET"])
def get_popular_cities():
    """Return most popular queried cities within the configured limit."""

    limit = request.args.get("limit", 10, type=int)
    limit = min(limit, 50)
    return jsonify(_service().popular_cities(limit))
