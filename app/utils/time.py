"""Time utilities."""
from __future__ import annotations

from datetime import datetime, timezone


def calculate_response_time(start_time: datetime) -> float:
    """Return the elapsed time in milliseconds from the provided start time."""

    end_time = datetime.now(timezone.utc)
    delta = end_time - start_time
    return delta.total_seconds() * 1000


__all__ = ["calculate_response_time"]
