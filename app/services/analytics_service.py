"""Service layer for analytics operations."""
from __future__ import annotations

from app.repositories.analytics_repository import AnalyticsRepository


class AnalyticsService:
    """Provide aggregated analytics data."""

    def __init__(self, repository: AnalyticsRepository) -> None:
        self.repository = repository

    def get_stats(self) -> dict:
        """Return aggregate analytics statistics."""

        return self.repository.query_stats()

    def popular_cities(self, limit: int = 10) -> list[dict]:
        """Return the most popular queried cities."""

        return self.repository.popular_cities(limit)


__all__ = ["AnalyticsService"]
