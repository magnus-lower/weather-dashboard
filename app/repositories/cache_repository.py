"""In-memory cache repository with simple TTL support."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional


class InMemoryCache:
    """Provide a minimal in-memory cache suitable for small deployments."""

    def __init__(self, default_timeout: int = 300) -> None:
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}
        self.default_timeout = default_timeout

    def get(self, key: str) -> Optional[Any]:
        """Return the cached value when present and not expired."""

        if key in self._store and key in self._expiry:
            if datetime.now(timezone.utc) < self._expiry[key]:
                return self._store[key]
            self.delete(key)
        return None

    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """Cache a value for the provided or default timeout."""

        ttl = timeout if timeout is not None else self.default_timeout
        self._store[key] = value
        self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl)

    def delete(self, key: str) -> None:
        """Remove a cached item if present."""

        self._store.pop(key, None)
        self._expiry.pop(key, None)

    def clear(self) -> int:
        """Clear all cache entries and return the number removed."""

        removed = len(self._store)
        self._store.clear()
        self._expiry.clear()
        return removed

    def clear_expired(self) -> int:
        """Remove expired keys and return the count of keys removed."""

        now = datetime.now(timezone.utc)
        expired = [key for key, expiry in self._expiry.items() if now >= expiry]
        for key in expired:
            self.delete(key)
        return len(expired)


__all__ = ["InMemoryCache"]
