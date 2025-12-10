"""Shared data models for the refactored application."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class WeatherRequest:
    """Incoming request metadata for weather lookups."""

    city: Optional[str] = None
    country: str = "NO"
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    unit: str = "metric"
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class WeatherQueryLog:
    """Analytic entry describing a user request."""

    city: str
    country: str
    user_ip: str
    response_time_ms: float
    endpoint: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class FavoriteCity:
    """Representation of a user's favorite city."""

    city: str
    country: str
    added_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ServiceResult:
    """Generic service response wrapper."""

    payload: Dict | List | None
    from_cache: bool = False
    error: Optional[str] = None


__all__ = [
    "WeatherRequest",
    "WeatherQueryLog",
    "FavoriteCity",
    "ServiceResult",
]
