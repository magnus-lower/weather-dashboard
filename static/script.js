function fetchWeather() {
    const city = document.getElementById('cityInput').value;
    fetch(`/weather?city=${city}`)
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
            }
        });
}
