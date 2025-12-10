"""Application factory for the Weather Dashboard Flask app."""
from flask import Flask

from app.config.settings import Settings
from app.extensions import init_extensions
from app.routes import register_blueprints


def create_app() -> Flask:
    """Create and configure a Flask application instance."""
    app = Flask(__name__, template_folder="templates", static_folder="static", static_url_path="/static")

    settings = Settings()
    app.config.from_mapping(settings.as_dict())

    init_extensions(app)
    register_blueprints(app)

    return app
