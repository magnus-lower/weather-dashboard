"""Geolocation routes."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from app_refactored.repositories.weather_api_repository import WeatherAPIRepository
from app_refactored.services.weather_service import WeatherService

geo_bp = Blueprint("geo", __name__)


def _service() -> WeatherService:
    config = current_app.config
    api_repo = WeatherAPIRepository(
        api_key=config.get("WEATHER_API_KEY"),
        base_url=config.get("WEATHER_API_BASE_URL"),
        timeout=config.get("WEATHER_API_TIMEOUT", 10),
    )
    return WeatherService(api_repo)


@geo_bp.route("/city_suggestions", methods=["GET"])
def city_suggestions():
    query = request.args.get("q", "").strip()
    if not query or len(query) < 2:
        return jsonify([])
    service = _service()
    return jsonify(service.city_suggestions(query))


@geo_bp.route("/reverse_geocode", methods=["GET"])
def reverse_geocode():
    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()
    if not lat or not lon:
        return jsonify({"error": "Breddegrad og lengdegrad er påkrevd"}), 400
    service = _service()
    return jsonify(service.reverse_geocode(lat, lon))
