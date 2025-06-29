// favorites.js - Handles favorite cities functionality
const Favorites = {
    init() {
        console.log('Favorites module initialized');
        this.loadFavorites();
        this.setupEventListeners();
    },

    // Set up event listeners for favorites
    setupEventListeners() {
        const favoritesIcon = document.getElementById('favoritesIcon');
        if (favoritesIcon) {
            favoritesIcon.addEventListener('click', () => this.showFavorites());
        } else {
            console.error("❌ `favoritesIcon` not found in the DOM.");
        }
    },

    // Load favorites from localStorage
    loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        console.log('User Favorites:', favorites);
        return favorites;
    },

    // Add city to favorites
    addToFavorites(city) {
        const favorites = this.loadFavorites();
        const cityName = `${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`;

        if (!favorites.includes(cityName)) {
            favorites.push(cityName);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            alert(`${cityName} added to favorites!`);
        } else {
            alert(`${cityName} is already in your favorites.`);
        }
    },

    // Remove city from favorites
    removeFromFavorites(city) {
        let favorites = this.loadFavorites();
        favorites = favorites.filter(favCity => favCity !== city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    },

    // Show favorites popup
    showFavorites() {
        const favorites = this.loadFavorites();

        if (favorites.length === 0) {
            alert('No favorites added yet.');
            return;
        }

        // Remove existing container
        document.getElementById('favoritesContainer')?.remove();

        // Create new container
        const favoritesContainer = document.createElement('div');
        favoritesContainer.id = 'favoritesContainer';
        favoritesContainer.classList.add('favorites-container');
        favoritesContainer.innerHTML = '<h3>Your Favorites:</h3>';

        favorites.forEach(city => {
            const cityRow = document.createElement('div');
            cityRow.style.display = 'flex';
            cityRow.style.justifyContent = 'space-between';
            cityRow.style.alignItems = 'center';
            cityRow.style.padding = '10px';
            cityRow.style.borderBottom = '1px solid #ddd';
            cityRow.style.cursor = 'pointer';

            const cityName = document.createElement('span');
            cityName.textContent = `⭐ ${city}`;
            cityName.style.flexGrow = '1';
            cityName.style.textAlign = 'left';
            cityRow.appendChild(cityName);

            cityRow.addEventListener('click', () => {
                this.fetchWeatherByCity(city);
                favoritesContainer.remove();
            });

            // Remove button
            const removeBtn = document.createElement('span');
            removeBtn.textContent = '❌';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.color = 'red';
            removeBtn.style.marginLeft = '15px';
            removeBtn.title = 'Remove from favorites';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent clicking city row
                this.removeFromFavorites(city);
                cityRow.remove();
                if (favoritesContainer.querySelectorAll('div').length === 0) {
                    favoritesContainer.remove();
                }
            });

            cityRow.appendChild(removeBtn);
            favoritesContainer.appendChild(cityRow);
        });

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '10px 15px';
        closeButton.style.backgroundColor = '#007bff';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => favoritesContainer.remove());

        favoritesContainer.appendChild(closeButton);
        document.body.appendChild(favoritesContainer);
    },

    // Fetch weather for a favorite city
    fetchWeatherByCity(city) {
        const unit = 'metric'; // Fixed to metric
        console.log(`Fetching weather for favorite city: ${city}`);

        // Extract city name, state (if exists), and country
        const cityParts = city.split(', ');
        const cityName = cityParts.slice(0, cityParts.length - 1).join(', '); // Get everything except country
        const country = cityParts[cityParts.length - 1]; // Last part is the country

        console.log(`Extracted City: ${cityName}, Country: ${country}`);

        // Update input field
        document.getElementById('cityInput').value = city;

        // Fetch weather data
        WeatherAPI.fetchWeatherData('/weather', {city: cityName, country, unit});

        // Also fetch forecast
        ForecastService.fetchForecast(cityName, country);
    }
};