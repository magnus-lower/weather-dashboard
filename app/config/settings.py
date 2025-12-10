"""Application settings and environment loading helpers."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY", "dev-secret"))
    flask_env: str = field(default_factory=lambda: os.getenv("FLASK_ENV", "production"))
    debug: bool = field(default_factory=lambda: os.getenv("FLASK_DEBUG", "0") == "1")
    testing: bool = field(default_factory=lambda: os.getenv("FLASK_TESTING", "0") == "1")
    preferred_url_scheme: str = field(default_factory=lambda: os.getenv("PREFERRED_URL_SCHEME", "http"))

    def as_dict(self) -> Dict[str, Any]:
        """Return settings as a mapping usable by Flask."""
        return {
            "SECRET_KEY": self.secret_key,
            "ENV": self.flask_env,
            "DEBUG": self.debug,
            "TESTING": self.testing,
            "PREFERRED_URL_SCHEME": self.preferred_url_scheme,
        }
