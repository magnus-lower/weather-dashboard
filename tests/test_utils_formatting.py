from app.utils import formatting


def test_format_temperature_metric():
    assert formatting.format_temperature(12.345) == "12.3°C"


def test_format_temperature_imperial():
    assert formatting.format_temperature(70, unit="imperial") == "70.0°F"


def test_format_wind_speed_metric():
    assert formatting.format_wind_speed(5.678) == "5.7 m/s"


def test_format_wind_speed_imperial():
    assert formatting.format_wind_speed(10, unit="imperial") == "10.0 mph"


def test_calculate_response_time(app):
    from datetime import datetime, timedelta, timezone
    from app.utils.timing import calculate_response_time

    start_time = datetime.now(timezone.utc) - timedelta(seconds=1)
    elapsed_ms = calculate_response_time(start_time)

    assert 900 <= elapsed_ms <= 1100


def test_get_user_ip_from_headers(app):
    from app.utils import request_metadata

    with app.test_request_context('/', headers={'X-Forwarded-For': '1.1.1.1, 2.2.2.2'}):
        assert request_metadata.get_user_ip() == '1.1.1.1'


def test_get_client_info_defaults(app):
    from app.utils import request_metadata

    with app.test_request_context('/'):
        info = request_metadata.get_client_info()

    assert info['ip'] == 'unknown' or info['ip'] == '127.0.0.1'
    assert 'timestamp' in info
