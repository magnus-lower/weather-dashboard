"""HTTP route blueprints for the application."""
from __future__ import annotations

from app.routes.analytics import analytics_bp
from app.routes.favorites import favorites_bp
from app.routes.geo import geo_bp
from app.routes.health import health_bp
from app.routes.root import root_bp
from app.routes.weather import weather_bp

__all__ = [
    "analytics_bp",
    "favorites_bp",
    "geo_bp",
    "health_bp",
    "root_bp",
    "weather_bp",
]
