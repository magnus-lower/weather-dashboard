"""WSGI entrypoint for the refactored application."""
from __future__ import annotations

from app_refactored import create_app

application = create_app()

if __name__ == "__main__":
    application.run(host="0.0.0.0", port=5000)
