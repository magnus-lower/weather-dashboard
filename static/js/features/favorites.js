import { WeatherAPI } from '../api/weather-api.js';
import { UIUtils } from '../core/ui-utils.js';

export const Favorites = {
    init() {
        console.log('Favorites module initialized');
        this.loadFavorites();
        this.setupEventListeners();
        this.updateFavoritesDisplay();
    },

    setupEventListeners() {
        const favoritesBtn = document.getElementById('favoritesBtn');
        const favoritesDropdown = document.getElementById('favoritesDropdown');

        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavoritesDropdown();
            });
        } else {
            console.error("❌ `favoritesBtn` not found in the DOM.");
        }

        favoritesDropdown?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeFavoritesDropdown();
                favoritesBtn.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (favoritesDropdown && !favoritesBtn?.contains(e.target) && !favoritesDropdown?.contains(e.target)) {
                this.closeFavoritesDropdown();
            }
        });
    },

    toggleFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            const isVisible = dropdown.classList.contains('visible');
            if (isVisible) {
                this.closeFavoritesDropdown();
            } else {
                this.openFavoritesDropdown();
            }
        }
    },

    openFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            if (typeof CitySearch !== 'undefined' && CitySearch.clearCitySuggestions) {
                CitySearch.clearCitySuggestions();
            }

            this.updateFavoritesDisplay();
            dropdown.classList.add('visible');
            document.getElementById('favoritesBtn').setAttribute('aria-expanded', 'true');
        }
    },

    closeFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            dropdown.classList.remove('visible');
            document.getElementById('favoritesBtn').setAttribute('aria-expanded', 'false');
        }
    },

    updateFavoritesDisplay() {
        const favoritesList = document.getElementById('favoritesList');
        if (!favoritesList) return;

        const favorites = this.loadFavorites();

        if (favorites.length === 0) {
            const empty = UIUtils.createElement('div', 'no-favorites', 'Ingen favoritter lagt til ennå');
            empty.setAttribute('data-en', 'No favorites added yet');
            empty.setAttribute('data-no', 'Ingen favoritter lagt til ennå');
            favoritesList.replaceChildren(empty);
            return;
        }

        const create = UIUtils.createElement;
        favoritesList.replaceChildren(...favorites.map(city => {
            const item = create('div', 'favorite-item');
            const select = create('button', 'favorite-name');
            select.type = 'button';
            select.append(create('span', 'favorite-star-indicator'), create('span', '', city));
            select.addEventListener('click', () => {
                this.fetchWeatherByCity(city);
                this.closeFavoritesDropdown();
            });
            const remove = create('button', 'favorite-remove');
            remove.type = 'button';
            remove.title = 'Fjern fra favoritter';
            remove.setAttribute('aria-label', `Fjern ${city} fra favoritter`);
            remove.appendChild(create('span', 'remove-text', 'Fjern'));
            remove.addEventListener('click', () => {
                this.removeFromFavorites(city);
                document.getElementById('favoritesList').querySelector('button')?.focus();
            });
            item.append(select, remove);
            return item;
        }));
    },

    loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem('favorites'));
            return Array.isArray(saved)
                ? saved.filter(city => typeof city === 'string' && city.trim().length > 0)
                : [];
        } catch {
            return [];
        }
    },

    saveFavorites(favorites) {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch {
            alert('Favorittene kunne ikke lagres i nettleseren.');
        }
    },

    isCityInFavorites(city) {
        const favorites = this.loadFavorites();
        let cityName;

        if (typeof city === 'string') {
            cityName = city;
        } else {
            cityName = city.display_name || `${city.name}, ${city.country}`;
        }

        return favorites.includes(cityName);
    },

    addToFavorites(city) {
        const favorites = this.loadFavorites();
        let cityName;

        if (typeof city === 'string') {
            cityName = city;
        } else {
            cityName = city.name;
            if (city.state) {
                cityName += `, ${city.state}`;
            }
            cityName += `, ${city.country}`;
        }

        if (!favorites.includes(cityName)) {
            favorites.push(cityName);
            this.saveFavorites(favorites);
            this.updateFavoritesDisplay();
        }
    },

    removeFromFavorites(city) {
        let favorites = this.loadFavorites();
        favorites = favorites.filter(favCity => favCity !== city);
        this.saveFavorites(favorites);
        this.updateFavoritesDisplay();
    },

    fetchWeatherByCity(city) {
        const unit = 'metric';
        console.log(`Fetching weather for favorite city: ${city}`);

        const cityParts = city.split(', ');
        const cityName = cityParts.slice(0, cityParts.length - 1).join(', ');
        const country = cityParts[cityParts.length - 1];

        console.log(`Extracted City: ${cityName}, Country: ${country}`);

        const cityInput = document.getElementById('cityInput');
        if (cityInput) {
            cityInput.value = city;

            if (window.CitySearch && window.CitySearch.positionClearButton) {
                window.CitySearch.positionClearButton(cityInput);
            }
        }

        if (window.WeatherApp) {
            window.WeatherApp.updateState({
                lastCity: cityName,
                lastCountry: country
            });
        }

        WeatherAPI.fetchWeatherData('/weather', {city: cityName, country, unit});
    }
};

if (typeof window !== 'undefined') {
    window.Favorites = Favorites;
}
