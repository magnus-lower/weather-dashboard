"""Environment-aware application configuration settings."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Dict

from dotenv import load_dotenv
from flask import Flask

load_dotenv()


@dataclass
class Settings:
    """Configuration container supporting environment overrides."""

    env: str = field(default_factory=lambda: os.getenv("FLASK_CONFIG", "development"))
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY", "dev-key-change-in-production"))
    cache_type: str = field(default_factory=lambda: os.getenv("CACHE_TYPE", "SimpleCache"))
    cache_default_timeout: int = field(
        default_factory=lambda: int(os.getenv("CACHE_DEFAULT_TIMEOUT", "300"))
    )
    weather_api_key: str | None = field(default_factory=lambda: os.getenv("API_KEY"))
    weather_api_base_url: str = field(
        default_factory=lambda: os.getenv(
            "WEATHER_API_BASE_URL", "https://api.openweathermap.org/data/2.5/"
        )
    )
    weather_api_timeout: int = field(
        default_factory=lambda: int(os.getenv("WEATHER_API_TIMEOUT", "10"))
    )
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    debug: bool = False
    testing: bool = False

    def apply_environment_overrides(self) -> None:
        """Adjust settings based on the configured environment."""

        env = self.env.lower()
        if env == "development":
            self.debug = True
        elif env == "testing":
            self.testing = True
        elif env == "production":
            self.debug = False
        else:
            self.debug = False

    def to_mapping(self) -> Dict[str, object]:
        """Convert settings to a Flask configuration mapping."""

        return {
            "ENV": self.env,
            "DEBUG": self.debug,
            "TESTING": self.testing,
            "SECRET_KEY": self.secret_key,
            "CACHE_TYPE": self.cache_type,
            "CACHE_DEFAULT_TIMEOUT": self.cache_default_timeout,
            "WEATHER_API_KEY": self.weather_api_key,
            "WEATHER_API_BASE_URL": self.weather_api_base_url,
            "WEATHER_API_TIMEOUT": self.weather_api_timeout,
            "LOG_LEVEL": self.log_level,
        }

    def init_app(self, app: Flask) -> None:
        """Perform application-specific initialization such as logging."""

        app.logger.setLevel(logging.getLevelName(self.log_level))
        if self.env.lower() == "production":
            stream_handler = logging.StreamHandler()
            stream_handler.setLevel(logging.INFO)
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            stream_handler.setFormatter(formatter)
            if not any(isinstance(h, logging.StreamHandler) for h in app.logger.handlers):
                app.logger.addHandler(stream_handler)


def get_settings(config_name: str | None = None) -> Settings:
    """Return a configured :class:`Settings` instance."""

    settings = Settings(env=config_name or os.getenv("FLASK_CONFIG", "development"))
    settings.apply_environment_overrides()
    return settings


__all__ = ["Settings", "get_settings"]
