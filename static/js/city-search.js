// city-search.js - Handles city search and autocomplete functionality
const CitySearch = {
    init() {
        console.log('City Search module initialized');
        this.setupEventListeners();
    },

    // Set up event listeners for city search
    setupEventListeners() {
        const cityInput = document.getElementById('cityInput');
        if (cityInput) {
            cityInput.addEventListener('input',
                UIUtils.debounce((event) => this.handleCityInput(event), 300)
            );
            
            // Legg til keyboard navigation for suggestions
            cityInput.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
        }
    },

    // Handle city input for autocomplete
    handleCityInput(event) {
        const query = event.target.value.trim();
        if (query.length >= 2) {
            this.fetchAndDisplaySuggestions(query);
        } else {
            this.clearCitySuggestions();
        }
    },

    // Handle keyboard navigation in suggestions
    handleKeyNavigation(event) {
        const suggestionsList = document.getElementById('citySuggestions');
        const suggestions = suggestionsList.querySelectorAll('li');
        
        if (suggestions.length === 0) return;
        
        let currentIndex = Array.from(suggestions).findIndex(li => li.classList.contains('selected'));
        
        switch(event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (currentIndex < suggestions.length - 1) {
                    this.selectSuggestion(currentIndex + 1, suggestions);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex > 0) {
                    this.selectSuggestion(currentIndex - 1, suggestions);
                }
                break;
            case 'Enter':
                event.preventDefault();
                if (currentIndex >= 0) {
                    suggestions[currentIndex].click();
                } else {
                    // Hvis ingen suggestion er valgt, hent vær for teksten som er skrevet
                    WeatherApp.fetchWeatherForInputCity();
                }
                break;
            case 'Escape':
                this.clearCitySuggestions();
                break;
        }
    },

    // Select a suggestion by index
    selectSuggestion(index, suggestions) {
        suggestions.forEach(li => li.classList.remove('selected'));
        if (suggestions[index]) {
            suggestions[index].classList.add('selected');
        }
    },

    // Fetch and display city suggestions
    async fetchAndDisplaySuggestions(query) {
        try {
            const cities = await WeatherAPI.fetchCitySuggestions(query);
            this.displayCitySuggestions(cities, query);
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            this.clearCitySuggestions();
        }
    },

    // Display city suggestions in dropdown
    displayCitySuggestions(cities, query) {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = ''; // Clear previous suggestions

        if (cities.length > 0) {
            cities.forEach((city, index) => {
                const state = city.state ? `, ${city.state}` : '';
                const cityName = `${city.name}${state}, ${city.country}`;

                const li = document.createElement('li');
                li.textContent = cityName;
                li.style.cursor = 'pointer';
                li.setAttribute('role', 'option');
                li.setAttribute('tabindex', '-1');

                // Star icon for favorites
                const star = document.createElement('span');
                star.innerHTML = '&#9733;'; // Star character
                star.style.cursor = 'pointer';
                star.style.marginLeft = '10px';
                star.style.color = '#d97706';
                star.title = 'Legg til i favoritter';
                star.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent clicking suggestion
                    Favorites.addToFavorites(city);
                });

                li.appendChild(star);

                // Auto-fetch weather on selection
                li.addEventListener('click', () => {
                    document.getElementById('cityInput').value = cityName;
                    suggestionsList.innerHTML = ''; // Hide suggestions
                    this.selectCity(cityName);
                });

                // Highlight first suggestion by default
                if (index === 0) {
                    li.classList.add('selected');
                }

                suggestionsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = `Ingen byer funnet for "${query}"`;
            li.style.fontStyle = 'italic';
            li.style.color = '#64748b';
            suggestionsList.appendChild(li);
        }
    },

    // Handle city selection from suggestions
    selectCity(cityName) {
        console.log('Selected city:', cityName);

        // Extract city and country
        const cityParts = cityName.split(', ');
        const city = cityParts.slice(0, cityParts.length - 1).join(', ');
        const country = cityParts[cityParts.length - 1];

        // Update app state
        WeatherApp.updateState({
            lastCity: city,
            lastCountry: country
        });

        // Fetch weather data
        WeatherAPI.fetchWeatherData('/weather', { city, country, unit: 'metric' });
    },

    // Clear city suggestions dropdown
    clearCitySuggestions() {
        document.getElementById('citySuggestions').innerHTML = '';
    }
};