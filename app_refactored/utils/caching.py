"""Caching helpers."""
from __future__ import annotations

from datetime import datetime


def make_cache_key(
    city: str | None = None,
    country: str | None = None,
    lat: str | None = None,
    lon: str | None = None,
    granularity: str = "hour",
) -> str:
    """Generate a deterministic cache key for weather lookups."""

    current_unit = datetime.utcnow().strftime(
        "%Y%m%d%H" if granularity == "hour" else "%Y%m%d"
    )
    if city and country:
        return f"weather:city:{city.lower()}:{country.lower()}:{current_unit}"
    if lat and lon:
        return f"weather:coords:{lat}:{lon}:{current_unit}"
    return f"weather:generic:{current_unit}"


__all__ = ["make_cache_key"]
