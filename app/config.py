# config.py - Application configuration (Database-free version)
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'

    # Cache configuration (in-memory only)
    CACHE_TYPE = 'SimpleCache'
    CACHE_DEFAULT_TIMEOUT = 300  # 5 minutes

    # Weather API configuration
    WEATHER_API_KEY = os.environ.get('API_KEY')
    WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5/'
    WEATHER_API_TIMEOUT = 10

    # Rate limiting
    RATELIMIT_STORAGE_URL = 'memory://'

    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

    @staticmethod
    def init_app(app):
        """Initialize app with this config"""
        pass


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

    @classmethod
    def init_app(cls, app):
        Config.init_app(app)

        # Log to stdout in production (for Fly.io)
        import logging
        import sys
        
        # Create a stream handler that outputs to stdout
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
        app.logger.setLevel(logging.INFO)


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
