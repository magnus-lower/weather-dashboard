document.addEventListener('DOMContentLoaded', function () {
    const settingsGear = document.getElementById('settingsGear');
    const settingsMenu = document.getElementById('settingsMenu');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const unitToggle = document.getElementById('unitToggle');
    const body = document.body;

    // Variables to store the last fetched location
    let lastLat = null;
    let lastLon = null;

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
        if (unitToggle.checked) {
            localStorage.setItem('unit', 'imperial');
        } else {
            localStorage.setItem('unit', 'metric');
        }

        // Refresh weather data using the last known location or default city
        if (lastLat !== null && lastLon !== null) {
            fetchWeatherByLocation(lastLat, lastLon);
        } else {
            alert('No location data available. Please enter a city name.');
        }
    });

    // Automatically fetch weather by location
    fetchWeatherByLocation();

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

    function fetchWeather() {
        const city = document.getElementById('cityInput').value;
        const country = document.getElementById('countryInput').value || 'NO';
        const unit = localStorage.getItem('unit') || 'metric';

        if (!city) {
            alert('Please enter a city name.');
            return;
        }

        fetchWeatherData('/weather', { city, country, unit });
    }

    function fetchForecast() {
        const city = document.getElementById('cityInput').value;
        const country = document.getElementById('countryInput').value || 'NO';
        const unit = localStorage.getItem('unit') || 'metric';

        if (!city) {
            alert('Please enter a city name.');
            return;
        }

        fetchWeatherData('/forecast', { city, country, unit });
    }

    function fetchWeatherByLocation(lat = null, lon = null) {
        const unit = localStorage.getItem('unit') || 'metric';

        if (lat !== null && lon !== null) {
            fetchWeatherData('/weather_by_coords', { lat, lon, unit });
        } else if (navigator.geolocation) {
            showLoadingSpinner();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lastLat = position.coords.latitude;
                    lastLon = position.coords.longitude;
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