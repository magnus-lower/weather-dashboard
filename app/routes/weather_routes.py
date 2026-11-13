import logging
from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify, render_template, request
from werkzeug.exceptions import HTTPException
from app.services.weather.service import DatabaseCache, WeatherAnalytics
from app.utils.cache_keys import make_cache_key
from app.utils.request_metadata import get_user_ip
from app.utils.timing import calculate_response_time
from app.utils.validation import (validate_city_name, validate_coordinates,
                                  validate_country_code, validate_unit, validate_search_query)

bp = Blueprint("main", __name__)
weather_service = None
cache = None
logger = logging.getLogger(__name__)

def init_app_dependencies(created_weather_service, flask_cache, app_logger):
    global weather_service, cache, logger
    weather_service = created_weather_service
    cache = flask_cache
    logger = app_logger

def api_response(data):
    if isinstance(data, dict) and 'error' in data:
        return jsonify({'error': data['error']}), data.get('status_code', 502)
    return jsonify(data)

@bp.route('/')
def home():
    return render_template('index.html')

@bp.route('/weather', methods=['GET'])
def get_weather():
    start_time = datetime.now(timezone.utc)
    city = request.args.get('city', '').strip()
    country = request.args.get('country', 'NO').strip().upper()
    unit = request.args.get('unit', 'metric').strip().lower()
    valid_unit, unit_error = validate_unit(unit)
    if not valid_unit:
        return jsonify({'error': unit_error}), 400
    if not city:
        return jsonify({'error': 'By-parameter er påkrevd'}), 400
    valid_city, city_error = validate_city_name(city)
    if not valid_city:
        return jsonify({'error': city_error}), 400
    valid_country, country_error = validate_country_code(country)
    if not valid_country:
        return jsonify({'error': country_error}), 400
    cache_key = make_cache_key(city=city, country=country, unit=unit)
    cached_data = DatabaseCache.get(cache_key)
    if cached_data:
        logger.info(f"Cache hit for {city}, {country}")
        return jsonify(cached_data)
    data = weather_service.fetch_weather_data('weather', {'q': f'{city},{country}' if country else city, 'units': unit})
    response_time = calculate_response_time(start_time)
    WeatherAnalytics.log_query(city, country, get_user_ip(), response_time, 'weather')
    if 'error' not in data:
        DatabaseCache.set(cache_key, data)
        logger.info(f"Cached weather data for {city}, {country}")
    return api_response(data)

@bp.route('/weather_by_coords', methods=['GET'])
def get_weather_by_coords():
    start_time = datetime.now(timezone.utc)
    lat = request.args.get('lat', '').strip()
    lon = request.args.get('lon', '').strip()
    unit = request.args.get('unit', 'metric').strip().lower()
    valid_unit, unit_error = validate_unit(unit)
    if not valid_unit:
        return jsonify({'error': unit_error}), 400
    if not lat or not lon:
        return jsonify({'error': 'Breddegrad og lengdegrad parametere er påkrevd'}), 400
    valid_coords, coords_error = validate_coordinates(lat, lon)
    if not valid_coords:
        return jsonify({'error': coords_error}), 400
    lat, lon = str(float(lat)), str(float(lon))
    cache_key = make_cache_key(lat=lat, lon=lon, unit=unit)
    cached_data = DatabaseCache.get(cache_key)
    if cached_data:
        return jsonify(cached_data)
    data = weather_service.fetch_weather_data('weather', {'lat': lat, 'lon': lon, 'units': unit})
    response_time = calculate_response_time(start_time)
    city_name = data.get('name', 'Unknown') if 'error' not in data else 'Unknown'
    country_code = data.get('sys', {}).get('country', 'Unknown') if 'error' not in data else 'Unknown'
    WeatherAnalytics.log_query(city_name, country_code, get_user_ip(), response_time, 'coords')
    if 'error' not in data:
        DatabaseCache.set(cache_key, data)
    return api_response(data)

@bp.route('/forecast', methods=['GET'])
def get_forecast():
    start_time = datetime.now(timezone.utc)
    city = request.args.get('city', '').strip()
    country = request.args.get('country', 'NO').strip().upper()
    unit = request.args.get('unit', 'metric').strip().lower()
    valid_unit, unit_error = validate_unit(unit)
    if not valid_unit:
        return jsonify({'error': unit_error}), 400
    lat = request.args.get('lat', '').strip()
    lon = request.args.get('lon', '').strip()
    if lat or lon:
        valid, error = validate_coordinates(lat, lon)
        if not valid:
            return jsonify({'error': error}), 400
        lat, lon = str(float(lat)), str(float(lon))
        params = {'lat': lat, 'lon': lon, 'units': unit}
        cache_key = make_cache_key(lat=lat, lon=lon, unit=unit, endpoint='forecast')
    else:
        valid, error = validate_city_name(city)
        if not valid:
            return jsonify({'error': error}), 400
        valid, error = validate_country_code(country)
        if not valid:
            return jsonify({'error': error}), 400
        params = {'q': f'{city},{country}' if country else city, 'units': unit}
        cache_key = make_cache_key(city=city, country=country, unit=unit, endpoint='forecast')
    cached_data = DatabaseCache.get(cache_key)
    if cached_data:
        return jsonify(cached_data)
    data = weather_service.fetch_weather_data('forecast', params)
    response_time = calculate_response_time(start_time)
    WeatherAnalytics.log_query(city or 'Coordinates', country, get_user_ip(), response_time, 'forecast')
    if 'error' not in data:
        DatabaseCache.set(cache_key, data, timeout=1800)
    return api_response(data)


@bp.route('/city_suggestions', methods=['GET'])
def get_city_suggestions():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    if len(query) < 2:
        return jsonify([])
    valid, error = validate_search_query(query)
    if not valid:
        return jsonify({'error': error}), 400
    suggestions = weather_service.fetch_city_suggestions(query)
    return api_response(suggestions)

@bp.route('/reverse_geocode', methods=['GET'])
def reverse_geocode():
    lat = request.args.get('lat', '').strip()
    lon = request.args.get('lon', '').strip()
    if not lat or not lon:
        return jsonify({'error': 'Breddegrad og lengdegrad er påkrevd'}), 400
    valid_coords, coords_error = validate_coordinates(lat, lon)
    if not valid_coords:
        return jsonify({'error': coords_error}), 400
    location_data = weather_service.reverse_geocode(lat, lon)
    return api_response(location_data)

@bp.route('/analytics', methods=['GET'])
def get_analytics():
    stats = WeatherAnalytics.get_query_stats()
    popular_cities = WeatherAnalytics.get_popular_cities()
    return jsonify({'stats': stats, 'popular_cities': popular_cities})

@bp.route('/popular_cities', methods=['GET'])
def get_popular_cities():
    limit = request.args.get('limit', 10, type=int)
    limit = max(1, min(limit, 50))
    cities = WeatherAnalytics.get_popular_cities(limit)
    return jsonify(cities)

@bp.route('/health', methods=['GET'])
def health_check():
    expired_count = DatabaseCache.clear_expired()
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.2.0',
        'mode': 'in-memory',
        'cache_cleaned': expired_count
    })

@bp.route('/clear_cache', methods=['POST'])
def clear_cache():
    if not (current_app.debug or current_app.testing):
        return jsonify({'error': 'Endepunkt ikke tilgjengelig'}), 403
    try:
        from app.core.cache import weather_cache
        cache_count = weather_cache.clear()
        cache.clear()
        logger.info("Alle cacher tømt")
        return jsonify({
            'message': 'Alle cacher tømt',
            'cleared_entries': cache_count
        })
    except Exception as error:
        logger.error("Error clearing cache (%s)", type(error).__name__)
        return jsonify({'error': 'Kunne ikke tømme cache'}), 500

def register_error_handlers(app, app_logger):
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endepunkt ikke funnet'}), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Ugyldig forespørsel'}), 400

    @app.errorhandler(500)
    def internal_error(error):
        app_logger.error("Internal server error (%s)", type(error).__name__)
        return jsonify({'error': 'Intern serverfeil'}), 500

    @app.errorhandler(Exception)
    def handle_exception(exception):
        if isinstance(exception, HTTPException):
            response = exception.get_response()
            response.data = current_app.json.dumps({'error': exception.name})
            response.content_type = 'application/json'
            return response
        app_logger.error("Unhandled exception (%s)", type(exception).__name__)
        return jsonify({'error': 'En uventet feil oppstod. Vennligst prøv igjen senere.'}), 500

    return app
