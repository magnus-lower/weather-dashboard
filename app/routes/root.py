"""Root blueprint serving the landing page template."""
from __future__ import annotations

from flask import Blueprint, render_template


def create_root_blueprint() -> Blueprint:
    """Create the root blueprint that renders the landing page."""

    root_bp = Blueprint("root", __name__)

    @root_bp.get("/")
    def index() -> str:
        """Render the application landing page."""

        return render_template("index.html")

    return root_bp
