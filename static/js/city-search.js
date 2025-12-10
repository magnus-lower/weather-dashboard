const CitySearch = {
    init() {
        console.log('City Search module initialized');
        this.setupEventListeners();
        this.initSearchHistory();

        setTimeout(() => {
            const cityInput = document.getElementById('cityInput');
            if (cityInput) {
                this.positionClearButton(cityInput);
            }
        }, 200);

        setTimeout(() => {
            const cityInput = document.getElementById('cityInput');
            if (cityInput) {
                this.positionClearButton(cityInput);
            }
        }, 1000);
    },

    setupEventListeners() {
        const cityInput = document.getElementById('cityInput');
        const clearBtn = document.getElementById('clearInputBtn');

        if (cityInput) {
            cityInput.addEventListener('input',
                UIUtils.debounce((event) => this.handleCityInput(event), 300)
            );

            cityInput.addEventListener('input', (event) => {
                this.positionClearButton(event.target);
            });

            cityInput.addEventListener('focus', (event) => {
                this.positionClearButton(event.target);
            });

            cityInput.addEventListener('keydown', (event) => this.handleKeyNavigation(event));

            cityInput.addEventListener('focus', (event) => {
                const query = event.target.value.trim();
                if (query.length >= 2) {
                    this.fetchAndDisplaySuggestions(query);
                } else if (query.length === 0) {
                    this.showSearchHistory();
                }
                this.positionClearButton(event.target);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearInputField();
            });
        }

        if (cityInput) {
            this.positionClearButton(cityInput);
            setTimeout(() => {
                this.positionClearButton(cityInput);
            }, 100);
            setTimeout(() => {
                this.positionClearButton(cityInput);
            }, 500);
        }

        document.addEventListener('click', (event) => {
            const cityInput = document.getElementById('cityInput');
            const suggestionsList = document.getElementById('citySuggestions');

            if (cityInput && suggestionsList &&
                !cityInput.contains(event.target) &&
                !suggestionsList.contains(event.target)) {
                this.clearCitySuggestions();
            }
        });
    },

    handleCityInput(event) {
        const query = event.target.value.trim();
        if (query.length >= 2) {
            this.fetchAndDisplaySuggestions(query);
        } else if (query.length === 0) {
            this.showSearchHistory();
        } else {
            this.clearCitySuggestions();
        }
    },

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
                    WeatherApp.fetchWeatherForInputCity();
                }
                break;
            case 'Escape':
                this.clearCitySuggestions();
                break;
        }
    },

    selectSuggestion(index, suggestions) {
        suggestions.forEach(li => li.classList.remove('selected'));
        if (suggestions[index]) {
            suggestions[index].classList.add('selected');
        }
    },

    async fetchAndDisplaySuggestions(query) {
        try {
            const cities = await WeatherAPI.fetchCitySuggestions(query);
            this.displayCitySuggestions(cities, query);
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            this.clearCitySuggestions();
        }
    },

    addToSearchHistory(cityName, cityData) {
        const historyItem = {
            display_name: cityName,
            timestamp: Date.now(),
            ...cityData
        };

        const normalizedName = cityName.toLowerCase().trim();

        this.searchHistory = this.searchHistory.filter(item =>
            item.display_name.toLowerCase().trim() !== normalizedName
        );

        this.searchHistory.unshift(historyItem);

        this.searchHistory = this.searchHistory.slice(0, 8);

        this.saveSearchHistory();
    },

    highlightMatch(text, query) {
        if (!query || query.length < 2) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    },

    initSearchHistory() {
        try {
            const saved = localStorage.getItem('weather_search_history');
            this.searchHistory = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    },

    saveSearchHistory() {
        try {
            localStorage.setItem('weather_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    },

    displayCitySuggestions(cities, query) {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = '';

        if (cities.length > 0) {
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

                const contentDiv = document.createElement('div');
                contentDiv.className = 'suggestion-content';

                const cityNameSpan = document.createElement('span');
                cityNameSpan.className = 'suggestion-name';
                cityNameSpan.innerHTML = this.highlightMatch(displayName, query);
                contentDiv.appendChild(cityNameSpan);

                if (city.population && city.population > 0) {
                    const popSpan = document.createElement('span');
                    popSpan.className = 'suggestion-coords';
                    popSpan.textContent = `Befolkning: ${city.population.toLocaleString()}`;
                    popSpan.style.fontSize = '0.8rem';
                    popSpan.style.color = 'var(--secondary-color)';
                    popSpan.style.display = 'block';
                    contentDiv.appendChild(popSpan);
                } else if (city.lat && city.lon) {
                    const coordsSpan = document.createElement('span');
                    coordsSpan.className = 'suggestion-coords';
                    coordsSpan.textContent = `${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}`;
                    coordsSpan.style.fontSize = '0.8rem';
                    coordsSpan.style.color = 'var(--secondary-color)';
                    coordsSpan.style.display = 'block';
                    contentDiv.appendChild(coordsSpan);
                }

                li.appendChild(contentDiv);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'suggestion-actions';

                const favoriteBtn = document.createElement('button');
                favoriteBtn.className = 'suggestion-favorite-btn';
                favoriteBtn.type = 'button';
                favoriteBtn.title = 'Legg til i favoritter';

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

                li.addEventListener('click', () => {
                    const cityInput = document.getElementById('cityInput');
                    cityInput.value = displayName;
                    this.positionClearButton(cityInput);
                    this.clearCitySuggestions();
                    this.selectCity(displayName, city);
                });

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

    selectCity(cityName, cityData = null) {
        console.log('Selected city:', cityName);

        if (cityData) {
            this.addToSearchHistory(cityName, cityData);
        }

        if (cityData && cityData.lat && cityData.lon) {
            WeatherApp.updateState({
                lastCity: cityName,
                lastCountry: cityData.country || 'NO'
            });

            WeatherAPI.fetchWeatherData('/weather_by_coords', {
                lat: cityData.lat,
                lon: cityData.lon,
                unit: 'metric'
            });
        } else {
            const cityParts = cityName.split(', ');
            const city = cityParts.slice(0, cityParts.length - 1).join(', ');
            const country = cityParts[cityParts.length - 1];

            WeatherApp.updateState({
                lastCity: city,
                lastCountry: country
            });

            WeatherAPI.fetchWeatherData('/weather', { city, country, unit: 'metric' });
        }

        this.clearCitySuggestions();
    },

    clearCitySuggestions() {
        document.getElementById('citySuggestions').innerHTML = '';
    },

    showSearchHistory() {
        const suggestionsList = document.getElementById('citySuggestions');
        suggestionsList.innerHTML = '';

        if (this.searchHistory.length === 0) return;

        const headerLi = document.createElement('li');
        headerLi.className = 'suggestions-header';
        headerLi.innerHTML = '<span style="font-size: 0.9rem; color: var(--secondary-color); font-weight: 600;">Nylige søk</span>';
        suggestionsList.appendChild(headerLi);

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

    positionClearButton(inputElement) {
        const clearBtn = document.getElementById('clearInputBtn');

        if (clearBtn && inputElement) {
            const inputValue = inputElement.value || '';

            if (inputValue.trim().length === 0) {
                clearBtn.classList.remove('visible');
                return;
            }

            clearBtn.classList.add('visible');

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

            const leftPosition = 12 + textWidth + 15;
            clearBtn.style.left = `${leftPosition}px`;
        }
    },

    clearInputField() {
        const cityInput = document.getElementById('cityInput');
        if (cityInput) {
            cityInput.value = '';
            cityInput.focus();
            this.positionClearButton(cityInput);

            setTimeout(() => {
                this.showSearchHistory();
            }, 50);
        }
    }
};

window.CitySearch = CitySearch;
