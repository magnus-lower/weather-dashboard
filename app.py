from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)
API_KEY = 'b40f58d271f8c91caba8162e6f87689d'
BASE_URL = 'https://api.openweathermap.org/data/2.5/'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if city:
        response = requests.get(f'{BASE_URL}weather?q={city}&appid={API_KEY}')
        data = response.json()
        return jsonify(data)
    return jsonify({'error': 'City parameter is required'}), 400

if __name__ == '__main__':
    app.run(debug=True)
