from flask import Flask, render_template, request, jsonify
import requests
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Retrieve API key from environment variables
API_KEY = os.getenv('API_KEY')
BASE_URL = 'https://api.openweathermap.org/data/2.5/'

# Function to fetch weather data
def fetch_weather_data(url):
    try:
        response = requests.get(url, timeout=5)  # Add a timeout for network requests
        data = response.json()
        if response.status_code != 200:
            return {'error': data.get('message', 'Error fetching weather data')}
        return data
    except requests.exceptions.RequestException as e:
        return {'error': f'Network error: {str(e)}'}

# Route for the home page
@app.route('/')
def home():
    return render_template('index.html')

# Route to get current weather by city
@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    country = request.args.get('country', 'NO')  # Default country to Norway (NO)
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400

    url = f'{BASE_URL}weather?q={city},{country}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)

# Route to get weather by coordinates
@app.route('/weather_by_coords', methods=['GET'])
def get_weather_by_coords():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Latitude and Longitude parameters are required'}), 400

    url = f'{BASE_URL}weather?lat={lat}&lon={lon}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)

# Route to get 5-day weather forecast
@app.route('/forecast', methods=['GET'])
def get_forecast():
    city = request.args.get('city')
    country = request.args.get('country', 'NO')  # Default country to Norway (NO)
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400

    url = f'{BASE_URL}forecast?q={city},{country}&appid={API_KEY}'
    data = fetch_weather_data(url)
    return jsonify(data)

# Main entry point
if __name__ == '__main__':
    app.run(debug=True)