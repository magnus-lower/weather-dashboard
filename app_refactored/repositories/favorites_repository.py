"""In-memory favorites repository keyed by user IP."""
from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, List

from app_refactored.models.schemas import FavoriteCity


class FavoritesRepository:
    """Store favorites per user."""

    def __init__(self) -> None:
        self._favorites: DefaultDict[str, List[FavoriteCity]] = defaultdict(list)

    def list_for_user(self, user_ip: str) -> List[FavoriteCity]:
        return list(self._favorites.get(user_ip, []))

    def add(self, user_ip: str, city: str, country: str) -> bool:
        favorites = self._favorites[user_ip]
        for fav in favorites:
            if fav.city.lower() == city.lower() and fav.country.lower() == country.lower():
                return False
        favorites.append(FavoriteCity(city=city, country=country))
        return True

    def remove(self, user_ip: str, city: str, country: str) -> bool:
        favorites = self._favorites[user_ip]
        for index, fav in enumerate(favorites):
            if fav.city.lower() == city.lower() and fav.country.lower() == country.lower():
                del favorites[index]
                return True
        return False


favorites_repo = FavoritesRepository()

__all__ = ["favorites_repo", "FavoritesRepository"]
