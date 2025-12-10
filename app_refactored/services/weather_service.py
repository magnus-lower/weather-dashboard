"""Weather-related business logic."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from app_refactored.models.schemas import ServiceResult, WeatherQueryLog, WeatherRequest
from app_refactored.repositories.analytics_repository import analytics_repo
from app_refactored.repositories.cache_repository import cache_store
from app_refactored.repositories.weather_api_repository import WeatherAPIRepository
from app_refactored.utils.caching import make_cache_key
from app_refactored.utils.time import calculate_response_time


class WeatherService:
    """Encapsulates weather retrieval, caching, and analytics."""

    def __init__(self, api_repo: WeatherAPIRepository) -> None:
        self.api_repo = api_repo

    def current_by_city(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        cache_key = make_cache_key(city=request.city, country=request.country)
        cached = cache_store.get(cache_key)
        if cached:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = f"weather?q={request.city},{request.country}&units={request.unit}"
        result = self.api_repo.fetch_weather(endpoint)
        self._log_query(request, user_ip, "weather")

        if "error" not in result:
            cache_store.set(cache_key, result)
        return ServiceResult(payload=result, error=result.get("error"))

    def current_by_coordinates(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        cache_key = make_cache_key(lat=request.latitude, lon=request.longitude)
        cached = cache_store.get(cache_key)
        if cached:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = (
            f"weather?lat={request.latitude}&lon={request.longitude}&units={request.unit}"
        )
        result = self.api_repo.fetch_weather(endpoint)
        city_name = result.get("name", "Unknown") if "error" not in result else "Unknown"
        country_code = (
            result.get("sys", {}).get("country", "Unknown") if "error" not in result else "Unknown"
        )
        self._log_query(
            WeatherRequest(city=city_name, country=country_code, unit=request.unit),
            user_ip,
            "coords",
        )
        if "error" not in result:
            cache_store.set(cache_key, result)
        return ServiceResult(payload=result, error=result.get("error"))

    def forecast(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        cache_key = make_cache_key(city=request.city, country=request.country, granularity="hour")
        cached = cache_store.get(cache_key)
        if cached:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = f"forecast?q={request.city},{request.country}&units={request.unit}"
        result = self.api_repo.fetch_weather(endpoint)
        self._log_query(request, user_ip, "forecast")
        if "error" not in result:
            cache_store.set(cache_key, result, timeout=1800)
        return ServiceResult(payload=result, error=result.get("error"))

    def city_suggestions(self, query: str, limit: int = 8) -> List[Dict]:
        suggestions = self.api_repo.city_suggestions(query)
        # Sorting and filtering for relevance
        seen = set()
        filtered: List[Dict] = []
        suggestions.sort(
            key=lambda x: (
                not x.get("name", "").lower().startswith(query.lower()),
                x.get("country", "") != "NO",
                -(x.get("population", 0) or 0),
                len(x.get("name", "")),
            )
        )
        for item in suggestions:
            city_name = item.get("name")
            country = item.get("country")
            state = item.get("state", "")
            if not city_name or not country:
                continue
            key = f"{city_name.lower()}_{country.lower()}_{state.lower()}"
            if key in seen:
                continue
            seen.add(key)
            filtered.append(
                {
                    "name": city_name,
                    "country": country,
                    "state": state,
                    "lat": item.get("lat"),
                    "lon": item.get("lon"),
                    "display_name": f"{city_name}, {state + ', ' if state else ''}{country}",
                }
            )
            if len(filtered) >= limit:
                break
        return filtered

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        return self.api_repo.reverse_geocode(lat, lon)

    def _log_query(self, request: WeatherRequest, user_ip: str, endpoint: str) -> None:
        response_time = calculate_response_time(request.timestamp)
        entry = WeatherQueryLog(
            city=request.city or "Unknown",
            country=request.country,
            user_ip=user_ip,
            response_time_ms=response_time,
            endpoint=endpoint,
            timestamp=datetime.now(timezone.utc),
        )
        analytics_repo.log_query(entry)


__all__ = ["WeatherService"]
