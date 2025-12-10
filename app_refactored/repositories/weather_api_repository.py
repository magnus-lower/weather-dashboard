"""Repository responsible for communicating with the external weather API."""
from __future__ import annotations

import json
import logging
from typing import Dict, List

import requests

logger = logging.getLogger(__name__)


class WeatherAPIRepository:
    """HTTP client wrapper for the OpenWeatherMap API."""

    def __init__(self, api_key: str, base_url: str, timeout: int = 10) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = timeout

    def fetch_weather(self, endpoint: str) -> Dict:
        url = f"{self.base_url}{endpoint}&appid={self.api_key}"
        return self._safe_get(url)

    def city_suggestions(self, query: str) -> List[Dict]:
        url = (
            f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=25&appid={self.api_key}"
        )
        response = self._safe_get(url)
        return response if isinstance(response, list) else []

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
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

    def _safe_get(self, url: str) -> Dict:
        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and "cod" in data:
                try:
                    code_value = int(data.get("cod", 0))
                except (ValueError, TypeError):
                    code_value = data.get("cod")
                if code_value != 200:
                    return {"error": data.get("message", "Ukjent feil fra vær-API")}
            return data
        except requests.exceptions.Timeout:
            logger.error("Timeout when fetching weather data")
            return {"error": "Forespørselen tok for lang tid. Prøv igjen senere."}
        except requests.exceptions.ConnectionError:
            logger.error("Connection error when fetching weather data")
            return {
                "error": "Kunne ikke koble til vær-tjenesten. Sjekk internettforbindelsen."
            }
        except requests.exceptions.HTTPError as exc:  # pragma: no cover - passthrough
            logger.error("HTTP error when fetching weather data: %s", exc)
            status = exc.response.status_code if exc.response else None
            if status == 401:
                return {"error": "Ugyldig API-nøkkel"}
            if status == 404:
                return {"error": "Byen ble ikke funnet"}
            if status == 429:
                return {"error": "For mange forespørsler. Prøv igjen senere."}
            return {"error": f"HTTP-feil: {status}"}
        except json.JSONDecodeError:
            logger.error("Invalid JSON response from weather API")
            return {"error": "Ugyldig respons fra vær-tjenesten"}
        except requests.exceptions.RequestException as exc:
            logger.error("Request error when fetching weather data: %s", exc)
            return {"error": "Feil ved henting av værdata. Prøv igjen senere."}
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Unexpected error when fetching weather data: %s", exc)
            return {"error": "En uventet feil oppstod. Prøv igjen senere."}


__all__ = ["WeatherAPIRepository"]
