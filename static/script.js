document.addEventListener('DOMContentLoaded', function () {
    // Global variables
    const settingsGear = document.getElementById('settingsGear');
    const settingsMenu = document.getElementById('settingsMenu');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const unitToggle = document.getElementById('unitToggle');
    const body = document.body;

    // Variables to store the last fetched location and city
    let lastLat = null;
    let lastLon = null;
    let lastCity = null;
    let lastCountry = null;

    // Initialize UI features
    initDarkMode();
    loadFavorites();
    fetchWeatherByLocation();
    setupEventListeners();

    // === Event Listeners ===
    function setupEventListeners() {
        document.getElementById('cityInput').addEventListener('input', debounce(handleCityInput, 300));

        const favoritesIcon = document.getElementById('favoritesIcon');
        if (favoritesIcon) {
            favoritesIcon.addEventListener('click', showFavorites);
        } else {
            console.error("❌ `favoritesIcon` not found in the DOM.");
        }

        settingsGear.addEventListener('click', () => {
            settingsMenu.style.display = 'block';
        });

        closeSettings.addEventListener('click', () => {
            settingsMenu.style.display = 'none';
        });

        darkModeToggle.addEventListener('change', () => {
            setDarkMode(darkModeToggle.checked);
        });

        unitToggle.addEventListener('change', handleUnitToggle);

        // Add click event for the city input to search weather
        document.getElementById('cityInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchWeather();
            }
        });
    }


    // === UI Handlers ===
    function handleCityInput(event) {
        const query = event.target.value.trim();
        if (query) {
            fetchCitySuggestions(query);
        } else {
            clearCitySuggestions();
        }
    }

    function handleUnitToggle() {
        const unit = unitToggle.checked ? 'imperial' : 'metric';
        localStorage.setItem('unit', unit);
        refreshWeatherData();
    }

    function showFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

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
                fetchWeatherByCity(city);
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
                removeFromFavorites(city);
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
    }

    function refreshWeatherData() {
        const unit = localStorage.getItem('unit') || 'metric';

        if (lastCity && lastCountry) {
            fetchWeatherData('/weather', {city: lastCity, country: lastCountry, unit});
        } else if (lastLat !== null && lastLon !== null) {
            fetchWeatherData('/weather_by_coords', {lat: lastLat, lon: lastLon, unit});
        } else {
            alert('No location or city data available. Please enter a city name or allow location access.');
        }
    }

    // Fetch weather by city
    function fetchWeather() {
        const city = document.getElementById('cityInput').value.trim();
        const unit = localStorage.getItem('unit') || 'metric';

        if (!city) {
            alert('Please enter a city name.');
            return;
        }

        console.log('Fetching weather for city:', city);

        // Update the last searched city
        lastCity = city;

        fetchWeatherData('/weather', { city, unit });
    }

    function fetchWeatherByLocation(lat = null, lon = null) {
        const unit = localStorage.getItem('unit') || 'metric';

        if (lat !== null && lon !== null) {
            console.log('Fetching weather for location:', lat, lon);
            reverseGeocode(lat, lon, unit);
        } else if (navigator.geolocation) {
            showLoadingSpinner();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lastLat = position.coords.latitude;
                    lastLon = position.coords.longitude;
                    console.log('Fetched geolocation:', lastLat, lastLon);
                    reverseGeocode(lastLat, lastLon, unit);
                },
                (error) => {
                    hideLoadingSpinner();
                    alert('Unable to retrieve your location. Please check your location settings.');
                    console.error(error);
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    function reverseGeocode(lat, lon, unit) {
        const apiKey = 'b40f58d271f8c91caba8162e6f87689d'; // Should be moved to backend
        const endpoint = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;

        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.length > 0) {
                    const city = data[0].name;
                    const country = data[0].country;

                    console.log(`Reverse Geocoded City: ${city}, Country: ${country}`);

                    lastCity = city;
                    lastCountry = country;

                    // Update input field
                    document.getElementById('cityInput').value = `${city}, ${country}`;

                    // Fetch weather using the city name
                    fetchWeatherData('/weather', { city, country, unit });
                } else {
                    console.error("Reverse geocoding failed. No results found.");
                    hideLoadingSpinner();
                    alert('Could not determine your location. Please enter a city name.');
                }
            })
            .catch(error => {
                console.error("Error in reverse geocoding:", error);
                hideLoadingSpinner();
                alert('Error determining your location. Please enter a city name.');
            });
    }

    function fetchCitySuggestions(query) {
        // Sanitize input
        query = query.replace(/[^\w\s,-]/gi, '').trim();

        if (!query) return;

        const apiKey = 'b40f58d271f8c91caba8162e6f87689d'; // Should be moved to backend
        // Use template literals consistently
        const endpoint = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${apiKey}`;

        // Add request throttling
        if (this.lastRequestTime && Date.now() - this.lastRequestTime < 500) {
            clearTimeout(this.throttleTimeout);
            this.throttleTimeout = setTimeout(() => fetchCitySuggestions(query), 500);
            return;
        }
        this.lastRequestTime = Date.now();

        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch city suggestions');
                }
                return response.json();
            })
            .then(data => {
                const suggestionsList = document.getElementById('citySuggestions');
                suggestionsList.innerHTML = ''; // Clear previous suggestions

                if (data.length > 0) {
                    data.forEach(city => {
                        const state = city.state ? `, ${city.state}` : '';
                        const cityName = `${city.name}${state}, ${city.country}`;

                        const li = document.createElement('li');
                        li.textContent = cityName;
                        li.style.cursor = 'pointer';

                        // Star icon for favorites
                        const star = document.createElement('span');
                        star.innerHTML = '&#9733;'; // Star character
                        star.style.cursor = 'pointer';
                        star.style.marginLeft = '10px';
                        star.title = 'Add to Favorites';
                        star.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent clicking suggestion
                            addToFavorites(city);
                        });

                        li.appendChild(star);

                        // Auto-fetch weather on selection
                        li.addEventListener('click', () => {
                            document.getElementById('cityInput').value = cityName;
                            suggestionsList.innerHTML = ''; // Hide suggestions
                            fetchWeatherByCity(cityName); // Auto-fetch weather
                        });

                        suggestionsList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = `No matching cities found for "${query}"`;
                    suggestionsList.appendChild(li);
                }
            })
            .catch(error => {
                console.error('Error fetching city suggestions:', error);
            });
    }

    function fetchWeatherData(endpoint, queryParams) {
        const queryString = new URLSearchParams(queryParams).toString();
        showLoadingSpinner();

        fetch(`${endpoint}?${queryString}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                hideLoadingSpinner();
                if (data.error) {
                    clearWeatherData();
                    alert(data.error);
                } else {
                    displayWeatherData(data);
                }
            })
            .catch(error => {
                hideLoadingSpinner();
                clearWeatherData();
                alert('There was an error fetching the weather data. Please try again later.');
                console.error(error);
            });
    }

    // === Utility functions ===
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function addToFavorites(city) {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        const cityName = `${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`;

        if (!favorites.includes(cityName)) {
            favorites.push(cityName);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            alert(`${cityName} added to favorites!`);
        } else {
            alert(`${cityName} is already in your favorites.`);
        }
    }

    function removeFromFavorites(city) {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

        // Remove the city from the favorites list
        favorites = favorites.filter(favCity => favCity !== city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    function displayWeatherData(data) {
        const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
        const unit = localStorage.getItem('unit') === 'imperial' ? '°F' : '°C';
        const windUnit = localStorage.getItem('unit') === 'imperial' ? 'mph' : 'm/s';

        document.getElementById('weatherData').innerHTML = `
            <img src="${iconUrl}" alt="Weather Icon" class="weather-icon">
            <h2>${data.name}</h2>
            <p>Temperature: ${data.main.temp}${unit}</p>
            <p>Feels Like: ${data.main.feels_like}${unit}</p>
            <p>Weather: ${data.weather[0].description}</p>
            <p>Humidity: ${data.main.humidity}%</p>
            <p>Wind Speed: ${data.wind.speed} ${windUnit}</p>
            <p>Sunrise: ${sunrise}</p>
            <p>Sunset: ${sunset}</p>
        `;

        // Update the background based on the main weather condition
        updateBackground(data.weather[0].main.toLowerCase());
    }

    function showLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    function hideLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    function clearWeatherData() {
        document.getElementById('weatherData').innerHTML = '';
    }

    function clearCitySuggestions() {
        document.getElementById('citySuggestions').innerHTML = '';
    }

    // Functions for dark mode
    function initDarkMode() {
        const userPreference = localStorage.getItem('darkMode');
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (userPreference === 'enabled' || (userPreference === null && systemPreference)) {
            setDarkMode(true, false);
        } else {
            setDarkMode(false, false);
        }

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('darkMode') === null) {
                setDarkMode(e.matches, false);
            }
        });
    }

    function setDarkMode(enabled, savePreference = true) {
        if (enabled) {
            body.classList.add('dark-mode');
            darkModeToggle.checked = true;
            if (savePreference) localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
            if (savePreference) localStorage.setItem('darkMode', 'disabled');
        }
    }

    function updateBackground(weatherCondition) {
        const body = document.body;
        switch (weatherCondition) {
            case 'clear':
                body.style.background = 'linear-gradient(to bottom, #87CEFA, #f4f4f4)';
                break;
            case 'clouds':
                body.style.background = 'linear-gradient(to bottom, #B0C4DE, #f4f4f4)';
                break;
            case 'rain':
                body.style.background = 'linear-gradient(to bottom, #708090, #f4f4f4)';
                break;
            case 'snow':
                body.style.background = 'linear-gradient(to bottom, #E0FFFF, #f4f4f4)';
                break;
            case 'thunderstorm':
                body.style.background = 'linear-gradient(to bottom, #2F4F4F, #f4f4f4)';
                break;
            case 'drizzle':
                body.style.background = 'linear-gradient(to bottom, #4682B4, #f4f4f4)';
                break;
            default:
                body.style.background = 'linear-gradient(to bottom, #D3D3D3, #f4f4f4)';
                break;
        }
    }

    function loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        console.log('User Favorites:', favorites); // Display favorites in console or UI as needed
    }

    function fetchWeatherByCity(city) {
        const unit = localStorage.getItem('unit') || 'metric';
        console.log(`Fetching weather for favorite city: ${city}`);

        // Extract city name, state (if exists), and country
        const cityParts = city.split(', ');
        const cityName = cityParts.slice(0, cityParts.length - 1).join(', '); // Get everything except country
        const country = cityParts[cityParts.length - 1]; // Last part is the country

        console.log(`Extracted City: ${cityName}, Country: ${country}`);

        fetchWeatherData('/weather', {city: cityName, country, unit});
    }
});