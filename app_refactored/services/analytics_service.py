"""Service layer for analytics operations."""
from __future__ import annotations

from app_refactored.repositories.analytics_repository import analytics_repo


class AnalyticsService:
    """Provide aggregated analytics data."""

    def get_stats(self) -> dict:
        return analytics_repo.query_stats()

    def popular_cities(self, limit: int = 10) -> list[dict]:
        return analytics_repo.popular_cities(limit)


analytics_service = AnalyticsService()

__all__ = ["analytics_service", "AnalyticsService"]
