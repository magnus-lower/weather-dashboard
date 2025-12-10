"""Analytics routes."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.services.analytics_service import AnalyticsService


def create_analytics_blueprint(service: AnalyticsService) -> Blueprint:
    """Create the analytics blueprint wired with its service."""

    analytics_bp = Blueprint("analytics", __name__)

    @analytics_bp.route("/analytics", methods=["GET"])
    def get_analytics():
        """Return aggregated analytics for the dashboard."""

        stats = service.get_stats()
        popular_cities = service.popular_cities()
        return jsonify({"stats": stats, "popular_cities": popular_cities})

    @analytics_bp.route("/popular_cities", methods=["GET"])
    def get_popular_cities():
        """Return most popular queried cities within the configured limit."""

        limit = request.args.get("limit", 10, type=int)
        limit = min(limit, 50)
        return jsonify(service.popular_cities(limit))

    return analytics_bp
