from unittest.mock import MagicMock

import pytest

from app.routes import weather_routes


@pytest.fixture(autouse=True)
def reset_cache_mocks(monkeypatch):
    monkeypatch.setattr(weather_routes.DatabaseCache, "get", MagicMock(return_value=None))
    monkeypatch.setattr(weather_routes.DatabaseCache, "set", MagicMock())
    monkeypatch.setattr(weather_routes.DatabaseCache, "clear_expired", MagicMock(return_value=0))


def test_get_weather_success(client, monkeypatch):
    weather_data = {"name": "Oslo", "weather": [{"description": "Clear"}], "sys": {"country": "NO"}}
    fetch_mock = MagicMock(return_value=weather_data)
    monkeypatch.setattr(weather_routes.weather_service, "fetch_weather_data", fetch_mock)

    response = client.get("/weather?city=Oslo")

    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "Oslo"
    assert "weather" in data
    fetch_mock.assert_called_once()


def test_get_forecast_success(client, monkeypatch):
    forecast_data = {"city": {"name": "Oslo"}, "list": [{"dt": 1, "main": {"temp": 10}}]}
    fetch_mock = MagicMock(return_value=forecast_data)
    monkeypatch.setattr(weather_routes.weather_service, "fetch_weather_data", fetch_mock)

    response = client.get("/forecast?city=Oslo")

    assert response.status_code == 200
    body = response.get_json()
    assert body["city"]["name"] == "Oslo"
    assert isinstance(body.get("list"), list)


def test_city_suggestions(client, monkeypatch):
    suggestions = [{"name": "Oslo", "country": "NO"}, {"name": "Osaka", "country": "JP"}]
    suggestion_mock = MagicMock(return_value=suggestions)
    monkeypatch.setattr(weather_routes.weather_service, "fetch_city_suggestions", suggestion_mock)

    response = client.get("/city_suggestions?q=os")

    assert response.status_code == 200
    assert response.get_json() == suggestions
    suggestion_mock.assert_called_once_with("os")


def test_reverse_geocode_success(client, monkeypatch):
    location_data = {"city": "Oslo", "country": "NO"}
    reverse_mock = MagicMock(return_value=location_data)
    monkeypatch.setattr(weather_routes.weather_service, "reverse_geocode", reverse_mock)

    response = client.get("/reverse_geocode?lat=59&lon=10")

    assert response.status_code == 200
    assert response.get_json() == location_data
    reverse_mock.assert_called_once_with("59", "10")


def test_health_endpoint(client, monkeypatch):
    monkeypatch.setattr(weather_routes.DatabaseCache, "clear_expired", MagicMock(return_value=2))

    response = client.get("/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["cache_cleaned"] == 2


def test_weather_requires_city(client):
    response = client.get("/weather")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_reverse_geocode_requires_coordinates(client):
    response = client.get("/reverse_geocode")
    assert response.status_code == 400
    assert "error" in response.get_json()
