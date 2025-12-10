"""HTTP route blueprint factories for the application."""
from __future__ import annotations

from app.routes.analytics import create_analytics_blueprint
from app.routes.favorites import create_favorites_blueprint
from app.routes.geo import create_geo_blueprint
from app.routes.health import create_health_blueprint
from app.routes.root import create_root_blueprint
from app.routes.weather import create_weather_blueprint

__all__ = [
    "create_analytics_blueprint",
    "create_favorites_blueprint",
    "create_geo_blueprint",
    "create_health_blueprint",
    "create_root_blueprint",
    "create_weather_blueprint",
]
