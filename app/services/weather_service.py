"""Weather-related business logic."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from app.models.schemas import ServiceResult, WeatherQueryLog, WeatherRequest
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.cache_repository import InMemoryCache
from app.repositories.weather_api_repository import WeatherAPIRepository
from app.utils.caching import make_cache_key
from app.utils.time import calculate_response_time


class WeatherService:
    """Encapsulates weather retrieval, caching, and analytics."""

    def __init__(
        self,
        api_repo: WeatherAPIRepository,
        cache_repo: InMemoryCache,
        analytics_repo: AnalyticsRepository,
    ) -> None:
        self.api_repo = api_repo
        self.cache_repo = cache_repo
        self.analytics_repo = analytics_repo

    def current_by_city(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        """Return current weather by city, with caching and analytics logging."""

        cache_key = make_cache_key(city=request.city, country=request.country)
        cached = self.cache_repo.get(cache_key)
        if cached is not None:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = f"weather?q={request.city},{request.country}&units={request.unit}"
        result = self.api_repo.fetch_weather(endpoint)
        self._log_query(request, user_ip, "weather")

        if isinstance(result, dict) and "error" not in result:
            self.cache_repo.set(cache_key, result)
        return ServiceResult(
            payload=result,
            error=result.get("error") if isinstance(result, dict) else None,
        )

    def current_by_coordinates(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        """Return current weather by geographic coordinates."""

        cache_key = make_cache_key(lat=request.latitude, lon=request.longitude)
        cached = self.cache_repo.get(cache_key)
        if cached is not None:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = (
            f"weather?lat={request.latitude}&lon={request.longitude}&units={request.unit}"
        )
        result = self.api_repo.fetch_weather(endpoint)
        if isinstance(result, dict) and "error" not in result:
            city_name = result.get("name", "Unknown")
            country_code = result.get("sys", {}).get("country", "Unknown")
        else:
            city_name = "Unknown"
            country_code = "Unknown"

        self._log_query(
            WeatherRequest(city=city_name, country=country_code, unit=request.unit),
            user_ip,
            "coords",
        )
        if isinstance(result, dict) and "error" not in result:
            self.cache_repo.set(cache_key, result)
        return ServiceResult(
            payload=result,
            error=result.get("error") if isinstance(result, dict) else None,
        )

    def forecast(self, request: WeatherRequest, user_ip: str) -> ServiceResult:
        """Return forecast data, cached at hourly granularity."""

        cache_key = make_cache_key(city=request.city, country=request.country, granularity="hour")
        cached = self.cache_repo.get(cache_key)
        if cached is not None:
            return ServiceResult(payload=cached, from_cache=True)

        endpoint = f"forecast?q={request.city},{request.country}&units={request.unit}"
        result = self.api_repo.fetch_weather(endpoint)
        self._log_query(request, user_ip, "forecast")
        if isinstance(result, dict) and "error" not in result:
            self.cache_repo.set(cache_key, result, timeout=1800)
        return ServiceResult(
            payload=result,
            error=result.get("error") if isinstance(result, dict) else None,
        )

    def city_suggestions(self, query: str, limit: int = 8) -> List[Dict]:
        """Return deduplicated city suggestions limited to the requested size."""

        suggestions = self.api_repo.city_suggestions(query)
        seen = set()
        filtered: List[Dict] = []
        suggestions.sort(
            key=lambda item: (
                not (item.get("name", "").lower().startswith(query.lower())),
                item.get("country", "") != "NO",
                -(item.get("population", 0) or 0),
                len(item.get("name", "")),
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
        """Return a city payload for the provided coordinates."""

        return self.api_repo.reverse_geocode(lat, lon)

    def _log_query(self, request: WeatherRequest, user_ip: str, endpoint: str) -> None:
        """Persist request analytics."""

        response_time = calculate_response_time(request.timestamp)
        entry = WeatherQueryLog(
            city=request.city or "Unknown",
            country=request.country,
            user_ip=user_ip,
            response_time_ms=response_time,
            endpoint=endpoint,
            timestamp=datetime.now(timezone.utc),
        )
        self.analytics_repo.log_query(entry)


__all__ = ["WeatherService"]
