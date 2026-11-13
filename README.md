# Weather Dashboard

A weather application built with Flask and JavaScript. It shows current weather conditions and forecasts for cities around the world.

**Live demo:** [Weather Dashboard](https://weather-dashboard-still-leaf-2476.fly.dev/)

## Features

- Search for cities around the world
- View current weather and 5-day forecasts
- Use your current location
- Save favorite cities
- Animated backgrounds based on weather conditions
- Responsive design for desktop and mobile

## Technologies

Python, Flask, JavaScript, HTML, CSS, OpenWeatherMap API, Docker

## Run locally

Requires Python 3.12+ and an OpenWeatherMap API key.

```bash
python -m venv venv
pip install -r requirements.txt
```

Activate the virtual environment and create a `.env` file:

```env
API_KEY=your_api_key
```

Start the application:

```bash
python app.py
```

Open http://localhost:5000.

## Tests

```bash
python -m pytest
node --test
```

The JavaScript tests require Node.js 24.

The application is deployed on Fly.io.
