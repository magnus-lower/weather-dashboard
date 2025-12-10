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
                    // Stille feil - ikke vis alert, bare logg
                    return;
                }

                const city = data.city || data.name;
                const country = data.country;

                console.log(`Reverse Geocoded City: ${city}, Country: ${country}`);

                // Update app state
                WeatherApp.updateState({
                    lastCity: city,
                    lastCountry: country
                });

                // Update input field
                const cityInputElement = document.getElementById('cityInput');
                cityInputElement.value = `${city}, ${country}`;
                
                // Update clear button position
                if (window.CitySearch && window.CitySearch.positionClearButton) {
                    window.CitySearch.positionClearButton(cityInputElement);
                }

                // Fetch weather using coordinates directly for better accuracy
                this.fetchWeatherData('/weather_by_coords', { lat, lon, unit });
            })
            .catch(error => {
                console.error("Error in reverse geocoding:", error);
                UIUtils.hideLoadingSpinner();
                // Stille feil - bruker kan manuelt skrive inn bynavn
            });
    },

    // Fetch city suggestions for autocomplete with improved caching and deduplication
    fetchCitySuggestions(query) {
        if (!query || query.length < 2) {
            return Promise.resolve([]);
        }

        // Enhanced request throttling and caching with better cache keys
        const normalizedQuery = query.toLowerCase().trim();
        const cacheKey = `suggestions_${normalizedQuery}`;
        
        // Check cache first (suggestions are cached for 10 minutes for better performance)
        if (this.suggestionCache && this.suggestionCache[cacheKey]) {
            const cachedData = this.suggestionCache[cacheKey];
            if (Date.now() - cachedData.timestamp < 600000) { // 10 minutes
                return Promise.resolve(cachedData.data);
            }
        }

        // Initialize cache if not exists
        if (!this.suggestionCache) {
            this.suggestionCache = {};
        }

        // More aggressive request throttling for better results
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
            .then(data => {
                // Additional client-side deduplication and filtering
                const filteredData = this.filterAndDeduplicateSuggestions(data, normalizedQuery);
                
                // Cache the filtered results
                this.suggestionCache[cacheKey] = {
                    data: filteredData,
                    timestamp: Date.now()
                };
                
                // Clean old cache entries more aggressively (keep only last 15 searches)
                const cacheKeys = Object.keys(this.suggestionCache);
                if (cacheKeys.length > 15) {
                    const sortedKeys = cacheKeys.sort((a, b) => 
                        this.suggestionCache[a].timestamp - this.suggestionCache[b].timestamp
                    );
                    // Remove oldest entries
                    for (let i = 0; i < cacheKeys.length - 15; i++) {
                        delete this.suggestionCache[sortedKeys[i]];
                    }
                }
                
                return filteredData;
            })
            .catch(error => {
                console.error('Error fetching city suggestions:', error);
                return [];
            });
    },

    // Client-side filtering and deduplication
    filterAndDeduplicateSuggestions(suggestions, query) {
        if (!suggestions || suggestions.length === 0) return [];

        const seen = new Set();
        const filtered = [];
        const maxPerCountry = 2; // Limit similar results per country
        const countryCount = {};

        // Sort suggestions by relevance on client side as well
        suggestions.sort((a, b) => {
            // Exact matches first
            const aExact = a.name.toLowerCase().startsWith(query);
            const bExact = b.name.toLowerCase().startsWith(query);
            if (aExact !== bExact) return bExact - aExact;

            // Norwegian cities prioritized
            if (a.country === 'NO' && b.country !== 'NO') return -1;
            if (b.country === 'NO' && a.country !== 'NO') return 1;

            // Population (if available)
            const aPop = a.population || 0;
            const bPop = b.population || 0;
            if (aPop !== bPop) return bPop - aPop;

            // Shorter names
            return a.name.length - b.name.length;
        });

        for (const suggestion of suggestions) {
            const key = `${suggestion.name.toLowerCase()}_${suggestion.country}_${suggestion.state || ''}`;
            const country = suggestion.country;

            // Skip exact duplicates
            if (seen.has(key)) continue;

            // Limit results per country to ensure diversity
            if (countryCount[country] >= maxPerCountry) continue;

            seen.add(key);
            countryCount[country] = (countryCount[country] || 0) + 1;
            filtered.push(suggestion);

            // Limit total results
            if (filtered.length >= 8) break;
        }

        return filtered;
    }
};