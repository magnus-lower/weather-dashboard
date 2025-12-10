"""Weather-related HTTP routes."""
from __future__ import annotations

from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify, render_template, request

from app_refactored.models.schemas import WeatherRequest
from app_refactored.repositories.weather_api_repository import WeatherAPIRepository
from app_refactored.services.weather_service import WeatherService
from app_refactored.utils.requests import get_user_ip
from app_refactored.utils.validators import validate_city_name, validate_coordinates

weather_bp = Blueprint("weather", __name__)


def _service() -> WeatherService:
    config = current_app.config
    api_repo = WeatherAPIRepository(
        api_key=config.get("WEATHER_API_KEY"),
        base_url=config.get("WEATHER_API_BASE_URL"),
        timeout=config.get("WEATHER_API_TIMEOUT", 10),
    )
    return WeatherService(api_repo)


@weather_bp.route("/")
def home():
    return render_template("index.html")


@weather_bp.route("/weather", methods=["GET"])
def get_weather():
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
    status = 200 if not result.error else 400
    return jsonify(result.payload), status


@weather_bp.route("/weather_by_coords", methods=["GET"])
def get_weather_by_coords():
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
    status = 200 if not result.error else 400
    return jsonify(result.payload), status


@weather_bp.route("/forecast", methods=["GET"])
def get_forecast():
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
    status = 200 if not result.error else 400
    return jsonify(result.payload), status
