"""Application factory and dependency wiring for the refactored project."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from flask import Flask

from app_refactored.config import get_settings
from app_refactored.extensions import cache
from app_refactored.repositories.analytics_repository import AnalyticsRepository
from app_refactored.repositories.cache_repository import InMemoryCache
from app_refactored.repositories.favorites_repository import FavoritesRepository
from app_refactored.repositories.weather_api_repository import WeatherAPIRepository
from app_refactored.routes.analytics import analytics_bp
from app_refactored.routes.favorites import favorites_bp
from app_refactored.routes.geo import geo_bp
from app_refactored.routes.health import health_bp
from app_refactored.routes.weather import weather_bp
from app_refactored.services.analytics_service import AnalyticsService
from app_refactored.services.favorites_service import FavoritesService
from app_refactored.services.weather_service import WeatherService


@dataclass
class ApplicationContainer:
    """Simple dependency container for repositories and services."""

    weather_repository: WeatherAPIRepository
    cache_repository: InMemoryCache
    analytics_repository: AnalyticsRepository
    favorites_repository: FavoritesRepository
    weather_service: WeatherService
    favorites_service: FavoritesService
    analytics_service: AnalyticsService


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application instance."""

    settings = get_settings(config_name)
    app = Flask(__name__)
    app.config.from_mapping(settings.to_mapping())
    settings.init_app(app)

    _configure_logging(app)
    _register_extensions(app)

    if not app.config.get("WEATHER_API_KEY"):
        app.logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your environment.")

    app.extensions["container"] = _build_container(app)
    _register_blueprints(app)
    app.logger.info("Refactored application initialized")
    return app


def get_container(app: Flask) -> ApplicationContainer:
    """Return the dependency container attached to the Flask app."""

    container = app.extensions.get("container")
    if not isinstance(container, ApplicationContainer):
        raise RuntimeError("Application container has not been initialized")
    return container


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


def _register_blueprints(app: Flask) -> None:
    """Register all application blueprints."""

    app.register_blueprint(weather_bp)
    app.register_blueprint(geo_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(health_bp)


def _build_container(app: Flask) -> ApplicationContainer:
    """Construct repositories and services for dependency injection."""

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

    return ApplicationContainer(
        weather_repository=weather_repo,
        cache_repository=cache_repo,
        analytics_repository=analytics_repo,
        favorites_repository=favorites_repo,
        weather_service=weather_service,
        favorites_service=favorites_service,
        analytics_service=analytics_service,
    )


__all__ = ["create_app", "ApplicationContainer", "get_container"]
