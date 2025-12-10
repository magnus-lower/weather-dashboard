"""Application configuration for refactored project."""
from __future__ import annotations

import logging
import os
from typing import Dict

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-in-production")
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 300

    WEATHER_API_KEY = os.environ.get("API_KEY")
    WEATHER_API_BASE_URL = "https://api.openweathermap.org/data/2.5/"
    WEATHER_API_TIMEOUT = 10

    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    @staticmethod
    def init_app(app) -> None:  # pragma: no cover - simple hook
        """Hook for custom initialization."""
        app.logger.setLevel(logging.getLevelName(app.config.get("LOG_LEVEL", "INFO")))


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False

    @classmethod
    def init_app(cls, app) -> None:
        super().init_app(app)

        # Log to stdout in production environments (e.g., Fly.io)
        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        stream_handler.setFormatter(formatter)
        if not any(isinstance(h, logging.StreamHandler) for h in app.logger.handlers):
            app.logger.addHandler(stream_handler)


config: Dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

__all__ = ["config", "Config", "DevelopmentConfig", "TestingConfig", "ProductionConfig"]
