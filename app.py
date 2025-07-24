# app.py - Main Flask application (Database-free version)
import logging
import os
from datetime import datetime

from flask import Flask, render_template, request, jsonify
from flask_caching import Cache

# Import our modules
from config import config
from services import WeatherAPIService, WeatherAnalytics, DatabaseCache, FavoritesService
from utils import make_cache_key, get_user_ip, validate_coordinates, validate_city_name, calculate_response_time


def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # Initialize extensions
    cache = Cache(app)

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, app.config['LOG_LEVEL']),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    # Validate API key
    if not app.config['WEATHER_API_KEY']:
        logger.critical("WEATHER_API_KEY missing from environment variables")
        raise ValueError("WEATHER_API_KEY is missing. Please set it in your .env file.")

    # Initialize weather service
    weather_service = WeatherAPIService(
        api_key=app.config['WEATHER_API_KEY'],
        base_url=app.config['WEATHER_API_BASE_URL']
    )

    logger.info("Application started successfully (database-free mode)")

    # Routes
    @app.route('/')
    def home():
        """Render main page"""
        return render_template('index.html')

    @app.route('/weather', methods=['GET'])
    def get_weather():
        """Get current weather by city"""
        start_time = datetime.utcnow()

        city = request.args.get('city', '').strip()
        country = request.args.get('country', 'NO').strip()
        unit = request.args.get('unit', 'metric')

        # Validate inputs
        if not city:
            return jsonify({'error': 'By-parameter er påkrevd'}), 400

        valid_city, city_error = validate_city_name(city)
        if not valid_city:
            return jsonify({'error': city_error}), 400

        # Check cache first
        cache_key = make_cache_key(city=city, country=country)
        cached_data = DatabaseCache.get(cache_key)
        if cached_data:
            logger.info(f"Cache hit for {city}, {country}")
            return jsonify(cached_data)

        # Fetch from API
        url = f'{weather_service.base_url}weather?q={city},{country}&units={unit}&appid={weather_service.api_key}'
        data = weather_service.fetch_weather_data(url)

        # Log analytics
        response_time = calculate_response_time(start_time)
        WeatherAnalytics.log_query(city, country, get_user_ip(), response_time, 'weather')

        # Cache successful responses
        if 'error' not in data:
            DatabaseCache.set(cache_key, data)
            logger.info(f"Cached weather data for {city}, {country}")

        return jsonify(data)

    @app.route('/weather_by_coords', methods=['GET'])
    def get_weather_by_coords():
        """Get current weather by coordinates"""
        start_time = datetime.utcnow()

        lat = request.args.get('lat', '').strip()
        lon = request.args.get('lon', '').strip()
        unit = request.args.get('unit', 'metric')

        # Validate inputs
        if not lat or not lon:
            return jsonify({'error': 'Breddegrad og lengdegrad parametere er påkrevd'}), 400

        valid_coords, coords_error = validate_coordinates(lat, lon)
        if not valid_coords:
            return jsonify({'error': coords_error}), 400

        # Check cache
        cache_key = make_cache_key(lat=lat, lon=lon)
        cached_data = DatabaseCache.get(cache_key)
        if cached_data:
            return jsonify(cached_data)

        # Fetch from API
        url = f'{weather_service.base_url}weather?lat={lat}&lon={lon}&units={unit}&appid={weather_service.api_key}'
        data = weather_service.fetch_weather_data(url)

        # Log analytics (use city from response if available)
        response_time = calculate_response_time(start_time)
        city_name = data.get('name', 'Unknown') if 'error' not in data else 'Unknown'
        country_code = data.get('sys', {}).get('country', 'Unknown') if 'error' not in data else 'Unknown'
        WeatherAnalytics.log_query(city_name, country_code, get_user_ip(), response_time, 'coords')

        # Cache successful responses
        if 'error' not in data:
            DatabaseCache.set(cache_key, data)

        return jsonify(data)

    @app.route('/forecast', methods=['GET'])
    def get_forecast():
        """Get 5-day weather forecast"""
        start_time = datetime.utcnow()

        city = request.args.get('city', '').strip()
        country = request.args.get('country', 'NO').strip()
        unit = request.args.get('unit', 'metric')

        # Validate inputs
        if not city:
            return jsonify({'error': 'By-parameter er påkrevd'}), 400

        valid_city, city_error = validate_city_name(city)
        if not valid_city:
            return jsonify({'error': city_error}), 400

        # Check cache
        cache_key = f"forecast:{city.lower()}:{country.lower()}:{datetime.now().hour}"
        cached_data = DatabaseCache.get(cache_key)
        if cached_data:
            return jsonify(cached_data)

        # Fetch from API
        url = f'{weather_service.base_url}forecast?q={city},{country}&units={unit}&appid={weather_service.api_key}'
        data = weather_service.fetch_weather_data(url)

        # Log analytics
        response_time = calculate_response_time(start_time)
        WeatherAnalytics.log_query(city, country, get_user_ip(), response_time, 'forecast')

        # Cache successful responses
        if 'error' not in data:
            DatabaseCache.set(cache_key, data, timeout=1800)  # 30 minutes for forecast

        return jsonify(data)

    @app.route('/city_suggestions', methods=['GET'])
    def get_city_suggestions():
        """Get city suggestions for autocomplete"""
        query = request.args.get('q', '').strip()

        if not query:
            return jsonify([])

        # Validate and sanitize input
        if len(query) < 2:
            return jsonify([])

        # Use weather service to get suggestions
        suggestions = weather_service.fetch_city_suggestions(query)
        return jsonify(suggestions)

    @app.route('/reverse_geocode', methods=['GET'])
    def reverse_geocode():
        """Reverse geocode coordinates to city name"""
        lat = request.args.get('lat', '').strip()
        lon = request.args.get('lon', '').strip()

        if not lat or not lon:
            return jsonify({'error': 'Breddegrad og lengdegrad er påkrevd'}), 400

        valid_coords, coords_error = validate_coordinates(lat, lon)
        if not valid_coords:
            return jsonify({'error': coords_error}), 400

        # Use weather service to reverse geocode
        location_data = weather_service.reverse_geocode(lat, lon)
        return jsonify(location_data)

    @app.route('/analytics', methods=['GET'])
    def get_analytics():
        """Get weather query analytics"""
        stats = WeatherAnalytics.get_query_stats()
        popular_cities = WeatherAnalytics.get_popular_cities()

        return jsonify({
            'stats': stats,
            'popular_cities': popular_cities
        })

    @app.route('/popular_cities', methods=['GET'])
    def get_popular_cities():
        """Get most popular cities"""
        limit = request.args.get('limit', 10, type=int)
        limit = min(limit, 50)  # Cap at 50
        cities = WeatherAnalytics.get_popular_cities(limit)
        return jsonify(cities)

    @app.route('/favorites', methods=['GET', 'POST', 'DELETE'])
    def manage_favorites():
        """Manage user favorites (in-memory tracking)"""
        user_ip = get_user_ip()

        if request.method == 'GET':
            favorites = FavoritesService.get_user_favorites(user_ip)
            return jsonify(favorites)

        elif request.method == 'POST':
            data = request.get_json()
            if not data or 'city' not in data:
                return jsonify({'error': 'By er påkrevd'}), 400

            city = data['city'].strip()
            country = data.get('country', 'NO').strip()

            valid_city, city_error = validate_city_name(city)
            if not valid_city:
                return jsonify({'error': city_error}), 400

            success = FavoritesService.add_favorite(user_ip, city, country)
            if success:
                return jsonify({'message': 'Favoritt lagt til'})
            else:
                return jsonify({'error': 'Favoritt eksisterer allerede'}), 409

        elif request.method == 'DELETE':
            data = request.get_json()
            if not data or 'city' not in data:
                return jsonify({'error': 'By er påkrevd'}), 400

            city = data['city'].strip()
            country = data.get('country', 'NO').strip()

            success = FavoritesService.remove_favorite(user_ip, city, country)
            if success:
                return jsonify({'message': 'Favoritt fjernet'})
            else:
                return jsonify({'error': 'Favoritt ikke funnet'}), 404

    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint for monitoring"""
        # Clean up expired cache entries
        expired_count = DatabaseCache.clear_expired()

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.2.0',
            'mode': 'in-memory',
            'cache_cleaned': expired_count
        })

    @app.route('/clear_cache', methods=['POST'])
    def clear_cache():
        """Clear all cache entries"""
        try:
            # Clear in-memory cache
            from models import weather_cache, analytics, favorites
            cache_count = weather_cache.clear()

            # Clear Flask cache
            cache.clear()

            logger.info("Alle cacher tømt")
            return jsonify({
                'message': 'Alle cacher tømt',
                'cleared_entries': cache_count
            })
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return jsonify({'error': 'Kunne ikke tømme cache'}), 500

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endepunkt ikke funnet'}), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Ugyldig forespørsel'}), 400

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({'error': 'Intern serverfeil'}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
        return jsonify({'error': 'En uventet feil oppstod. Vennligst prøv igjen senere.'}), 500

    return app


config_name = os.environ.get('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    # Development server
    app.run(
        debug=app.config['DEBUG'],
        host='127.0.0.1',
        port=5000
    )
