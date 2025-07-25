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
            <div class="weather-main">
                <img src="${iconUrl}" alt="Værikon" class="weather-icon">
                <h2>${data.name}, ${data.sys.country}</h2>
                <div class="main-temp">${Math.round(data.main.temp)}${unit}</div>
                <div class="weather-description">${data.weather[0].description}</div>
            </div>
            
            <div class="weather-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Føles som</span>
                        <span class="detail-value">${Math.round(data.main.feels_like)}${unit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Luftfuktighet</span>
                        <span class="detail-value">${data.main.humidity}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Lufttrykk</span>
                        <span class="detail-value">${data.main.pressure} hPa</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Vind</span>
                        <span class="detail-value">${data.wind.speed} ${windUnit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sikt</span>
                        <span class="detail-value">${data.visibility ? (data.visibility / 1000).toFixed(1) + ' km' : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UV-indeks</span>
                        <span class="detail-value">Laster...</span>
                    </div>
                </div>
                
                <div class="sun-times">
                    <div class="sun-item">
                        <div class="sun-icon sunrise"></div>
                        <div class="sun-info">
                            <div class="sun-label">Soloppgang</div>
                            <div class="sun-time">${sunrise}</div>
                        </div>
                    </div>
                    <div class="sun-item">
                        <div class="sun-icon sunset"></div>
                        <div class="sun-info">
                            <div class="sun-label">Solnedgang</div>
                            <div class="sun-time">${sunset}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update the background based on the main weather condition
        this.updateBackground(data.weather[0].main.toLowerCase());
        
        // Fetch additional data
        this.fetchUVIndex(data.coord.lat, data.coord.lon);
        this.fetchAndDisplayForecast(data.name, data.sys.country);
    },

    // Fetch UV Index (requires separate API call)
    async fetchUVIndex(lat, lon) {
        try {
            // Note: OpenWeatherMap's UV Index API requires a separate call
            // For demo purposes, we'll simulate this or use a placeholder
            const uvElement = document.querySelector('.detail-item:nth-child(6) .detail-value');
            if (uvElement) {
                // Simulate UV index based on time of day
                const hour = new Date().getHours();
                let uvIndex = 0;
                if (hour >= 6 && hour <= 18) {
                    uvIndex = Math.floor(Math.random() * 8) + 1; // Random UV 1-8 during day
                }
                
                uvElement.textContent = uvIndex;
                uvElement.className = `detail-value uv-${this.getUVLevel(uvIndex)}`;
            }
        } catch (error) {
            console.error('Error fetching UV index:', error);
        }
    },

    // Get UV level classification
    getUVLevel(uvIndex) {
        if (uvIndex <= 2) return 'low';
        if (uvIndex <= 5) return 'moderate';
        if (uvIndex <= 7) return 'high';
        if (uvIndex <= 10) return 'very-high';
        return 'extreme';
    },

    // Fetch and display 5-day forecast
    async fetchAndDisplayForecast(city, country) {
        try {
            const response = await fetch(`/forecast?city=${encodeURIComponent(city)}&country=${country}&unit=metric`);
            const forecastData = await response.json();
            
            if (!forecastData.error) {
                this.displayForecast(forecastData);
            }
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    },

    // Display 5-day forecast
    displayForecast(forecastData) {
        const forecastContainer = document.createElement('div');
        forecastContainer.className = 'forecast-container';
        forecastContainer.innerHTML = '<h3>5-dagers værvarsel</h3><div class="forecast-cards" id="forecastCards"></div>';

        // Process forecast data - get one entry per day at noon
        const dailyForecasts = this.processForecastData(forecastData.list);
        const forecastCards = forecastContainer.querySelector('#forecastCards');

        dailyForecasts.forEach(forecast => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            
            const date = new Date(forecast.dt * 1000);
            const dayName = date.toLocaleDateString('no-NO', { weekday: 'short' });
            const dayDate = date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            
            card.innerHTML = `
                <div class="forecast-date">${dayName}<br>${dayDate}</div>
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" 
                     alt="${forecast.weather[0].description}" class="forecast-icon">
                <div class="forecast-temps">
                    <span class="temp-max">${Math.round(forecast.main.temp_max)}°</span>
                    <span class="temp-min">${Math.round(forecast.main.temp_min)}°</span>
                </div>
                <div class="forecast-condition">${forecast.weather[0].description}</div>
            `;
            
            forecastCards.appendChild(card);
        });

        // Remove existing forecast if any
        const existingForecast = document.querySelector('.forecast-container');
        if (existingForecast) {
            existingForecast.remove();
        }

        // Add forecast after weather data
        const weatherData = document.getElementById('weatherData');
        weatherData.appendChild(forecastContainer);
    },

    // Process forecast data to get daily forecasts
    processForecastData(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = item;
            }
        });

        return Object.values(dailyData).slice(0, 5); // Get first 5 days
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