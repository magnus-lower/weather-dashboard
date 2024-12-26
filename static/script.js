document.addEventListener('DOMContentLoaded', function () {
    const settingsGear = document.getElementById('settingsGear');
    const settingsMenu = document.getElementById('settingsMenu');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const unitToggle = document.getElementById('unitToggle');
    const getWeatherBtn = document.getElementById('getWeatherBtn');
    const getForecastBtn = document.getElementById('getForecastBtn');
    const body = document.body;

document.getElementById('cityInput').addEventListener(
    'input',
    debounce(function (event) {
        const query = event.target.value.trim();
        if (query.length > 0) { // Fetch suggestions for any input
            fetchCitySuggestions(query);
        } else {
            clearCitySuggestions(); // Clear suggestions when input is empty
        }
    }, 300) // 300ms debounce delay
);

    // Variables to store the last fetched location and city
    let lastLat = null;
    let lastLon = null;
    let lastCity = null;
    let lastCountry = null;

    // Initialize dark mode
    initDarkMode();

    // Check saved preferences for units
    if (localStorage.getItem('unit') === 'imperial') {
        unitToggle.checked = true;
    }

    // Open settings menu when gear icon is clicked
    settingsGear.addEventListener('click', function () {
        settingsMenu.style.display = 'block';
    });

    // Close settings menu when "Close" button is clicked
    closeSettings.addEventListener('click', function () {
        settingsMenu.style.display = 'none';
    });

    // Handle dark mode toggle
    darkModeToggle.addEventListener('change', function () {
        if (darkModeToggle.checked) {
            setDarkMode(true);
        } else {
            setDarkMode(false);
        }
    });

    // Handle unit toggle
    unitToggle.addEventListener('change', function () {
        const unit = unitToggle.checked ? 'imperial' : 'metric';
        localStorage.setItem('unit', unit);

        console.log('Unit changed to:', unit);

        // Refresh weather data based on the last searched city or location
        if (lastCity && lastCountry) {
            console.log('Fetching weather for last searched city:', lastCity, lastCountry);
            fetchWeatherData('/weather', { city: lastCity, country: lastCountry, unit });
        } else if (lastLat !== null && lastLon !== null) {
            console.log('Fetching weather for last known location:', lastLat, lastLon);
            fetchWeatherData('/weather_by_coords', { lat: lastLat, lon: lastLon, unit });
        } else {
            alert('No location or city data available. Please enter a city name or allow location access.');
        }
    });

    // Bind click events to buttons
    getWeatherBtn.addEventListener('click', function () {
        fetchWeather();
    });

    getForecastBtn.addEventListener('click', function () {
        fetchForecast();
    });

    // Automatically fetch weather by location
    fetchWeatherByLocation();

    // Fetch weather by city
    function fetchWeather() {
        const city = document.getElementById('cityInput').value.trim();
        const country = document.getElementById('countryInput').value.trim() || 'NO';
        const unit = localStorage.getItem('unit') || 'metric';

        if (!city) {
            alert('Please enter a city name.');
            return;
        }

        console.log('Fetching weather for city:', city, country);

        // Update the last searched city and country
        lastCity = city;
        lastCountry = country;

        fetchWeatherData('/weather', { city, country, unit });
    }

    // Fetch 5-day forecast by city
    function fetchForecast() {
        const city = document.getElementById('cityInput').value.trim();
        const country = document.getElementById('countryInput').value.trim() || 'NO';
        const unit = localStorage.getItem('unit') || 'metric';

        if (!city) {
            alert('Please enter a city name.');
            return;
        }

        console.log('Fetching forecast for city:', city, country);

        fetchWeatherData('/forecast', { city, country, unit });
    }

    function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function fetchCitySuggestions(query) {
    const apiKey = 'b40f58d271f8c91caba8162e6f87689d'; // Use your .env value securely
    const endpoint = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=10&appid=${apiKey}`;

    fetch(endpoint)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch city suggestions');
            }
            return response.json();
        })
        .then((data) => {
            const suggestionsList = document.getElementById('citySuggestions');
            suggestionsList.innerHTML = ''; // Clear previous suggestions

            if (data.length > 0) {
                data.forEach((city) => {
                    const state = city.state ? `, ${city.state}` : ''; // Optional state
                    const option = document.createElement('option');
                    option.value = `${city.name}${state}, ${city.country}`;
                    suggestionsList.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = `No matching cities found for "${query}"`;
                suggestionsList.appendChild(option);
            }
        })
        .catch((error) => {
            console.error('Error fetching city suggestions:', error);
        });
}

function clearCitySuggestions() {
    document.getElementById('citySuggestions').innerHTML = '';
}

    // Fetch weather by location
    function fetchWeatherByLocation(lat = null, lon = null) {
        const unit = localStorage.getItem('unit') || 'metric';

        if (lat !== null && lon !== null) {
            console.log('Fetching weather for location:', lat, lon);
            fetchWeatherData('/weather_by_coords', { lat, lon, unit });
        } else if (navigator.geolocation) {
            showLoadingSpinner();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lastLat = position.coords.latitude;
                    lastLon = position.coords.longitude;
                    console.log('Fetched geolocation:', lastLat, lastLon);
                    fetchWeatherData('/weather_by_coords', {
                        lat: lastLat,
                        lon: lastLon,
                        unit,
                    });
                },
                (error) => {
                    hideLoadingSpinner();
                    alert('Unable to retrieve your location.');
                    console.error(error);
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
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

    // Generalized fetch function
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
            .catch(handleFetchError);
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

    function showLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    function hideLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    function clearWeatherData() {
        document.getElementById('weatherData').innerHTML = '';
    }

    function handleFetchError(error) {
        hideLoadingSpinner();
        clearWeatherData();
        alert('There was an error fetching the weather data. Please try again later.');
        console.error(error);
    }
});