"""Blueprint registration for the Flask application."""
from flask import Flask

from app.routes.root import bp as root_bp


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with the Flask application."""
    app.register_blueprint(root_bp)
