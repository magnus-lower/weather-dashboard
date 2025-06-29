// weather-api.js - Handles all weather API calls (refactored to use backend)
const WeatherAPI = {
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
                alert('Det oppstod en feil ved henting av værdata. Vennligst prøv igjen senere.');
                console.error(error);
            });
    },

    // Reverse geocode coordinates to get city name
    reverseGeocode(lat, lon, unit) {
        return fetch(`/reverse_geocode?lat=${lat}&lon=${lon}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error("Reverse geocoding failed:", data.error);
                    UIUtils.hideLoadingSpinner();
                    alert('Kunne ikke bestemme din lokasjon. Vennligst skriv inn et bynavn.');
                    return;
                }

                const city = data.name;
                const country = data.country;

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
            })
            .catch(error => {
                console.error("Error in reverse geocoding:", error);
                UIUtils.hideLoadingSpinner();
                alert('Feil ved bestemmelse av lokasjon. Vennligst skriv inn et bynavn.');
            });
    },

    // Fetch city suggestions for autocomplete
    fetchCitySuggestions(query) {
        if (!query || query.length < 2) {
            return Promise.resolve([]);
        }

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

        return fetch(`/city_suggestions?q=${encodeURIComponent(query)}`)
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