// main.js - Main application file
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the application
    WeatherApp.init();
});

// Main Weather Application Object
const WeatherApp = {
    // Application state
    state: {
        lastLat: null,
        lastLon: null,
        lastCity: null,
        lastCountry: null
    },

    // Initialize the application
    init() {
        console.log('Initializing Weather Dashboard...');

        // Load and initialize modules
        Favorites.init();
        LocationService.init();
        WeatherDisplay.init();
        CitySearch.init();

        // Set up main event listeners
        this.setupEventListeners();

        // Try to get weather for current location
        LocationService.fetchWeatherByLocation();
    },

    // Set up main application event listeners
    setupEventListeners() {
        // City input enter key
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchWeatherForInputCity();
            }
        });

        // Get weather button (if it exists)
        const getWeatherBtn = document.getElementById('getWeatherBtn');
        if (getWeatherBtn) {
            getWeatherBtn.addEventListener('click', () => {
                this.fetchWeatherForInputCity();
            });
        }
    },

    // Fetch weather for city in input field
    fetchWeatherForInputCity() {
        const city = document.getElementById('cityInput').value.trim();

        if (!city) {
            alert('Vennligst skriv inn et bynavn.');
            return;
        }

        console.log('Fetching weather for city:', city);

        // Update state
        this.state.lastCity = city;

        // Parse city and country
        const parts = city.split(',');
        const cityName = parts[0].trim();
        let country = 'NO'; // Default to Norway

        if (parts.length > 1) {
            country = parts[parts.length - 1].trim();
        }

        // Fetch current weather and forecast
        WeatherAPI.fetchWeatherData('/weather', { city: cityName, unit: 'metric' });
        ForecastService.fetchForecast(cityName, country);
    },

    // Update application state
    updateState(newState) {
        Object.assign(this.state, newState);
    },

    // Get current application state
    getState() {
        return this.state;
    }
};