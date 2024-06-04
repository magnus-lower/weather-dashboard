document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('getWeatherBtn').addEventListener('click', fetchWeather);
    document.getElementById('getWeatherByLocationBtn').addEventListener('click', fetchWeatherByLocation);
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
    document.getElementById('weatherData').innerHTML = `
        <h2>${data.name}</h2>
        <p>Temperature: ${Math.round(data.main.temp - 273.15)}°C</p>
        <p>Weather: ${data.weather[0].description}</p>
    `;
}

function showAlert(message) {
    alert(message);
}

function handleFetchError(error) {
    hideLoadingSpinner();
    clearWeatherData();
    showAlert('There was an error fetching the weather data. Please try again later.');
    console.error(error);
}

function fetchWeather() {
    const city = document.getElementById('cityInput').value;
    const country = document.getElementById('countryInput').value || 'NO'; // Default to 'NO' if no country code is provided
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
                showAlert(data.error);
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
                        showAlert(data.error);
                    } else {
                        displayWeatherData(data);
                    }
                })
                .catch(handleFetchError);
        });
    } else {
        showAlert('Geolocation is not supported by this browser.');
    }
}
