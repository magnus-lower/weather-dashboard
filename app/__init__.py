import logging
import os
from flask import Flask
from flask_caching import Cache

from app.config import config

cache = Cache()

__all__ = ["cache", "create_app"]


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    cache.init_app(app)

    logging.basicConfig(
        level=getattr(logging, app.config['LOG_LEVEL']),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    if not app.config['WEATHER_API_KEY']:
        logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your .env file.")

    from app.services.weather.service import WeatherAPIService
    weather_service = WeatherAPIService(
        api_key=app.config['WEATHER_API_KEY'],
        base_url=app.config['WEATHER_API_BASE_URL']
    )

    logger.info("Application started successfully (database-free mode)")

    from app.routes import init_app_dependencies, register_error_handlers, weather_bp

    init_app_dependencies(weather_service, cache, logger)
    app.register_blueprint(weather_bp)

    register_error_handlers(app, logger)

    return app
