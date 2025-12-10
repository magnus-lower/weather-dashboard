"""Service for managing user favorites."""
from __future__ import annotations

from app_refactored.repositories.favorites_repository import favorites_repo


class FavoritesService:
    """Encapsulate favorite city operations."""

    def list_for_user(self, user_ip: str) -> list[dict]:
        return [
            {"city": fav.city, "country": fav.country, "added_at": fav.added_at.isoformat()}
            for fav in favorites_repo.list_for_user(user_ip)
        ]

    def add(self, user_ip: str, city: str, country: str) -> bool:
        return favorites_repo.add(user_ip, city, country)

    def remove(self, user_ip: str, city: str, country: str) -> bool:
        return favorites_repo.remove(user_ip, city, country)


favorites_service = FavoritesService()

__all__ = ["favorites_service", "FavoritesService"]
