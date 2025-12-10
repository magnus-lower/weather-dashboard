const WeatherAPI = {
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
                    return;
                }

                const city = data.city || data.name;
                const country = data.country;

                console.log(`Reverse Geocoded City: ${city}, Country: ${country}`);

                WeatherApp.updateState({
                    lastCity: city,
                    lastCountry: country
                });

                const cityInputElement = document.getElementById('cityInput');
                cityInputElement.value = `${city}, ${country}`;

                if (window.CitySearch && window.CitySearch.positionClearButton) {
                    window.CitySearch.positionClearButton(cityInputElement);
                }

                this.fetchWeatherData('/weather_by_coords', { lat, lon, unit });
            })
            .catch(error => {
                console.error("Error in reverse geocoding:", error);
                UIUtils.hideLoadingSpinner();
            });
    },

    fetchCitySuggestions(query) {
        if (!query || query.length < 2) {
            return Promise.resolve([]);
        }

        const normalizedQuery = query.toLowerCase().trim();
        const cacheKey = `suggestions_${normalizedQuery}`;

        if (this.suggestionCache && this.suggestionCache[cacheKey]) {
            const cachedData = this.suggestionCache[cacheKey];
            if (Date.now() - cachedData.timestamp < 600000) {
                return Promise.resolve(cachedData.data);
            }
        }

        if (!this.suggestionCache) {
            this.suggestionCache = {};
        }

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
                const filteredData = this.filterAndDeduplicateSuggestions(data, normalizedQuery);

                this.suggestionCache[cacheKey] = {
                    data: filteredData,
                    timestamp: Date.now()
                };

                const cacheKeys = Object.keys(this.suggestionCache);
                if (cacheKeys.length > 15) {
                    const sortedKeys = cacheKeys.sort((a, b) =>
                        this.suggestionCache[a].timestamp - this.suggestionCache[b].timestamp
                    );
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

    filterAndDeduplicateSuggestions(suggestions, query) {
        if (!suggestions || suggestions.length === 0) return [];

        const seen = new Set();
        const filtered = [];
        const maxPerCountry = 2;
        const countryCount = {};

        suggestions.sort((a, b) => {
            const aExact = a.name.toLowerCase().startsWith(query);
            const bExact = b.name.toLowerCase().startsWith(query);
            if (aExact !== bExact) return bExact - aExact;

            if (a.country === 'NO' && b.country !== 'NO') return -1;
            if (b.country === 'NO' && a.country !== 'NO') return 1;

            const aPop = a.population || 0;
            const bPop = b.population || 0;
            if (aPop !== bPop) return bPop - aPop;

            return a.name.length - b.name.length;
        });

        for (const suggestion of suggestions) {
            const key = `${suggestion.name.toLowerCase()}_${suggestion.country}_${suggestion.state || ''}`;
            const country = suggestion.country;

            if (seen.has(key)) continue;

            if (countryCount[country] >= maxPerCountry) continue;

            seen.add(key);
            countryCount[country] = (countryCount[country] || 0) + 1;
            filtered.push(suggestion);

            if (filtered.length >= 8) break;
        }

        return filtered;
    }
};
