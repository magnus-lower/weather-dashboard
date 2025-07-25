// favorites.js - Handles favorite cities functionality
const Favorites = {
    init() {
        console.log('Favorites module initialized');
        this.loadFavorites();
        this.setupEventListeners();
        this.updateFavoritesDisplay();
    },

    // Set up event listeners for favorites
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

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (favoritesDropdown && !favoritesBtn?.contains(e.target) && !favoritesDropdown?.contains(e.target)) {
                this.closeFavoritesDropdown();
            }
        });
    },

    // Toggle favorites dropdown
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

    // Open favorites dropdown
    openFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            this.updateFavoritesDisplay();
            dropdown.classList.add('visible');
        }
    },

    // Close favorites dropdown
    closeFavoritesDropdown() {
        const dropdown = document.getElementById('favoritesDropdown');
        if (dropdown) {
            dropdown.classList.remove('visible');
        }
    },

    // Update favorites display in dropdown
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

        // Add event listeners to favorite items
        favoritesList.querySelectorAll('.favorite-item').forEach(item => {
            const cityName = item.dataset.city;
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favorite-remove')) {
                    this.fetchWeatherByCity(cityName);
                    this.closeFavoritesDropdown();
                }
            });
        });

        // Add event listeners to remove buttons
        favoritesList.querySelectorAll('.favorite-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cityName = btn.dataset.city;
                this.removeFromFavorites(cityName);
                this.updateFavoritesDisplay();
            });
        });
    },

    // Load favorites from localStorage
    loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        console.log('User Favorites:', favorites);
        return favorites;
    },

    // Check if a city is already in favorites
    isCityInFavorites(city) {
        const favorites = this.loadFavorites();
        let cityName;
        
        // Handle both string and object input
        if (typeof city === 'string') {
            cityName = city;
        } else {
            // Build city name from object (same logic as addToFavorites)
            cityName = city.display_name || `${city.name}, ${city.country}`;
        }

        return favorites.includes(cityName);
    },

    // Add city to favorites
    addToFavorites(city) {
        const favorites = this.loadFavorites();
        let cityName;
        
        // Handle both string and object input
        if (typeof city === 'string') {
            cityName = city;
        } else {
            // Build city name from object
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
            
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no' 
                ? `${cityName} lagt til i favoritter!`
                : `${cityName} added to favorites!`;
            alert(message);
        } else {
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no' 
                ? `${cityName} er allerede i dine favoritter.`
                : `${cityName} is already in your favorites.`;
            alert(message);
        }
    },

    // Remove city from favorites
    removeFromFavorites(city) {
        let favorites = this.loadFavorites();
        favorites = favorites.filter(favCity => favCity !== city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        this.updateFavoritesDisplay();
    },

    // Fetch weather for a favorite city
    fetchWeatherByCity(city) {
        const unit = 'metric';
        console.log(`Fetching weather for favorite city: ${city}`);

        // Extract city name, state (if exists), and country
        const cityParts = city.split(', ');
        const cityName = cityParts.slice(0, cityParts.length - 1).join(', '); // Get everything except country
        const country = cityParts[cityParts.length - 1]; // Last part is the country

        console.log(`Extracted City: ${cityName}, Country: ${country}`);

        // Update input field
        const cityInput = document.getElementById('cityInput');
        if (cityInput) {
            cityInput.value = city;
        }

        // Update app state if WeatherApp is available
        if (typeof WeatherApp !== 'undefined') {
            WeatherApp.updateState({
                lastCity: cityName,
                lastCountry: country
            });
        }

        // Fetch weather data if WeatherAPI is available
        if (typeof WeatherAPI !== 'undefined') {
            WeatherAPI.fetchWeatherData('/weather', {city: cityName, country, unit});
        } else {
            console.error('WeatherAPI not available');
        }
    }
};