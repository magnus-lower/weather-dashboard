from flask import Flask, render_template, request, jsonify
import requests
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

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
    if city:
        response = requests.get(f'{BASE_URL}weather?q={city},{country}&appid={API_KEY}')
        data = response.json()
        return jsonify(data)
    return jsonify({'error': 'City parameter is required'}), 400

@app.route('/forecast', methods=['GET'])
def get_forecast():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if lat and lon:
        response = requests.get(f'{BASE_URL}onecall?lat={lat}&lon={lon}&exclude=current,minutely,hourly,alerts&appid={API_KEY}')
        data = response.json()
        return jsonify(data)
    return jsonify({'error': 'Latitude and Longitude parameters are required'}), 400

if __name__ == '__main__':
    app.run(debug=True)
