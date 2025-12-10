"""In-memory favorites repository keyed by user identifier."""
from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, List

from app_refactored.models.schemas import FavoriteCity


class FavoritesRepository:
    """Store and manage favorite cities per user."""

    def __init__(self) -> None:
        self._favorites: DefaultDict[str, List[FavoriteCity]] = defaultdict(list)

    def list_for_user(self, user_ip: str) -> List[FavoriteCity]:
        """Return favorites for the given user."""

        return list(self._favorites.get(user_ip, []))

    def add(self, user_ip: str, city: str, country: str) -> bool:
        """Add a favorite city for the user if it does not already exist."""

        favorites = self._favorites[user_ip]
        for favorite in favorites:
            if favorite.city.lower() == city.lower() and favorite.country.lower() == country.lower():
                return False
        favorites.append(FavoriteCity(city=city, country=country))
        return True

    def remove(self, user_ip: str, city: str, country: str) -> bool:
        """Remove a favorite city for the user."""

        favorites = self._favorites[user_ip]
        for index, favorite in enumerate(favorites):
            if favorite.city.lower() == city.lower() and favorite.country.lower() == country.lower():
                del favorites[index]
                return True
        return False


__all__ = ["FavoritesRepository"]
