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
            const select = create('button', 'favorite-name', city);
            select.type = 'button';
            select.addEventListener('click', () => {
                this.fetchWeatherByCity(city);
                this.closeFavoritesDropdown();
            });
            const remove = create('button', 'favorite-remove');
            remove.type = 'button';
            remove.title = 'Fjern fra favoritter';
            remove.setAttribute('aria-label', `Fjern ${city} fra favoritter`);
            remove.appendChild(create('span', 'remove-text', 'Fjern'));
            remove.addEventListener('click', (event) => {
                // The clicked node is detached when the list is rebuilt below.
                event.stopPropagation();
                this.removeFromFavorites(city);
                const nextFocus = document.getElementById('favoritesList').querySelector('button')
                    || document.getElementById('favoritesDropdown');
                nextFocus.focus();
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

    formatCityName(city) {
        const name = typeof city === 'string' ? city
            : city.display_name || [city.name, city.state, city.country].filter(Boolean).join(', ');
        // Older favorites can repeat the city as its region, e.g. New York, New York, US.
        return name.split(',').map(part => part.trim())
            .filter((part, index, parts) => part && (index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase()))
            .join(', ');
    },

    isCityInFavorites(city) {
        const name = this.formatCityName(city).toLowerCase();
        const parts = name.split(', ');
        return this.loadFavorites().some(favorite => {
            const savedName = this.formatCityName(favorite).toLowerCase();
            if (savedName === name) return true;
            const savedParts = savedName.split(', ');
            // The weather response and older favorites can omit the region.
            return parts.length >= 2 && savedParts.length >= 2
                && parts[0] === savedParts[0] && parts.at(-1) === savedParts.at(-1)
                && (parts.length === 2 || savedParts.length === 2);
        });
    },

    addToFavorites(city) {
        const favorites = this.loadFavorites();
        const cityName = this.formatCityName(city);

        if (!this.isCityInFavorites(city)) {
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
