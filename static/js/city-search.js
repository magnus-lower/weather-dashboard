// city-search.js - Handles city search and autocomplete functionality
const CitySearch = {
    init() {
        console.log('City Search module initialized');
        this.setupEventListeners();
    },

    // Set up event listeners for city search
    setupEventListeners() {
        document.getElementById('cityInput').addEventListener('input',
            UIUtils.debounce((event) => this.handleCityInput(event), 300)
        );
    },

    // Handle city input for autocomplete
    handleCityInput(event) {
        const query = event.target.value.trim();
        if (query) {
            this.fetchAndDisplaySuggestions(query);
        } else {
            this.clearCitySuggestions();
        }
    },

    // Fetch and display city suggestions
    async fetchAndDisplaySuggestions(query) {
        try {
            const cities = await WeatherAPI.fetchCitySuggestions(query);
            this.displayCitySuggestions(cities, query);
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
        }
    },

    // Display city suggestions in dropdown
    displayCitySuggestions(cities, query) {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = ''; // Clear previous suggestions

        if (cities.length > 0) {
            cities.forEach(city => {
                const state = city.state ? `, ${city.state}` : '';
                const cityName = `${city.name}${state}, ${city.country}`;

                const li = document.createElement('li');
                li.textContent = cityName;
                li.style.cursor = 'pointer';

                // Star icon for favorites
                const star = document.createElement('span');
                star.innerHTML = '&#9733;'; // Star character
                star.style.cursor = 'pointer';
                star.style.marginLeft = '10px';
                star.title = 'Add to Favorites';
                star.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent clicking suggestion
                    Favorites.addToFavorites(city);
                });

                li.appendChild(star);

                // Auto-fetch weather on selection
                li.addEventListener('click', () => {
                    document.getElementById('cityInput').value = cityName;
                    suggestionsList.innerHTML = ''; // Hide suggestions
                    this.selectCity(cityName);
                });

                suggestionsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = `No matching cities found for "${query}"`;
            suggestionsList.appendChild(li);
        }
    },

    // Handle city selection from suggestions
    selectCity(cityName) {
        console.log('Selected city:', cityName);

        // Extract city and country
        const cityParts = cityName.split(', ');
        const city = cityParts.slice(0, cityParts.length - 1).join(', ');
        const country = cityParts[cityParts.length - 1];

        // Fetch weather data
        WeatherAPI.fetchWeatherData('/weather', { city, country, unit: 'metric' });

        // Also fetch forecast
        ForecastService.fetchForecast(city, country);
    },

    // Clear city suggestions dropdown
    clearCitySuggestions() {
        document.getElementById('citySuggestions').innerHTML = '';
    }
};