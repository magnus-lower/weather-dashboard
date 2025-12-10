# Weather Dashboard

A weather dashboard app I built using Flask and JavaScript that shows current weather and forecasts for cities around the world.

## What it does

- Shows real-time weather for any city in the world
- Automatically detects your location for local weather
- 5-day forecast with hourly details
- Search for cities with smart autocomplete
- Save your favorite cities for quick access
- Keeps track of your recent searches
- Shows UV index information
- Cool animated backgrounds that change with the weather
- Works great on both desktop and mobile
- Fast loading thanks to smart caching
- Good error handling so it won't crash on you

## Tech Stack

### Backend (Server-side)
- **Flask** - The main Python web framework I used
- **Flask-Caching** - For making things load faster
- **Requests** - To get data from weather APIs
- **Gunicorn** - Production web server

### Frontend (What users see)
- **JavaScript** - Plain vanilla JS, no fancy frameworks
- **HTML5** - Modern HTML structure
- **CSS3** - Styling with animations
- **Font Awesome** - Nice looking icons

### External APIs
- **OpenWeatherMap API** - Where I get all the weather data
- **OpenWeatherMap Geocoding API** - For location stuff

## Project Structure

```
weather-dashboard/
├── app/
│   ├── __init__.py               # Application factory
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health_routes.py      # Health and maintenance endpoints
│   │   └── weather_routes.py     # Weather-related endpoints
│   ├── config.py                 # Configuration settings
│   ├── core/
│   │   ├── __init__.py
│   │   └── cache/
│   │       ├── __init__.py
│   │       └── memory_cache.py   # In-memory data structures
│   ├── db/
│   │   └── __init__.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── weather/
│   │       ├── __init__.py
│   │       └── service.py        # Business logic and API services
│   └── utils/
│       └── __init__.py           # Utility functions
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Container configuration
├── fly.toml                      # Fly.io deployment config
├── templates/
│   └── index.html                # Main HTML template
├── static/
│   ├── styles.css                # Main stylesheet
│   └── js/
│       ├── main.js               # Application initialization
│       ├── weather-api.js        # API communication
│       ├── weather-display.js    # Weather data presentation
│       ├── city-search.js        # Search functionality
│       ├── location-service.js   # Geolocation services
│       ├── favorites.js          # Favorites management
│       ├── ui-utils.js           # UI utilities
│       └── weather-translations.js # Weather condition translations
└── tests/
    └── test_placeholder.py       # Placeholder tests
```

## How to Set It Up

### What you'll need first
- Python 3.8 or newer
- An API key from OpenWeatherMap (it's free - just sign up at [openweathermap.org](https://openweathermap.org/api))

### Running it locally

1. **Get the code**
   ```bash
   git clone <repository-url>
   cd weather-dashboard
   ```

2. **Set up a virtual environment** (this keeps things clean)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install the required packages**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create your environment file**
   Make a `.env` file in the main folder and add:
   ```env
   API_KEY=your_openweathermap_api_key_here
   SECRET_KEY=your_secret_key_here
   FLASK_CONFIG=development
   LOG_LEVEL=INFO
   ```

5. **Start it up**
   ```bash
   python -m app
   ```

   Open your browser and go to `http://localhost:5000`

### Using Docker (if you want to)

1. **Build it**
   ```bash
   docker build -t weather-dashboard .
   ```

2. **Run it**
   ```bash
   docker run -p 8080:8080 -e API_KEY=your_api_key weather-dashboard
   ```

## Settings

I set up three different modes:

- **Development** (`development`) - Has debug mode on and lots of logging
- **Testing** (`testing`) - For running tests
- **Production** (`production`) - Optimized for when it's live

You can switch between them using the `FLASK_CONFIG` environment variable.

## API Routes (for developers)

### Getting Weather Data
- `GET /weather` - Get current weather by city name
- `GET /weather_by_coords` - Get weather using GPS coordinates
- `GET /forecast` - Get 5-day forecast

### Location Stuff
- `GET /city_suggestions` - Get city suggestions when typing
- `GET /reverse_geocode` - Turn coordinates into city names

### User Features
- `GET/POST/DELETE /favorites` - Handle favorite cities
- `GET /analytics` - See what cities people search for most
- `GET /popular_cities` - Get the most popular cities

### System Stuff
- `GET /health` - Check if everything is working
- `POST /clear_cache` - Clear the cache when needed

## How I Built This

### Backend Structure
I tried to keep everything organized and easy to understand:

- **app.py** - Main Flask app with all the routes
- **services.py** - The business logic and API calls to OpenWeatherMap
- **models.py** - Simple in-memory storage for caching and stats
- **utils.py** - Helper functions for validation and formatting
- **config.py** - Different settings for dev/test/production

### Frontend Structure
The JavaScript is split into modules so it's not one giant mess:

- **Modular Design** - Each feature has its own file
- **Event-Driven** - Different parts talk to each other through events
- **Mobile Friendly** - Works on phones and tablets too
- **Works Everywhere** - Falls back gracefully on older browsers

### How Data Flows Through the App
1. User types something or clicks a button
2. JavaScript handles the input and validates it
3. Makes a request to my Flask backend
4. Backend checks the cache first, then calls OpenWeatherMap if needed
5. Data gets cached for next time
6. Sends the weather data back to the frontend
7. JavaScript updates what the user sees

## Performance Tricks I Used

- **Smart Caching** - Weather data gets saved so I don't have to ask the API every time
- **Request Throttling** - Limits how often city suggestions are fetched to avoid spamming the API
- **Browser Caching** - Search suggestions get saved in your browser
- **Background Loading** - Some stuff loads in the background so it feels faster
- **Optimized Files** - CSS and JS files are compressed and versioned

## Security Stuff

- **Input Validation** - Everything users type gets checked and cleaned
- **Rate Limiting** - Prevents people from abusing the API
- **Good Error Handling** - Errors don't crash the app or leak info
- **HTTPS** - Encrypted connections in production
- **XSS Protection** - Prevents malicious scripts from running

## Browser Compatibility

Works on:
- Chrome 70 and newer
- Firefox 65 and newer  
- Safari 12 and newer
- Edge 79 and newer

## Want to Contribute?

Feel free to help make this better! Here's how:

1. Fork this repo
2. Create a new branch (`git checkout -b cool-new-feature`)
3. Make your changes and commit them (`git commit -m 'Added something cool'`)
4. Push to your branch (`git push origin cool-new-feature`)
5. Open a Pull Request

## License

This project uses the MIT License. Check the LICENSE file for the boring legal stuff.

## Credits

- Weather data comes from [OpenWeatherMap](https://openweathermap.org/)
- Icons are from [Font Awesome](https://fontawesome.com/)
- Hosted on [Fly.io](https://fly.io/)
