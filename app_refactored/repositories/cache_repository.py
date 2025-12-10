"""In-memory cache implementation with expiry handling."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional


class InMemoryCache:
    """Simple in-memory cache with per-key expiry."""

    def __init__(self) -> None:
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}

    def get(self, key: str) -> Optional[Any]:
        """Return cached value if not expired; otherwise remove it."""
        if key in self._store:
            if datetime.now(timezone.utc) < self._expiry[key]:
                return self._store[key]
            self._store.pop(key, None)
            self._expiry.pop(key, None)
        return None

    def set(self, key: str, value: Any, timeout: int = 300) -> None:
        """Cache a value for a given timeout (seconds)."""
        self._store[key] = value
        self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=timeout)

    def clear(self) -> int:
        """Clear all cache entries and return removed count."""
        removed = len(self._store)
        self._store.clear()
        self._expiry.clear()
        return removed

    def clear_expired(self) -> int:
        """Remove expired keys and return count."""
        now = datetime.now(timezone.utc)
        expired = [k for k, expiry in self._expiry.items() if now >= expiry]
        for key in expired:
            self._store.pop(key, None)
            self._expiry.pop(key, None)
        return len(expired)


cache_store = InMemoryCache()

__all__ = ["cache_store", "InMemoryCache"]
