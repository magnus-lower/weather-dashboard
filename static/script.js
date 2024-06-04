function fetchForecast(lat, lon) {
    fetch(`/forecast?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                let forecastHtml = '<h3>7-day Forecast</h3><ul>';
                data.daily.forEach(day => {
                    forecastHtml += `<li>${new Date(day.dt * 1000).toDateString()}: ${Math.round(day.temp.day - 273.15)}°C, ${day.weather[0].description}</li>`;
                });
                forecastHtml += '</ul>';
                document.getElementById('forecastData').innerHTML = forecastHtml;
            }
        });
}

function fetchWeather() {
    const city = document.getElementById('cityInput').value;
    const country = document.getElementById('countryInput').value || 'NO';
    fetch(`/weather?city=${city}&country=${country}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                document.getElementById('weatherData').innerHTML = `
                    <h2>${data.name}</h2>
                    <p>Temperature: ${Math.round(data.main.temp - 273.15)}°C</p>
                    <p>Weather: ${data.weather[0].description}</p>
                `;
                fetchForecast(data.coord.lat, data.coord.lon);
            }
        });
}
