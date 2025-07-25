// city-search.js - Handles city search and autocomplete functionality
const CitySearch = {
    init() {
        console.log('City Search module initialized');
        this.setupEventListeners();
        this.initSearchHistory();
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

        // Hide suggestions when clicking outside the search area
        document.addEventListener('click', (event) => {
            const cityInput = document.getElementById('cityInput');
            const suggestionsList = document.getElementById('citySuggestions');
            
            // Check if click is outside both the input field and suggestions dropdown
            if (cityInput && suggestionsList &&
                !cityInput.contains(event.target) && 
                !suggestionsList.contains(event.target)) {
                this.clearCitySuggestions();
            }
        });
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

    // Add to search history
    addToSearchHistory(cityName, cityData) {
        const historyItem = {
            display_name: cityName,
            timestamp: Date.now(),
            ...cityData
        };

        // Normalize for better deduplication
        const normalizedName = cityName.toLowerCase().trim();
        
        // Remove if already exists (case insensitive)
        this.searchHistory = this.searchHistory.filter(item => 
            item.display_name.toLowerCase().trim() !== normalizedName
        );

        // Add to beginning
        this.searchHistory.unshift(historyItem);

        // Keep only last 8 unique searches (reduced for better UX)
        this.searchHistory = this.searchHistory.slice(0, 8);

        // Save to localStorage
        this.saveSearchHistory();
    },

    // Highlight matching text in search suggestions
    highlightMatch(text, query) {
        if (!query || query.length < 2) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    },

    // Initialize search history from localStorage
    initSearchHistory() {
        try {
            const saved = localStorage.getItem('weather_search_history');
            this.searchHistory = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    },

    // Save search history to localStorage
    saveSearchHistory() {
        try {
            localStorage.setItem('weather_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    },

    // Display city suggestions in dropdown
    displayCitySuggestions(cities, query) {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = ''; // Clear previous suggestions

        if (cities.length > 0) {
            // Further client-side deduplication based on display names
            const seenDisplayNames = new Set();
            const uniqueCities = cities.filter(city => {
                const displayName = (city.display_name || `${city.name}, ${city.country}`).toLowerCase();
                if (seenDisplayNames.has(displayName)) {
                    return false;
                }
                seenDisplayNames.add(displayName);
                return true;
            });

            uniqueCities.forEach((city, index) => {
                const displayName = city.display_name || `${city.name}, ${city.country}`;

                const li = document.createElement('li');
                li.className = 'suggestion-item';
                li.setAttribute('role', 'option');
                li.setAttribute('tabindex', '-1');

                // Create main content container
                const contentDiv = document.createElement('div');
                contentDiv.className = 'suggestion-content';

                // City name with highlighting
                const cityNameSpan = document.createElement('span');
                cityNameSpan.className = 'suggestion-name';
                cityNameSpan.innerHTML = this.highlightMatch(displayName, query);
                contentDiv.appendChild(cityNameSpan);

                // Add population info if available (more useful than coordinates)
                if (city.population && city.population > 0) {
                    const popSpan = document.createElement('span');
                    popSpan.className = 'suggestion-coords';
                    popSpan.textContent = `Befolkning: ${city.population.toLocaleString()}`;
                    popSpan.style.fontSize = '0.8rem';
                    popSpan.style.color = 'var(--secondary-color)';
                    popSpan.style.display = 'block';
                    contentDiv.appendChild(popSpan);
                } else if (city.lat && city.lon) {
                    // Fallback to coordinates if no population data
                    const coordsSpan = document.createElement('span');
                    coordsSpan.className = 'suggestion-coords';
                    coordsSpan.textContent = `${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}`;
                    coordsSpan.style.fontSize = '0.8rem';
                    coordsSpan.style.color = 'var(--secondary-color)';
                    coordsSpan.style.display = 'block';
                    contentDiv.appendChild(coordsSpan);
                }

                li.appendChild(contentDiv);

                // Actions container
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'suggestion-actions';

                // Star icon for favorites
                const star = document.createElement('span');
                star.className = 'suggestion-star';
                star.innerHTML = '⭐';
                star.title = 'Legg til i favoritter';
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof Favorites !== 'undefined') {
                        Favorites.addToFavorites(city);
                        star.innerHTML = '✅';
                        setTimeout(() => star.innerHTML = '⭐', 1000);
                    }
                });

                actionsDiv.appendChild(star);
                li.appendChild(actionsDiv);

                // Click handler for city selection
                li.addEventListener('click', () => {
                    document.getElementById('cityInput').value = displayName;
                    this.clearCitySuggestions();
                    this.selectCity(displayName, city);
                });

                // Highlight first exact match or first result
                if ((city.is_exact_match && !suggestionsList.querySelector('.selected')) || index === 0) {
                    li.classList.add('selected');
                }

                suggestionsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'no-results';
            li.innerHTML = `
                <div style="text-align: center; padding: 16px; color: var(--secondary-color);">
                    <div style="font-style: italic;">Ingen byer funnet for "${query}"</div>
                    <div style="font-size: 0.9rem; margin-top: 8px;">Prøv et annet søkeord eller sjekk stavemåten</div>
                </div>
            `;
            suggestionsList.appendChild(li);
        }
    },

    // Handle city selection from suggestions
    selectCity(cityName, cityData = null) {
        console.log('Selected city:', cityName);

        // Add to search history
        if (cityData) {
            this.addToSearchHistory(cityName, cityData);
        }

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
    },

    // Show recent search history with better deduplication
    showSearchHistory() {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = '';

        if (this.searchHistory.length === 0) return;

        // Add history header
        const headerLi = document.createElement('li');
        headerLi.className = 'suggestions-header';
        headerLi.innerHTML = '<span style="font-size: 0.9rem; color: var(--secondary-color); font-weight: 600;">Nylige søk</span>';
        suggestionsList.appendChild(headerLi);

        // Deduplicate history items by display name
        const seenNames = new Set();
        const uniqueHistory = this.searchHistory.filter(item => {
            const normalizedName = item.display_name.toLowerCase().trim();
            if (seenNames.has(normalizedName)) {
                return false;
            }
            seenNames.add(normalizedName);
            return true;
        });

        uniqueHistory.slice(0, 5).forEach((historyItem, index) => {
            const li = document.createElement('li');
            li.textContent = historyItem.display_name;
            li.className = 'suggestion-item history-item';
            li.setAttribute('role', 'option');
            li.setAttribute('tabindex', '-1');

            // Add history icon
            const historyIcon = document.createElement('span');
            historyIcon.innerHTML = '🕒';
            historyIcon.style.marginRight = '8px';
            historyIcon.style.fontSize = '0.9rem';
            li.prepend(historyIcon);

            li.addEventListener('click', () => {
                document.getElementById('cityInput').value = historyItem.display_name;
                this.clearCitySuggestions();
                this.selectCity(historyItem.display_name, historyItem);
            });

            if (index === 0) {
                li.classList.add('selected');
            }

            suggestionsList.appendChild(li);
        });
    }
};