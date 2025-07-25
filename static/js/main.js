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
        LocationService.init(); // Dette vil nå automatisk prøve å få lokasjon
        WeatherDisplay.init();
        CitySearch.init();

        // Set up main event listeners
        this.setupEventListeners();

        // Ikke kall LocationService.fetchWeatherByLocation() her - det gjøres i LocationService.init()
    },

    // Set up main application event listeners
    setupEventListeners() {
        // City input enter key - henter automatisk værdata når du trykker Enter
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchWeatherForInputCity();
            }
        });

        // Location button
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => {
                console.log('Location button clicked');
                LocationService.fetchWeatherByLocation();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Load saved theme
        this.loadSavedTheme();
    },

    // Toggle between light and dark theme
    toggleTheme() {
        const body = document.body;
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            localStorage.setItem('theme', 'dark');
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            localStorage.setItem('theme', 'light');
        }
    },

    // Load saved theme from localStorage
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.remove('dark-mode');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
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
    }
};