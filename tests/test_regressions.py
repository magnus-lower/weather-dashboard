from unittest.mock import Mock

import pytest
import requests

from app.core.cache import InMemoryCache
from app.routes import weather_routes
from app.services.weather.service import WeatherAPIService
from app.utils.validation import validate_city_name, validate_coordinates


@pytest.mark.parametrize('unit', ['metric', 'imperial', 'standard'])
def test_weather_parameters_and_country_normalization(client, monkeypatch, unit):
    fetch = Mock(return_value={'name': 'London'})
    monkeypatch.setattr(weather_routes.weather_service, 'fetch_weather_data', fetch)
    response = client.get('/weather', query_string={'city': 'London', 'country': 'gb', 'unit': unit})
    assert response.status_code == 200
    fetch.assert_called_once_with('weather', {'q': 'London,GB', 'units': unit})


@pytest.mark.parametrize('path', ['/weather?city=Oslo', '/weather_by_coords?lat=59&lon=10', '/forecast?city=Oslo'])
def test_cache_separates_units(client, monkeypatch, path):
    fetch = Mock(side_effect=[{'main': {'temp': 20}}, {'main': {'temp': 68}}])
    monkeypatch.setattr(weather_routes.weather_service, 'fetch_weather_data', fetch)
    assert client.get(path + '&unit=metric').get_json()['main']['temp'] == 20
    assert client.get(path + '&unit=imperial').get_json()['main']['temp'] == 68
    assert client.get(path + '&unit=metric').get_json()['main']['temp'] == 20
    assert fetch.call_count == 2


@pytest.mark.parametrize('path', [
    '/weather?city=Oslo&country=NOR',
    '/weather?city=Oslo&country=NO%26mode=xml',
    '/weather?city=Oslo&unit=invalid',
    '/weather_by_coords?lat=nan&lon=10',
    '/weather_by_coords?lat=59&lon=181',
    '/forecast?lat=59',
    '/forecast?city=Oslo&unit=invalid',
    '/forecast?city=Oslo&country=123',
    '/city_suggestions?q=' + 'x' * 101,
    '/city_suggestions?q=Oslo%00',
])
def test_invalid_parameters_do_not_reach_upstream(client, monkeypatch, path):
    fetch = Mock()
    monkeypatch.setattr(weather_routes.weather_service, 'fetch_weather_data', fetch)
    assert client.get(path).status_code == 400
    fetch.assert_not_called()


def test_forecast_uses_coordinates(client, monkeypatch):
    fetch = Mock(return_value={'list': []})
    monkeypatch.setattr(weather_routes.weather_service, 'fetch_weather_data', fetch)
    assert client.get('/forecast?lat=0&lon=10&unit=metric').status_code == 200
    fetch.assert_called_once_with('forecast', {'lat': '0.0', 'lon': '10.0', 'units': 'metric'})


@pytest.mark.parametrize('status', [404, 429, 502, 504])
def test_upstream_error_status_is_preserved(client, monkeypatch, status):
    monkeypatch.setattr(weather_routes.weather_service, 'fetch_weather_data', Mock(
        return_value={'error': 'Unavailable', 'status_code': status}))
    response = client.get('/weather?city=Oslo')
    assert response.status_code == status
    assert response.get_json() == {'error': 'Unavailable'}


def test_http_errors_remain_http_errors(client):
    response = client.post('/weather')
    assert response.status_code == 405
    assert response.is_json
    assert 'GET' in response.headers['Allow']
    assert client.get('/missing').status_code == 404


def test_cache_clear_is_disabled_in_production(app, monkeypatch):
    app.config.update(TESTING=False, DEBUG=False)
    clear = Mock()
    monkeypatch.setattr('app.core.cache.weather_cache.clear', clear)
    assert app.test_client().post('/clear_cache').status_code == 403
    clear.assert_not_called()


def test_redundant_server_favorites_are_removed(client):
    for method in (client.get, client.post, client.delete):
        assert method('/favorites').status_code == 404


@pytest.mark.parametrize('method,args,expected_url', [
    ('fetch_weather_data', ('weather', {'q': 'Oslo&mode=xml', 'units': 'metric'}),
     'https://api.openweathermap.org/data/2.5/weather'),
    ('fetch_city_suggestions', ('Oslo&mode=xml',), 'https://api.openweathermap.org/geo/1.0/direct'),
    ('reverse_geocode', ('59', '10'), 'https://api.openweathermap.org/geo/1.0/reverse'),
])
def test_all_requests_use_https_parameters_and_timeout(monkeypatch, method, args, expected_url):
    service = WeatherAPIService('test-secret', 'http://api.openweathermap.org/data/2.5/', timeout=7)
    response = Mock(status_code=200)
    response.json.return_value = {'cod': 200} if method == 'fetch_weather_data' else []
    get = Mock(return_value=response)
    monkeypatch.setattr(service.session, 'get', get)
    getattr(service, method)(*args)
    positional, keyword = get.call_args
    assert positional == (expected_url,)
    assert keyword['timeout'] == 7
    assert keyword['params']['appid'] == 'test-secret'
    assert keyword['allow_redirects'] is False
    if method != 'reverse_geocode':
        assert keyword['params']['q'] == 'Oslo&mode=xml'


@pytest.mark.parametrize('method,args', [
    ('fetch_weather_data', ('weather',)),
    ('fetch_city_suggestions', ('Oslo',)),
    ('reverse_geocode', ('59', '10')),
])
def test_sensitive_request_exceptions_are_not_logged(monkeypatch, caplog, method, args):
    service = WeatherAPIService('test-secret', 'https://api.openweathermap.org/data/2.5/')
    error = requests.exceptions.ConnectionError('https://example.com/?appid=test-secret')
    monkeypatch.setattr(service.session, 'get', Mock(side_effect=error))
    result = getattr(service, method)(*args)
    assert result['status_code'] == 502
    assert 'test-secret' not in caplog.text
    assert 'https://' not in caplog.text
    assert 'test-secret' not in str(result)


def test_real_requests_json_error_is_mapped(monkeypatch):
    service = WeatherAPIService('key', 'https://api.openweathermap.org/data/2.5/')
    response = requests.Response()
    response.status_code = 200
    response._content = b'invalid-json'
    monkeypatch.setattr(service.session, 'get', Mock(return_value=response))
    result = service.fetch_weather_data('weather')
    assert result['status_code'] == 502
    assert 'Ugyldig respons' in result['error']


@pytest.mark.parametrize('upstream_status,expected_status', [(401, 502), (404, 404), (429, 429), (503, 502)])
def test_http_errors_do_not_log_sensitive_urls(monkeypatch, caplog, upstream_status, expected_status):
    service = WeatherAPIService('test-secret', 'https://api.openweathermap.org/data/2.5/')
    response = requests.Response()
    response.status_code = upstream_status
    response.url = 'https://api.openweathermap.org/data/2.5/weather?appid=test-secret'
    monkeypatch.setattr(service.session, 'get', Mock(return_value=response))
    result = service.fetch_weather_data('weather')
    assert result['status_code'] == expected_status
    assert 'test-secret' not in caplog.text
    assert 'appid' not in caplog.text


def test_timeout_maps_to_gateway_timeout(monkeypatch):
    service = WeatherAPIService('key', 'https://api.openweathermap.org/data/2.5/')
    monkeypatch.setattr(service.session, 'get', Mock(side_effect=requests.exceptions.Timeout()))
    assert service.fetch_weather_data('weather')['status_code'] == 504


def test_http_exception_status_and_headers_are_preserved(app):
    from flask import request

    @app.post('/json-only')
    def json_only():
        return request.get_json()

    assert app.test_client().post('/json-only', data='{}', content_type='text/plain').status_code == 415
    assert app.test_client().post('/json-only', data='{bad', content_type='application/json').status_code == 400


def test_unexpected_errors_do_not_leak_sensitive_exception_text(app, caplog):
    @app.get('/raise-error')
    def raise_error():
        raise RuntimeError('https://example.com/?appid=test-secret')

    assert app.test_client().get('/raise-error').status_code == 500
    assert 'test-secret' not in caplog.text


def test_cache_evicts_expired_entries_and_is_bounded():
    cache = InMemoryCache()
    cache.set('expired', {}, timeout=-1)
    cache.set('fresh', {})
    assert 'expired' not in cache._cache
    for index in range(600):
        cache.set(str(index), {'index': index})
    assert len(cache._cache) == 512
    assert cache.get('599') == {'index': 599}


def test_international_city_names_and_nonfinite_coordinates():
    assert validate_city_name('東京')[0]
    assert not validate_city_name('<script>')[0]
    assert not validate_coordinates('inf', '0')[0]
    assert not validate_coordinates('0', 'nan')[0]


def test_no_secret_key_is_required_when_sessions_are_unused(app):
    app.config['SECRET_KEY'] = None
    assert app.test_client().get('/').status_code == 200
