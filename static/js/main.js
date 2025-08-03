// main.js - Main application file
document.addEventListener('DOMContentLoaded', function () {
    // Set loading state
    document.body.classList.add('loading');
    
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
        lastCountry: null,
        isInitialLoad: true
    },

    // Initialize the application
    async init() {
        console.log('Initializing Weather Dashboard...');

        // Load and initialize modules
        Favorites.init();
        LocationService.init(); // Dette vil nå automatisk prøve å få lokasjon
        WeatherDisplay.init();
        CitySearch.init();

        // Set up main event listeners
        this.setupEventListeners();

        // Fallback: Hide loader after 10 seconds no matter what
        setTimeout(() => {
            this.hideInitialLoader();
        }, 10000);

        // Ikke kall LocationService.fetchWeatherByLocation() her - det gjøres i LocationService.init()
    },

    // Set up main application event listeners
    setupEventListeners() {
        // Make header title clickable to refresh page
        const headerTitle = document.querySelector('.header h1');
        if (headerTitle) {
            headerTitle.addEventListener('click', () => {
                console.log('Header title clicked - refreshing page');
                window.location.reload();
            });
        }

        // City input enter key - henter automatisk værdata når du trykker Enter
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchWeatherForInputCity();
            }
        });

        // Location button
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', (e) => {
                console.log('Location button clicked');
                e.target.blur(); // Remove focus highlight after click
                LocationService.fetchWeatherByLocation();
            });
        }

        // Load saved theme (removed theme toggle since settings are removed)
        // No longer using dark mode
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

        // Fetch current weather
        WeatherAPI.fetchWeatherData('/weather', { city: cityName, unit: 'metric' });
    },

    // Update application state
    updateState(newState) {
        Object.assign(this.state, newState);
    },

    // Get current application state
    getState() {
        return this.state;
    },

    // Hide initial loader after first weather data is loaded
    hideInitialLoader() {
        if (this.state.isInitialLoad) {
            console.log('Hiding initial loader...');
            const initialLoader = document.getElementById('initialLoader');
            const body = document.body;
            
            if (initialLoader) {
                // Add hidden class for smooth transition
                initialLoader.classList.add('hidden');
                
                // Remove loading class from body
                body.classList.remove('loading');
                
                // Remove loader from DOM after transition
                setTimeout(() => {
                    if (initialLoader.parentNode) {
                        initialLoader.parentNode.removeChild(initialLoader);
                    }
                }, 800); // Match CSS transition duration
            }
            
            // Mark as no longer initial load
            this.state.isInitialLoad = false;
        }
    }
};