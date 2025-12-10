"""Favorites routes."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app_refactored.services.favorites_service import favorites_service
from app_refactored.utils.requests import get_user_ip
from app_refactored.utils.validators import validate_city_name

favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.route("/favorites", methods=["GET", "POST", "DELETE"])
def manage_favorites():
    user_ip = get_user_ip()
    if request.method == "GET":
        return jsonify(favorites_service.list_for_user(user_ip))

    data = request.get_json() or {}
    city = (data.get("city") or "").strip()
    country = (data.get("country") or "NO").strip()

    if not city:
        return jsonify({"error": "By er påkrevd"}), 400
    valid_city, city_error = validate_city_name(city)
    if not valid_city:
        return jsonify({"error": city_error}), 400

    if request.method == "POST":
        added = favorites_service.add(user_ip, city, country)
        if added:
            return jsonify({"message": "Favoritt lagt til"})
        return jsonify({"error": "Favoritt eksisterer allerede"}), 409

    if request.method == "DELETE":
        removed = favorites_service.remove(user_ip, city, country)
        if removed:
            return jsonify({"message": "Favoritt fjernet"})
        return jsonify({"error": "Favoritt ikke funnet"}), 404

    return jsonify({"error": "Ugyldig forespørsel"}), 400
