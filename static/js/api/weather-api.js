import { UIUtils } from '../core/ui-utils.js';
import { WeatherDisplay } from '../ui/weather-display.js';

export const WeatherAPI = {
    async fetchWeatherData(endpoint, queryParams) {
        const requestId = this.requestId = (this.requestId || 0) + 1;
        this.weatherController?.abort();
        this.weatherController = new AbortController();
        WeatherDisplay.cancelForecast();
        UIUtils.showLoadingSpinner();
        try {
            const query = new URLSearchParams(queryParams);
            const response = await fetch(`${endpoint}?${query}`, {signal: this.weatherController.signal});
            const data = await response.json();
            if (requestId !== this.requestId) return;
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Kunne ikke hente værdata.');
            }
            window.WeatherApp?.updateState({
                lastCity: data.name, lastCountry: data.sys?.country,
                lastLat: data.coord?.lat ?? null, lastLon: data.coord?.lon ?? null
            });
            if (endpoint === '/weather_by_coords') {
                const input = document.getElementById('cityInput');
                input.value = `${data.name}, ${data.sys.country}`;
                window.CitySearch?.positionClearButton(input);
            }
            WeatherDisplay.displayWeatherData(data);
            return data;
        } catch (error) {
            if (requestId !== this.requestId || error.name === 'AbortError') return;
            WeatherDisplay.clearWeatherData();
            alert(error.message || 'Det oppstod en feil ved henting av værdata.');
        } finally {
            if (requestId === this.requestId) {
                UIUtils.hideLoadingSpinner();
                window.WeatherApp?.hideInitialLoader();
            }
        }
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
        if (!Array.isArray(suggestions) || suggestions.length === 0) return [];

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

if (typeof window !== 'undefined') {
    window.WeatherAPI = WeatherAPI;
}
