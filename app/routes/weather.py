"""Weather-related HTTP routes."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from app import get_container
from app.models.schemas import WeatherRequest
from app.utils.requests import get_user_ip
from app.utils.validators import validate_city_name, validate_coordinates

weather_bp = Blueprint("weather", __name__)


def _service():
    """Return the weather service from the application container."""

    return get_container(current_app).weather_service


@weather_bp.route("/weather", methods=["GET"])
def get_weather():
    """Return current weather for a requested city."""

    start_time = datetime.now(timezone.utc)
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "NO").strip()
    unit = request.args.get("unit", "metric")

    if not city:
        return jsonify({"error": "By-parameter er påkrevd"}), 400
    valid_city, city_error = validate_city_name(city)
    if not valid_city:
        return jsonify({"error": city_error}), 400

    service = _service()
    result = service.current_by_city(
        WeatherRequest(city=city, country=country, unit=unit, timestamp=start_time),
        get_user_ip(),
    )
    if result.error:
        return jsonify({"error": result.error}), 400
    return jsonify({"data": result.payload, "from_cache": result.from_cache})


@weather_bp.route("/weather_by_coords", methods=["GET"])
def get_weather_by_coords():
    """Return current weather for provided coordinates."""

    start_time = datetime.now(timezone.utc)
    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()
    unit = request.args.get("unit", "metric")

    if not lat or not lon:
        return jsonify({"error": "Breddegrad og lengdegrad parametere er påkrevd"}), 400
    valid_coords, coords_error = validate_coordinates(lat, lon)
    if not valid_coords:
        return jsonify({"error": coords_error}), 400

    service = _service()
    result = service.current_by_coordinates(
        WeatherRequest(latitude=lat, longitude=lon, unit=unit, timestamp=start_time),
        get_user_ip(),
    )
    if result.error:
        return jsonify({"error": result.error}), 400
    return jsonify({"data": result.payload, "from_cache": result.from_cache})


@weather_bp.route("/forecast", methods=["GET"])
def get_forecast():
    """Return forecast for a requested city."""

    start_time = datetime.now(timezone.utc)
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "NO").strip()
    unit = request.args.get("unit", "metric")

    if not city:
        return jsonify({"error": "By-parameter er påkrevd"}), 400
    valid_city, city_error = validate_city_name(city)
    if not valid_city:
        return jsonify({"error": city_error}), 400

    service = _service()
    result = service.forecast(
        WeatherRequest(city=city, country=country, unit=unit, timestamp=start_time),
        get_user_ip(),
    )
    if result.error:
        return jsonify({"error": result.error}), 400
    return jsonify({"data": result.payload, "from_cache": result.from_cache})
