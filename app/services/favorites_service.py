"""Service for managing user favorites."""
from __future__ import annotations

from app.repositories.favorites_repository import FavoritesRepository


class FavoritesService:
    """Encapsulate favorite city operations."""

    def __init__(self, repository: FavoritesRepository) -> None:
        self.repository = repository

    def list_for_user(self, user_ip: str) -> list[dict]:
        """Return serialized favorites for a user."""

        return [
            {
                "city": favorite.city,
                "country": favorite.country,
                "added_at": favorite.added_at.isoformat(),
            }
            for favorite in self.repository.list_for_user(user_ip)
        ]

    def add(self, user_ip: str, city: str, country: str) -> bool:
        """Add a favorite for the user."""

        return self.repository.add(user_ip, city, country)

    def remove(self, user_ip: str, city: str, country: str) -> bool:
        """Remove a favorite for the user."""

        return self.repository.remove(user_ip, city, country)


__all__ = ["FavoritesService"]
