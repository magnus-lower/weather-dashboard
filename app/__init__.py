"""Application factory and dependency wiring for the application package."""
from __future__ import annotations

import logging

from flask import Flask

from app.config import get_settings
from app.extensions import cache
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.cache_repository import InMemoryCache
from app.repositories.favorites_repository import FavoritesRepository
from app.repositories.weather_api_repository import WeatherAPIRepository
from app.routes import (
    create_analytics_blueprint,
    create_favorites_blueprint,
    create_geo_blueprint,
    create_health_blueprint,
    create_root_blueprint,
    create_weather_blueprint,
)
from app.services.analytics_service import AnalyticsService
from app.services.favorites_service import FavoritesService
from app.services.weather_service import WeatherService


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application instance."""

    settings = get_settings(config_name)
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_mapping(settings.to_mapping())
    settings.init_app(app)

    _configure_logging(app)
    _register_extensions(app)

    if not app.config.get("WEATHER_API_KEY"):
        app.logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your environment.")

    weather_repo = WeatherAPIRepository(
        api_key=app.config["WEATHER_API_KEY"],
        base_url=app.config["WEATHER_API_BASE_URL"],
        timeout=int(app.config.get("WEATHER_API_TIMEOUT", 10)),
    )
    cache_repo = InMemoryCache(
        default_timeout=int(app.config.get("CACHE_DEFAULT_TIMEOUT", 300))
    )
    analytics_repo = AnalyticsRepository()
    favorites_repo = FavoritesRepository()

    weather_service = WeatherService(weather_repo, cache_repo, analytics_repo)
    favorites_service = FavoritesService(favorites_repo)
    analytics_service = AnalyticsService(analytics_repo)

    _register_blueprints(
        app,
        weather_service,
        favorites_service,
        analytics_service,
        cache_repo,
    )
    app.logger.info("Application initialized")
    return app


def _configure_logging(app: Flask) -> None:
    """Configure application-level logging."""

    log_level = getattr(logging, app.config.get("LOG_LEVEL", "INFO"))
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def _register_extensions(app: Flask) -> None:
    """Initialize extensions with the Flask app."""

    cache.init_app(app)


def _register_blueprints(
    app: Flask,
    weather_service: WeatherService,
    favorites_service: FavoritesService,
    analytics_service: AnalyticsService,
    cache_repo: InMemoryCache,
) -> None:
    """Register all application blueprints with injected services."""

    app.register_blueprint(create_root_blueprint())
    app.register_blueprint(create_weather_blueprint(weather_service))
    app.register_blueprint(create_geo_blueprint(weather_service))
    app.register_blueprint(create_analytics_blueprint(analytics_service))
    app.register_blueprint(create_favorites_blueprint(favorites_service))
    app.register_blueprint(create_health_blueprint(cache_repo))


__all__ = ["create_app"]
