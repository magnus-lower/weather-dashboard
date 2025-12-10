"""Root blueprint serving the landing page template."""
from __future__ import annotations

from flask import Blueprint, render_template

root_bp = Blueprint("root", __name__)


@root_bp.get("/")
def index() -> str:
    """Render the application landing page."""

    return render_template("index.html")
