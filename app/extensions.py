"""Extension registry for the Flask application."""
from flask import Flask
from flask_caching import Cache

cache = Cache()


def init_extensions(app: Flask) -> None:
    """Initialize application extensions."""
    cache.init_app(app)
