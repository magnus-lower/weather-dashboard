document.getElementById('loading').style.display = 'none';

function fetchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    const country = document.getElementById('countryInput').value.trim() || 'NO';

    if (!city) {
        alert('Please enter a city name.');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    fetch(`/weather?city=${city}&country=${country}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert(data.error);
                document.getElementById('weatherData').innerHTML = ''; // Clear previous data
                return;
            }
            displayWeather(data);
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error fetching weather data:', error);
            alert('There was an error fetching the weather data. Please try again later.');
            document.getElementById('weatherData').innerHTML = ''; // Clear previous data
        });
}

function fetchWeatherByLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            document.getElementById('loading').style.display = 'block';
            fetch(`/weather_by_coords?lat=${latitude}&lon=${longitude}`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('loading').style.display = 'none';
                    if (data.error) {
                        alert(data.error);
                        document.getElementById('weatherData').innerHTML = ''; // Clear previous data
                        return;
                    }
                    displayWeather(data);
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    console.error('Error fetching weather data by coordinates:', error);
                    alert('There was an error fetching the weather data. Please try again later.');
                    document.getElementById('weatherData').innerHTML = ''; // Clear previous data
                });
        }, error => {
            alert('Geolocation is not supported by this browser.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

function displayWeather(data) {
    const tempC = Math.round(data.main.temp - 273.15);
    const iconCode = data.weather[0].icon;
    const iconUrl = `http://openweathermap.org/img/wn/${iconCode}@2x.png`;

    document.getElementById('weatherData').innerHTML = `
        <h2>${data.name}</h2>
        <p>Temperature: ${tempC}°C</p>
        <p>Weather: ${data.weather[0].description}</p>
        <img src="${iconUrl}" alt="Weather icon">
    `;
}
