"""Analytics routes."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app_refactored.services.analytics_service import analytics_service

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    stats = analytics_service.get_stats()
    popular_cities = analytics_service.popular_cities()
    return jsonify({"stats": stats, "popular_cities": popular_cities})


@analytics_bp.route("/popular_cities", methods=["GET"])
def get_popular_cities():
    limit = request.args.get("limit", 10, type=int)
    limit = min(limit, 50)
    return jsonify(analytics_service.popular_cities(limit))
