from datetime import datetime

from flask import Flask, render_template, request, jsonify
import requests
from flask_caching import Cache
from dotenv import load_dotenv
import logging
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure caching (in-memory cache)
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Cache timeout in seconds (5 minutes)
cache = Cache(app)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API Key and Base URL
API_KEY = os.getenv('API_KEY')
if not API_KEY:
    logger.critical("API_KEY missing from environment variables")
    raise ValueError("API_KEY is missing. Please set it in your .env file.")
BASE_URL = 'https://api.openweathermap.org/data/2.5/'


# Utility function to fetch and validate weather data
def fetch_weather_data(url):
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()  # Raise exception for HTTP errors
        return response.json()
    except requests.exceptions.Timeout:
        logger.error("Request timed out")
        return {'error': 'The request timed out. Please try again later.'}
    except requests.exceptions.RequestException as e:
        logger.error(f"Network Error: {str(e)}")
        return {'error': 'A network error occurred. Please check your connection and try again.'}
    except requests.exceptions.JSONDecodeError:
        logger.error("Invalid JSON response")
        return {'error': 'Invalid response format from the weather API.'}


# Utility function for custom cache key
def make_cache_key(*args, **kwargs):
    """
    Generates a unique cache key based on route arguments and query parameters.
    """
    # Add timestamp-based expiration for rapidly changing weather
    current_hour = datetime.now().hour
    return f"{str(request.args)}:{current_hour}"


# Home route
@app.route('/')
def home():
    return render_template('index.html')


# Route to get current weather by city (with smarter caching)
@app.route('/weather', methods=['GET'])
@cache.cached(timeout=300, key_prefix=make_cache_key)  # Custom cache key
def get_weather():
    city = request.args.get('city')
    country = request.args.get('country', 'NO')  # Default country to Norway
    unit = request.args.get('unit', 'metric')  # Default to metric units

    if not city:
        logger.warning("City parameter is missing in request.")
        return jsonify({'error': 'City parameter is required'}), 400

    url = f'{BASE_URL}weather?q={city},{country}&units={unit}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)


# Route to get weather by coordinates (with smarter caching)
@app.route('/weather_by_coords', methods=['GET'])
@cache.cached(timeout=300, key_prefix=make_cache_key)  # Custom cache key
def get_weather_by_coords():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    unit = request.args.get('unit', 'metric')  # Default to metric units

    if not lat or not lon:
        logger.warning("Latitude or Longitude parameter is missing in request.")
        return jsonify({'error': 'Latitude and Longitude parameters are required'}), 400

    url = f'{BASE_URL}weather?lat={lat}&lon={lon}&units={unit}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)


# Route to clear the cache programmatically (optional, for development)
@app.route('/clear_cache', methods=['POST'])
def clear_cache():
    """
    Clears the cache for all routes. Useful for testing or development.
    """
    cache.clear()
    logger.info("Cache cleared successfully.")
    return jsonify({'message': 'Cache cleared successfully.'})


# Error handler for uncaught exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
    return jsonify({'error': 'An unexpected error occurred. Please try again later.'}), 500


if __name__ == '__main__':
    app.run(debug=True)
