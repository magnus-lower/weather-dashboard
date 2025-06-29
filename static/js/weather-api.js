// weather-api.js - Handles all weather API calls
const WeatherAPI = {
    // OpenWeatherMap API key (should be moved to backend)
    API_KEY: 'b40f58d271f8c91caba8162e6f87689d',

    // Fetch weather data from Flask backend
    fetchWeatherData(endpoint, queryParams) {
        const queryString = new URLSearchParams(queryParams).toString();
        UIUtils.showLoadingSpinner();

        fetch(`${endpoint}?${queryString}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                UIUtils.hideLoadingSpinner();
                if (data.error) {
                    WeatherDisplay.clearWeatherData();
                    alert(data.error);
                } else {
                    WeatherDisplay.displayWeatherData(data);
                }
            })
            .catch(error => {
                UIUtils.hideLoadingSpinner();
                WeatherDisplay.clearWeatherData();
                alert('There was an error fetching the weather data. Please try again later.');
                console.error(error);
            });
    },

    // Reverse geocode coordinates to get city name
    reverseGeocode(lat, lon, unit) {
        const endpoint = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.API_KEY}`;

        return fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.length > 0) {
                    const city = data[0].name;
                    const country = data[0].country;

                    console.log(`Reverse Geocoded City: ${city}, Country: ${country}`);

                    // Update app state
                    WeatherApp.updateState({
                        lastCity: city,
                        lastCountry: country
                    });

                    // Update input field
                    document.getElementById('cityInput').value = `${city}, ${country}`;

                    // Fetch weather using the city name
                    this.fetchWeatherData('/weather', { city, country, unit });

                    // Also fetch forecast
                    ForecastService.fetchForecast(city, country);
                } else {
                    console.error("Reverse geocoding failed. No results found.");
                    UIUtils.hideLoadingSpinner();
                    alert('Could not determine your location. Please enter a city name.');
                }
            })
            .catch(error => {
                console.error("Error in reverse geocoding:", error);
                UIUtils.hideLoadingSpinner();
                alert('Error determining your location. Please enter a city name.');
            });
    },

    // Fetch city suggestions for autocomplete
    fetchCitySuggestions(query) {
        // Sanitize input
        query = query.replace(/[^\w\s,-]/gi, '').trim();

        if (!query) return Promise.resolve([]);

        const endpoint = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${this.API_KEY}`;

        // Add request throttling
        if (this.lastRequestTime && Date.now() - this.lastRequestTime < 500) {
            clearTimeout(this.throttleTimeout);
            return new Promise((resolve) => {
                this.throttleTimeout = setTimeout(() => {
                    this.fetchCitySuggestions(query).then(resolve);
                }, 500);
            });
        }
        this.lastRequestTime = Date.now();

        return fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch city suggestions');
                }
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching city suggestions:', error);
                return [];
            });
    }
};