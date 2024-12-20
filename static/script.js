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
    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();

    document.getElementById('weatherData').innerHTML = `
        <img src="${iconUrl}" alt="Weather Icon" class="weather-icon">
        <h2>${data.name}</h2>
        <p>Temperature: ${Math.round(data.main.temp - 273.15)}°C</p>
        <p>Feels Like: ${Math.round(data.main.feels_like - 273.15)}°C</p>
        <p>Weather: ${data.weather[0].description}</p>
        <p>Humidity: ${data.main.humidity}%</p>
        <p>Wind Speed: ${data.wind.speed} m/s</p>
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
