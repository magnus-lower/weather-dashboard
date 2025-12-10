// city-search.js - Handles city search and autocomplete functionality
const CitySearch = {
    init() {
        console.log('City Search module initialized');
        this.setupEventListeners();
        this.initSearchHistory();
        
        // Check if there's already text in the input field on page load
        // Multiple checks to catch text that might be added later
        setTimeout(() => {
            const cityInput = document.getElementById('cityInput');
            if (cityInput) {
                this.positionClearButton(cityInput);
            }
        }, 200);
        
        // Additional check after longer delay
        setTimeout(() => {
            const cityInput = document.getElementById('cityInput');
            if (cityInput) {
                this.positionClearButton(cityInput);
            }
        }, 1000);
    },

    // Set up event listeners for city search
    setupEventListeners() {
        const cityInput = document.getElementById('cityInput');
        const clearBtn = document.getElementById('clearInputBtn');
        
        if (cityInput) {
            cityInput.addEventListener('input',
                UIUtils.debounce((event) => this.handleCityInput(event), 300)
            );
            
            // Also handle input for positioning clear button
            cityInput.addEventListener('input', (event) => {
                this.positionClearButton(event.target);
            });
            
            // Position clear button on focus too
            cityInput.addEventListener('focus', (event) => {
                this.positionClearButton(event.target);
            });
            
            // Legg til keyboard navigation for suggestions
            cityInput.addEventListener('keydown', (event) => this.handleKeyNavigation(event));

            // Show suggestions when input gets focus (if there's text)
            cityInput.addEventListener('focus', (event) => {
                const query = event.target.value.trim();
                if (query.length >= 2) {
                    this.fetchAndDisplaySuggestions(query);
                } else if (query.length === 0) {
                    // Show search history if input is empty
                    this.showSearchHistory();
                }
                this.positionClearButton(event.target);
            });
        }

        // Clear button functionality
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearInputField();
            });
        }

        // Initial positioning check for clear button
        if (cityInput) {
            // Check immediately and after a delay
            this.positionClearButton(cityInput);
            setTimeout(() => {
                this.positionClearButton(cityInput);
            }, 100);
            // Additional check after more delay in case content loads later
            setTimeout(() => {
                this.positionClearButton(cityInput);
            }, 500);
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
        } else if (query.length === 0) {
            // Show search history when input is empty
            this.showSearchHistory();
        } else {
            // For 1 character, clear suggestions
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

                // Custom favorite button (no emoji)
                const favoriteBtn = document.createElement('button');
                favoriteBtn.className = 'suggestion-favorite-btn';
                favoriteBtn.type = 'button';
                favoriteBtn.title = 'Legg til i favoritter';
                
                // Check if city is already in favorites
                const isAlreadyFavorite = typeof Favorites !== 'undefined' && Favorites.isCityInFavorites(city);
                
                if (isAlreadyFavorite) {
                    favoriteBtn.classList.add('added');
                    favoriteBtn.innerHTML = '<span class="favorite-text">Lagt til!</span>';
                    favoriteBtn.title = 'Allerede i favoritter';
                } else {
                    favoriteBtn.innerHTML = '<span class="favorite-text">Favoritt</span>';
                }
                
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof Favorites !== 'undefined') {
                        if (!isAlreadyFavorite) {
                            Favorites.addToFavorites(city);
                            favoriteBtn.classList.add('added');
                            favoriteBtn.innerHTML = '<span class="favorite-text">Lagt til!</span>';
                            favoriteBtn.title = 'Allerede i favoritter';
                        }
                    }
                });

                actionsDiv.appendChild(favoriteBtn);
                li.appendChild(actionsDiv);

                // Click handler for city selection
                li.addEventListener('click', () => {
                    const cityInput = document.getElementById('cityInput');
                    cityInput.value = displayName;
                    this.positionClearButton(cityInput);
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

        // If we have coordinate data, use the more precise coordinate-based API
        if (cityData && cityData.lat && cityData.lon) {
            // Update app state with full city name
            WeatherApp.updateState({
                lastCity: cityName,
                lastCountry: cityData.country || 'NO'
            });

            // Use coordinate-based weather fetch for better accuracy
            WeatherAPI.fetchWeatherData('/weather_by_coords', { 
                lat: cityData.lat, 
                lon: cityData.lon, 
                unit: 'metric' 
            });
        } else {
            // Fallback to name-based search
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
        }

        // Only hide suggestions, keep the input text
        this.clearCitySuggestions();
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
            historyIcon.className = 'history-icon';
            historyIcon.style.marginRight = '8px';
            historyIcon.style.fontSize = '0.9rem';
            li.prepend(historyIcon);

            li.addEventListener('click', () => {
                const cityInput = document.getElementById('cityInput');
                cityInput.value = historyItem.display_name;
                this.positionClearButton(cityInput);
                this.clearCitySuggestions();
                this.selectCity(historyItem.display_name, historyItem);
            });

            if (index === 0) {
                li.classList.add('selected');
            }

            suggestionsList.appendChild(li);
        });
    },

    // Position clear button right after the text and show/hide based on content
    positionClearButton(inputElement) {
        const clearBtn = document.getElementById('clearInputBtn');
        
        if (clearBtn && inputElement) {
            const inputValue = inputElement.value || '';
            
            // Hide button if no text
            if (inputValue.trim().length === 0) {
                clearBtn.classList.remove('visible');
                return;
            }
            
            // Show button and position it
            clearBtn.classList.add('visible');
            
            // Create a temporary span to measure text width
            const tempSpan = document.createElement('span');
            tempSpan.style.position = 'absolute';
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.whiteSpace = 'pre';
            tempSpan.style.font = window.getComputedStyle(inputElement).font;
            tempSpan.style.fontSize = window.getComputedStyle(inputElement).fontSize;
            tempSpan.style.fontFamily = window.getComputedStyle(inputElement).fontFamily;
            tempSpan.textContent = inputValue;
            
            document.body.appendChild(tempSpan);
            const textWidth = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);
            
            // Position the clear button right after the text
            // Account for input padding (typically 12px on left) plus a bigger gap
            const leftPosition = 12 + textWidth + 15; // 12px padding + text width + 15px gap
            clearBtn.style.left = `${leftPosition}px`;
        }
    },

    // Clear the input field and hide clear button
    clearInputField() {
        const cityInput = document.getElementById('cityInput');
        if (cityInput) {
            cityInput.value = '';
            cityInput.focus(); // Keep focus on input after clearing
            this.positionClearButton(cityInput); // This will hide the button since value is empty
            
            // Small delay to ensure the input is cleared before showing history
            setTimeout(() => {
                this.showSearchHistory(); // Show search history when field is cleared
            }, 50);
        }
    }
};

// Expose CitySearch to global scope
window.CitySearch = CitySearch;