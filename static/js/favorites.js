const Favorites = {
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
                e.target.blur();
                this.toggleFavoritesDropdown();
            });
        } else {
            console.error("❌ `favoritesBtn` not found in the DOM.");
        }

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
        }
    },

    closeFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            dropdown.classList.remove('visible');
        }
    },

    updateFavoritesDisplay() {
        const favoritesList = document.getElementById('favoritesList');
        if (!favoritesList) return;

        const favorites = this.loadFavorites();

        if (favorites.length === 0) {
            favoritesList.innerHTML = `
                <div class="no-favorites" data-en="No favorites added yet" data-no="Ingen favoritter lagt til ennå">
                    Ingen favoritter lagt til ennå
                </div>
            `;
            return;
        }

        favoritesList.innerHTML = favorites.map(city => `
            <div class="favorite-item" data-city="${city}">
                <div class="favorite-name">
                    <div class="favorite-star-indicator"></div>
                    <span>${city}</span>
                </div>
                <button class="favorite-remove" title="Fjern fra favoritter" data-city="${city}">
                    <span class="remove-text">Fjern</span>
                </button>
            </div>
        `).join('');

        favoritesList.querySelectorAll('.favorite-item').forEach(item => {
            const cityName = item.dataset.city;
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favorite-remove')) {
                    this.fetchWeatherByCity(cityName);
                    this.closeFavoritesDropdown();
                }
            });
        });

        favoritesList.querySelectorAll('.favorite-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cityName = btn.dataset.city;
                this.removeFromFavorites(cityName);
                this.updateFavoritesDisplay();
            });
        });
    },

    loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        console.log('User Favorites:', favorites);
        return favorites;
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
            localStorage.setItem('favorites', JSON.stringify(favorites));
            this.updateFavoritesDisplay();
        }
    },

    removeFromFavorites(city) {
        let favorites = this.loadFavorites();
        favorites = favorites.filter(favCity => favCity !== city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
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

        if (typeof WeatherApp !== 'undefined') {
            WeatherApp.updateState({
                lastCity: cityName,
                lastCountry: country
            });
        }

        if (typeof WeatherAPI !== 'undefined') {
            WeatherAPI.fetchWeatherData('/weather', {city: cityName, country, unit});
        } else {
            console.error('WeatherAPI not available');
        }
    }
};
