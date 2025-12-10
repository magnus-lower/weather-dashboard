"""Root blueprint serving the main index template."""
from flask import Blueprint, render_template

bp = Blueprint("root", __name__)


@bp.get("/")
def index():
    """Render the landing page template."""
    return render_template("index.html")
