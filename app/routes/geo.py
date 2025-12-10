"""Geolocation routes."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from app_refactored import get_container
from app_refactored.utils.validators import validate_coordinates

geo_bp = Blueprint("geo", __name__)


def _service():
    """Return the weather service from the container."""

    return get_container(current_app).weather_service


@geo_bp.route("/city_suggestions", methods=["GET"])
def city_suggestions():
    """Provide city autocomplete suggestions."""

    query = request.args.get("q", "").strip()
    if not query or len(query) < 2:
        return jsonify([])
    service = _service()
    return jsonify(service.city_suggestions(query))


@geo_bp.route("/reverse_geocode", methods=["GET"])
def reverse_geocode():
    """Reverse geocode coordinates to a readable city response."""

    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()
    if not lat or not lon:
        return jsonify({"error": "Breddegrad og lengdegrad er påkrevd"}), 400
    valid, error = validate_coordinates(lat, lon)
    if not valid:
        return jsonify({"error": error}), 400
    service = _service()
    return jsonify(service.reverse_geocode(lat, lon))
