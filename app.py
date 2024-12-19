from flask import Flask, render_template, request, jsonify
import requests
import os
from flask_caching import Cache

app = Flask(__name__)

# Configure cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

API_KEY = os.getenv('API_KEY')
BASE_URL = 'https://api.openweathermap.org/data/2.5/'


def fetch_weather_data(url):
    response = requests.get(url)
    data = response.json()
    if response.status_code != 200:
        return {'error': data.get('message', 'Error fetching weather data')}
    return data


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/weather', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache for 5 minutes
def get_weather():
    city = request.args.get('city')
    country = request.args.get('country', 'NO')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400

    url = f'{BASE_URL}weather?q={city},{country}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)


@app.route('/weather_by_coords', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache for 5 minutes
def get_weather_by_coords():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Latitude and Longitude parameters are required'}), 400

    url = f'{BASE_URL}weather?lat={lat}&lon={lon}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True)
