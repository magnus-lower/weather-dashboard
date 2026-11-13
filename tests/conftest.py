import os
from collections import defaultdict
import sys

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key")
    monkeypatch.setenv("WEATHER_API_KEY", "test-key")
    monkeypatch.setenv("FLASK_CONFIG", "testing")
    import importlib

    config_module = importlib.import_module("app.config")
    importlib.reload(config_module)
    config_module.Config.WEATHER_API_KEY = "test-key"
    config_module.TestingConfig.WEATHER_API_KEY = "test-key"
    config_module.config["testing"].WEATHER_API_KEY = "test-key"
    import app as app_module
    importlib.reload(app_module)

    return app_module.create_app("testing")


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def disable_network_calls(monkeypatch):
    """Prevent tests from making real HTTP requests."""

    def _blocked_request(*args, **kwargs):  # pragma: no cover - guard clause
        raise RuntimeError("External network access is blocked during tests")

    monkeypatch.setattr("requests.sessions.Session.request", _blocked_request)
    return _blocked_request


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    from app.core.cache import analytics, weather_cache
    weather_cache.clear()
    analytics.queries.clear()
    analytics.city_counts.clear()
    analytics.query_stats = {
        'total_queries': 0, 'avg_response_time': 0,
        'endpoints': defaultdict(int)
    }
    yield
    weather_cache.clear()
