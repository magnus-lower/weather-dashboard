# app.py - Main Flask application (Database-free version)
import logging
import os
from datetime import datetime, timezone

from flask import Flask
from flask_caching import Cache

# Import our modules
from app.config import config
from app.services.weather.service import WeatherAPIService
from app.routes.weather_routes import register_weather_routes
from app.routes.health_routes import register_health_routes, register_error_handlers


def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # Initialize extensions
    cache = Cache(app)

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, app.config['LOG_LEVEL']),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    # Validate API key
    if not app.config['WEATHER_API_KEY']:
        logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your .env file.")

    # Initialize weather service
    weather_service = WeatherAPIService(
        api_key=app.config['WEATHER_API_KEY'],
        base_url=app.config['WEATHER_API_BASE_URL']
    )

    logger.info("Application started successfully (database-free mode)")

    register_weather_routes(app, weather_service, cache, logger)
    register_health_routes(app, cache, logger)
    register_error_handlers(app, logger)

    return app


config_name = os.environ.get('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    # Development server
    app.run(
        debug=app.config['DEBUG'],
        host='127.0.0.1',
        port=5000
    )
