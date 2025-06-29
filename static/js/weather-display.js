// weather-display.js - Handles weather data display
const WeatherDisplay = {
    init() {
        console.log('Weather Display module initialized');
    },

    // Display current weather data
    displayWeatherData(data) {
        const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
        const unit = '°C';
        const windUnit = 'm/s';

        document.getElementById('weatherData').innerHTML = `
            <img src="${iconUrl}" alt="Værikon" class="weather-icon">
            <h2>${data.name}</h2>
            <p>Temperatur: ${data.main.temp}${unit}</p>
            <p>Føles som: ${data.main.feels_like}${unit}</p>
            <p>Vær: ${data.weather[0].description}</p>
            <p>Luftfuktighet: ${data.main.humidity}%</p>
            <p>Vindhastighet: ${data.wind.speed} ${windUnit}</p>
            <p>Soloppgang: ${sunrise}</p>
            <p>Solnedgang: ${sunset}</p>
        `;

        // Update the background based on the main weather condition
        this.updateBackground(data.weather[0].main.toLowerCase());
    },

    // Clear weather data display
    clearWeatherData() {
        document.getElementById('weatherData').innerHTML = '';
    },

    // Update background based on weather condition
    updateBackground(weatherCondition) {
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
};