document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('getWeatherBtn').addEventListener('click', fetchWeather);
    document.getElementById('getForecastBtn').addEventListener('click', fetchForecast);

    // Automatically fetch weather by location
    fetchWeatherByLocation();
});

function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function clearWeatherData() {
    document.getElementById('weatherData').innerHTML = '';
}

function displayWeatherData(data) {
    const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    document.getElementById('weatherData').innerHTML = `
        <img src="${iconUrl}" alt="Weather Icon" class="weather-icon">
        <h2>${data.name}</h2>
        <p>Temperature: ${Math.round(data.main.temp - 273.15)}°C</p>
        <p>Weather: ${data.weather[0].description}</p>
    `;
}

function handleFetchError(error) {
    hideLoadingSpinner();
    clearWeatherData();
    alert('There was an error fetching the weather data. Please try again later.');
    console.error(error);
}

function fetchWeather() {
    const city = document.getElementById('cityInput').value;
    const country = document.getElementById('countryInput').value || 'NO';
    if (!city) {
        alert('Please enter a city name.');
        return;
    }
    showLoadingSpinner();
    fetch(`/weather?city=${city}&country=${country}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
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

function fetchForecast() {
    const city = document.getElementById('cityInput').value;
    const country = document.getElementById('countryInput').value || 'NO';
    if (!city) {
        alert('Please enter a city name.');
        return;
    }
    showLoadingSpinner();
    fetch(`/forecast?city=${city}&country=${country}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
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

function fetchWeatherByLocation() {
    if (navigator.geolocation) {
        showLoadingSpinner();
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetch(`/weather_by_coords?lat=${lat}&lon=${lon}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    hideLoadingSpinner();
                    if (data.error) {
                        clearWeatherData();
                        alert(data.error);
                    } else {
                        displayWeatherData(data);
                    }
                })
                .catch(handleFetchError);
        }, error => {
            hideLoadingSpinner();
            alert('Unable to retrieve your location.');
            console.error(error);
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}