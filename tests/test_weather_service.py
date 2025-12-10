from unittest.mock import patch

import pytest
import requests

from app.services.weather.service import DatabaseCache, WeatherAPIService, WeatherAnalytics


class MockResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(response=self)


def test_fetch_weather_data_success(monkeypatch):
    service = WeatherAPIService(api_key="test", base_url="http://example.com/")

    def mock_get(url):
        return MockResponse({"cod": 200, "name": "Oslo"}, status_code=200)

    monkeypatch.setattr(service.session, "get", mock_get)

    data = service.fetch_weather_data("http://example.com/weather")

    assert data["name"] == "Oslo"


def test_fetch_weather_data_handles_http_error(monkeypatch):
    service = WeatherAPIService(api_key="test", base_url="http://example.com/")

    def mock_get(url):
        return MockResponse({"message": "Not found", "cod": 404}, status_code=404)

    monkeypatch.setattr(service.session, "get", mock_get)

    data = service.fetch_weather_data("http://example.com/weather")

    assert data["error"] == "Byen ble ikke funnet"


def test_fetch_weather_data_timeout(monkeypatch):
    service = WeatherAPIService(api_key="test", base_url="http://example.com/")

    def mock_timeout(url):
        raise requests.exceptions.Timeout()

    monkeypatch.setattr(service.session, "get", mock_timeout)

    data = service.fetch_weather_data("http://example.com/weather")

    assert "tok for lang tid" in data["error"]


def test_fetch_weather_data_invalid_json(monkeypatch):
    service = WeatherAPIService(api_key="test", base_url="http://example.com/")

    class InvalidJSONResponse(MockResponse):
        def json(self):
            import json

            raise json.JSONDecodeError("invalid json", "{}", 0)

    monkeypatch.setattr(service.session, "get", lambda url: InvalidJSONResponse({}, status_code=200))

    data = service.fetch_weather_data("http://example.com/weather")

    assert "Ugyldig respons" in data["error"]


def test_database_cache_interaction():
    with patch("app.services.weather.service.weather_cache") as cache_mock:
        cache_mock.get.return_value = {"name": "cached"}

        result = DatabaseCache.get("key")
        assert result == {"name": "cached"}
        cache_mock.get.assert_called_once_with("key")

        DatabaseCache.set("key", {"name": "new"}, timeout=60)
        cache_mock.set.assert_called_once_with("key", {"name": "new"}, 60)

        cache_mock.clear_expired.return_value = 1
        expired = DatabaseCache.clear_expired()
        assert expired == 1
        cache_mock.clear_expired.assert_called_once()


def test_weather_analytics_log_query():
    with patch("app.services.weather.service.analytics") as analytics_mock:
        WeatherAnalytics.log_query("Oslo", "NO", "127.0.0.1", 10.5, "weather")
        analytics_mock.log_query.assert_called_once_with("Oslo", "NO", "127.0.0.1", 10.5, "weather")


@pytest.mark.parametrize(
    "payload,expected_count",
    [
        ({"cod": "500", "message": "error"}, 1),
        ({"cod": 500, "message": "error"}, 1),
    ],
)
def test_fetch_weather_data_handles_error_codes(monkeypatch, payload, expected_count):
    service = WeatherAPIService(api_key="test", base_url="http://example.com/")

    monkeypatch.setattr(service.session, "get", lambda url: MockResponse(payload, status_code=200))

    data = service.fetch_weather_data("http://example.com/weather")

    assert "error" in data
