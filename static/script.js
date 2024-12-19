document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('getWeatherBtn').addEventListener('click', fetchWeather);
    document.getElementById('getForecastBtn').addEventListener('click', fetchForecast);
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

function displayForecastData(data) {
    clearWeatherData();
    const forecastContainer = document.getElementById('weatherData');
    const forecastList = data.list;
    const forecastByDate = {};

    // Group forecasts by date
    forecastList.forEach(forecast => {
        const date = forecast.dt_txt.split(' ')[0];
        if (!forecastByDate[date]) {
            forecastByDate[date] = [];
        }
        forecastByDate[date].push(forecast);
    });

    // Display forecast data
    for (const date in forecastByDate) {
        const dateElement = document.createElement('h3');
        dateElement.textContent = new Date(date).toDateString();
        forecastContainer.appendChild(dateElement);

        forecastByDate[date].forEach(forecast => {
            const time = forecast.dt_txt.split(' ')[1].slice(0, 5);
            const forecastElement = document.createElement('div');
            forecastElement.classList.add('forecast-item');
            forecastElement.innerHTML = `
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Temperature:</strong> ${Math.round(forecast.main.temp - 273.15)}°C</p>
                <p><strong>Weather:</strong> ${forecast.weather[0].description}</p>
            `;
            forecastContainer.appendChild(forecastElement);
        });
    }
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
    const country = document.getElementById('countryInput').value || 'NO';
    if (!city) {
        showAlert('Please enter a city name.');
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
                showAlert(data.error);
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
        showAlert('Please enter a city name.');
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
                showAlert(data.error);
            } else {
                displayForecastData(data);
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
        }, error => {
            hideLoadingSpinner();
            showAlert('Unable to retrieve your location.');
            console.error(error);
        });
    } else {
        showAlert('Geolocation is not supported by this browser.');
    }
}
