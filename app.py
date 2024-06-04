from flask import Flask, render_template, request, jsonify
import requests
import os

app = Flask(__name__)
API_KEY = os.getenv('API_KEY')
BASE_URL = 'https://api.openweathermap.org/data/2.5/'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    country = request.args.get('country', 'NO')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400

    response = requests.get(f'{BASE_URL}weather?q={city},{country}&appid={API_KEY}')
    data = response.json()

    if data.get('cod') != 200:
        return jsonify({'error': data.get('message', 'Error fetching weather data')}), 400

    return jsonify(data)

@app.route('/weather_by_coords', methods=['GET'])
def get_weather_by_coords():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Latitude and Longitude parameters are required'}), 400

    response = requests.get(f'{BASE_URL}weather?lat={lat}&lon={lon}&appid={API_KEY}')
    data = response.json()

    if data.get('cod') != 200:
        return jsonify({'error': data.get('message', 'Error fetching weather data')}), 400

    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
