document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('loading');

    WeatherApp.init();
});

const WeatherApp = {
    state: {
        lastLat: null,
        lastLon: null,
        lastCity: null,
        lastCountry: null,
        isInitialLoad: true
    },

    async init() {
        console.log('Initializing Weather Dashboard...');

        Favorites.init();
        LocationService.init();
        WeatherDisplay.init();
        CitySearch.init();

        this.setupEventListeners();

        setTimeout(() => {
            const cityInput = document.getElementById('cityInput');
            if (cityInput && window.CitySearch && window.CitySearch.positionClearButton) {
                window.CitySearch.positionClearButton(cityInput);
            }
        }, 2000);

        setTimeout(() => {
            this.hideInitialLoader();
        }, 10000);

    },

    setupEventListeners() {
        const headerTitle = document.querySelector('.header h1');
        if (headerTitle) {
            headerTitle.addEventListener('click', () => {
                console.log('Header title clicked - refreshing page');
                window.location.reload();
            });
        }

        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchWeatherForInputCity();
            }
        });

        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', (e) => {
                console.log('Location button clicked');
                e.target.blur();
                LocationService.fetchWeatherByLocation();
            });
        }

    },

    fetchWeatherForInputCity() {
        const city = document.getElementById('cityInput').value.trim();

        if (!city) {
            alert('Vennligst skriv inn et bynavn.');
            return;
        }

        console.log('Fetching weather for city:', city);

        this.state.lastCity = city;

        const parts = city.split(',');
        const cityName = parts[0].trim();
        let country = 'NO';

        if (parts.length > 1) {
            country = parts[parts.length - 1].trim();
        }

        WeatherAPI.fetchWeatherData('/weather', { city: cityName, unit: 'metric' });
    },

    updateState(newState) {
        Object.assign(this.state, newState);
    },

    getState() {
        return this.state;
    },

    hideInitialLoader() {
        if (this.state.isInitialLoad) {
            console.log('Hiding initial loader...');
            const initialLoader = document.getElementById('initialLoader');
            const body = document.body;

            if (initialLoader) {
                initialLoader.classList.add('hidden');

                body.classList.remove('loading');

                setTimeout(() => {
                    if (initialLoader.parentNode) {
                        initialLoader.parentNode.removeChild(initialLoader);
                    }
                }, 800);
            }

            this.state.isInitialLoad = false;
        }
    }
};
