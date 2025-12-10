"""Flask application factory for the refactored weather dashboard."""
from __future__ import annotations

import logging
import os
from typing import Any

from flask import Flask

from app_refactored.config.settings import config
from app_refactored.extensions import cache
from app_refactored.routes.analytics import analytics_bp
from app_refactored.routes.favorites import favorites_bp
from app_refactored.routes.geo import geo_bp
from app_refactored.routes.health import health_bp
from app_refactored.routes.weather import weather_bp


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application.

    Args:
        config_name: Optional configuration name; defaults to the FLASK_CONFIG
            environment variable or ``default``.

    Returns:
        Configured :class:`~flask.Flask` instance.
    """

    resolved_config = config_name or os.environ.get("FLASK_CONFIG", "default")
    app = Flask(__name__)
    app.config.from_object(config[resolved_config])
    config[resolved_config].init_app(app)

    _configure_logging(app)
    _register_extensions(app)
    _register_blueprints(app)

    if not app.config.get("WEATHER_API_KEY"):
        app.logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your .env file.")

    app.logger.info("Refactored application initialized")
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


def _register_blueprints(app: Flask) -> None:
    """Register all application blueprints."""
    app.register_blueprint(weather_bp)
    app.register_blueprint(geo_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(health_bp)


__all__ = ["create_app"]
