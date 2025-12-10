"""Repository responsible for communicating with the external weather API."""
from __future__ import annotations

import logging
from typing import Dict, List

from app.utils.requests import http_get_json

logger = logging.getLogger(__name__)


class WeatherAPIRepository:
    """HTTP client wrapper for the OpenWeatherMap API."""

    def __init__(self, api_key: str, base_url: str, timeout: int = 10) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/") + "/"
        self.timeout = timeout

    def fetch_weather(self, endpoint: str) -> Dict:
        """Fetch weather data for the provided endpoint."""

        url = f"{self.base_url}{endpoint}&appid={self.api_key}"
        return self._safe_get(url)

    def city_suggestions(self, query: str) -> List[Dict]:
        """Return city suggestions for an autocomplete query."""

        url = (
            f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=25&appid={self.api_key}"
        )
        response = self._safe_get(url)
        return response if isinstance(response, list) else []

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        """Resolve latitude/longitude to a city record."""

        url = (
            f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={self.api_key}"
        )
        result = self._safe_get(url)
        if isinstance(result, list) and result:
            location = result[0]
            return {
                "city": location.get("name", "Ukjent"),
                "country": location.get("country", "Ukjent"),
                "state": location.get("state", ""),
            }
        if isinstance(result, dict) and result.get("error"):
            return result
        return {"error": "Kunne ikke finne stedsnavn for koordinatene"}

    def _safe_get(self, url: str) -> Dict | List:
        """Perform a safe HTTP GET and normalize common errors."""

        result = http_get_json(url=url, timeout=self.timeout)
        if isinstance(result, dict) and "cod" in result:
            try:
                code_value = int(result.get("cod", 0))
            except (ValueError, TypeError):
                code_value = result.get("cod")
            if code_value != 200:
                return {"error": result.get("message", "Ukjent feil fra vær-API")}
        return result


__all__ = ["WeatherAPIRepository"]
