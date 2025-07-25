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
    async init() {
        console.log('Initializing Weather Dashboard...');

        // Initialize language and settings first
        const { initLanguageSwitcher } = await import('./language.js');
        const { initSettingsPanel } = await import('./settings-panel.js');
        
        initLanguageSwitcher();
        initSettingsPanel();

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

        // Load saved theme (removed individual theme toggle since it's now in settings panel)
        this.loadSavedTheme();
    },

    // Load saved theme from localStorage (simplified since dark mode is handled in settings-panel)
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark-mode');
        }
    },

    // Fetch weather for city in input field
    fetchWeatherForInputCity() {
        const city = document.getElementById('cityInput').value.trim();

        if (!city) {
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no' ? 'Vennligst skriv inn et bynavn.' : 'Please enter a city name.';
            alert(message);
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