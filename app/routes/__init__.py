from app.routes.weather_routes import bp, init_app_dependencies, register_error_handlers

weather_bp = bp

__all__ = ["bp", "weather_bp", "init_app_dependencies", "register_error_handlers"]
