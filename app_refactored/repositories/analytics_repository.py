"""In-memory analytics repository."""
from __future__ import annotations

from collections import defaultdict, deque
from typing import DefaultDict, Deque, Dict, List

from app_refactored.models.schemas import WeatherQueryLog


class AnalyticsRepository:
    """Track query analytics in memory for lightweight deployments."""

    def __init__(self, max_entries: int = 1000) -> None:
        self._queries: Deque[WeatherQueryLog] = deque(maxlen=max_entries)
        self._city_counts: DefaultDict[str, int] = defaultdict(int)
        self._endpoint_counts: DefaultDict[str, int] = defaultdict(int)
        self._total_response_time: float = 0.0

    def log_query(self, entry: WeatherQueryLog) -> None:
        """Persist a query log entry for later aggregation."""

        if len(self._queries) == self._queries.maxlen:
            oldest = self._queries[0]
            self._total_response_time -= oldest.response_time_ms
        self._queries.append(entry)
        self._total_response_time += entry.response_time_ms

        city_key = f"{entry.city}, {entry.country}" if entry.country else entry.city
        self._city_counts[city_key] += 1
        self._endpoint_counts[entry.endpoint] += 1

    def query_stats(self) -> Dict[str, float | int | Dict[str, int]]:
        """Return aggregated statistics for queries."""

        total_queries = len(self._queries)
        avg_response_time = (
            self._total_response_time / total_queries if total_queries else 0.0
        )
        return {
            "total_queries": total_queries,
            "avg_response_time": avg_response_time,
            "endpoints": dict(self._endpoint_counts),
        }

    def popular_cities(self, limit: int = 10) -> List[Dict[str, str | int]]:
        """Return the most popular queried cities."""

        sorted_cities = sorted(
            self._city_counts.items(), key=lambda item: item[1], reverse=True
        )
        return [
            {"city": city, "count": count} for city, count in sorted_cities[:limit]
        ]


__all__ = ["AnalyticsRepository"]
