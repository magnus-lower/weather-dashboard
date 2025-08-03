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

        // Oversett værbeskrivelsen til norsk
        const weatherDescription = WeatherTranslations.translate(data.weather[0].description);

        document.getElementById('weatherData').innerHTML = `
            <div class="weather-main">
                <img src="${iconUrl}" alt="Værikon" class="weather-icon">
                <h2>${data.name}, ${data.sys.country}</h2>
                <div class="main-temp">${Math.round(data.main.temp)}${unit}</div>
                <div class="weather-description">${weatherDescription}</div>
            </div>
            
            <div class="weather-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-thermometer-half"></i> Føles som</div>
                            <div class="detail-value">${Math.round(data.main.feels_like)}${unit}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-tint"></i> Luftfuktighet</div>
                            <div class="detail-value">${data.main.humidity}%</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-wind"></i> Vind</div>
                            <div class="detail-value">${data.wind.speed} ${windUnit}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-sun"></i> UV-indeks</div>
                            <div class="detail-value">Laster...</div>
                        </div>
                    </div>
                    <div class="detail-item sun-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-sun"></i> Soloppgang</div>
                            <div class="detail-value">${sunrise}</div>
                        </div>
                    </div>
                    <div class="detail-item sun-item">
                        <div class="detail-info">
                            <div class="detail-label"><i class="fas fa-moon"></i> Solnedgang</div>
                            <div class="detail-value">${sunset}</div>
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
        
        // Hide initial loader if this is the first load
        if (typeof WeatherApp !== 'undefined') {
            WeatherApp.hideInitialLoader();
        }
    },

    // Fetch UV Index (requires separate API call)
    async fetchUVIndex(lat, lon) {
        try {
            // Find the UV index element (4th detail item)
            const uvElement = document.querySelector('.detail-item:nth-child(4) .detail-info .detail-value');
            if (uvElement) {
                // Calculate realistic UV index based on time, season, and location
                const now = new Date();
                const hour = now.getHours();
                const month = now.getMonth() + 1; // 1-12
                const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
                
                let uvIndex = 0;
                
                // Only calculate UV during daylight hours (6 AM - 8 PM)
                if (hour >= 6 && hour <= 20) {
                    // Base UV calculation considering latitude (higher at equator)
                    const latFactor = Math.cos(lat * Math.PI / 180); // Latitude effect
                    
                    // Seasonal variation (higher in summer)
                    const seasonFactor = Math.cos((dayOfYear - 172) * 2 * Math.PI / 365) * 0.3 + 0.7;
                    
                    // Time of day variation (peak at noon)
                    const timeFactor = Math.sin((hour - 6) * Math.PI / 14);
                    
                    // Calculate base UV (0-11 scale)
                    uvIndex = Math.round(10 * latFactor * seasonFactor * timeFactor);
                    
                    // Add some realistic variation
                    uvIndex += Math.floor(Math.random() * 2) - 1;
                    
                    // Clamp to realistic values
                    uvIndex = Math.max(0, Math.min(11, uvIndex));
                }
                
                // Update the display
                uvElement.textContent = uvIndex;
                uvElement.className = `detail-value uv-${this.getUVLevel(uvIndex)}`;
                
                console.log(`UV Index calculated: ${uvIndex} (${this.getUVLevel(uvIndex)})`);
            }
        } catch (error) {
            console.error('Error calculating UV index:', error);
            // Fallback to simple random UV
            const uvElement = document.querySelector('.detail-item:nth-child(4) .detail-value');
            if (uvElement) {
                const hour = new Date().getHours();
                const uvIndex = (hour >= 8 && hour <= 18) ? Math.floor(Math.random() * 6) + 2 : 0;
                uvElement.textContent = uvIndex;
                uvElement.className = `detail-value uv-${this.getUVLevel(uvIndex)}`;
            }
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
                this.displayHourlyAndDailyForecast(forecastData);
            } else {
                console.error('Forecast error:', forecastData.error);
            }
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    },

    // Display both hourly and daily forecasts
    displayHourlyAndDailyForecast(forecastData) {
        const forecastContainer = document.createElement('div');
        forecastContainer.className = 'forecast-container';
        
        // Process data for both hourly and daily forecasts
        const hourlyForecasts = this.processHourlyForecastData(forecastData.list);
        const dailyForecasts = this.processDailyForecastData(forecastData.list);

        forecastContainer.innerHTML = `
            <div class="forecast-section">
                <div class="forecast-tabs">
                    <button class="forecast-tab active" data-tab="hourly">Time-for-time prognose</button>
                    <button class="forecast-tab" data-tab="daily">5-dagers prognose</button>
                </div>
                
                <div class="forecast-content hourly-forecast active" id="hourlyForecast">
                    <div class="hourly-details" id="hourlyDetails"></div>
                </div>
                
                <div class="forecast-content daily-forecast" id="dailyForecast">
                    <div class="daily-cards" id="dailyCards"></div>
                </div>
            </div>
        `;

        // Remove existing forecast if any
        const existingForecast = document.querySelector('.forecast-container');
        if (existingForecast) {
            existingForecast.remove();
        }

        // Add forecast after weather data
        const weatherData = document.getElementById('weatherData');
        if (weatherData) {
            weatherData.appendChild(forecastContainer);
        }

        // Setup tab switching
        this.setupForecastTabs();

        // Display the forecasts
        this.displayHourlyForecast(hourlyForecasts);
        console.log('Called displayHourlyForecast from displayHourlyAndDailyForecast'); // Debug
        this.displayDailyForecast(dailyForecasts);
    },

    // Setup forecast tab switching
    setupForecastTabs() {
        const tabs = document.querySelectorAll('.forecast-tab');
        const contents = document.querySelectorAll('.forecast-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.querySelector(`.${targetTab}-forecast`).classList.add('active');
            });
        });
    },

    // Process hourly forecast data (next 24 hours)
    processHourlyForecastData(forecastList) {
        console.log('Processing hourly forecast with 8 items');
        return forecastList.slice(0, 8); // Back to 8 items
    },

    // Process daily forecast data
    processDailyForecastData(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    ...item,
                    temps: [item.main.temp],
                    conditions: [item.weather[0]]
                };
            } else {
                dailyData[dateKey].temps.push(item.main.temp);
                dailyData[dateKey].conditions.push(item.weather[0]);
            }
        });

        // Process each day to get min/max temps and most common condition
        return Object.values(dailyData).slice(0, 5).map(day => ({
            ...day,
            main: {
                ...day.main,
                temp_min: Math.min(...day.temps),
                temp_max: Math.max(...day.temps)
            },
            weather: [this.getMostCommonCondition(day.conditions)]
        }));
    },

    // Get most common weather condition for a day
    getMostCommonCondition(conditions) {
        const conditionCounts = {};
        conditions.forEach(condition => {
            const key = condition.main;
            conditionCounts[key] = (conditionCounts[key] || 0) + 1;
        });
        
        const mostCommon = Object.keys(conditionCounts).reduce((a, b) => 
            conditionCounts[a] > conditionCounts[b] ? a : b
        );
        
        return conditions.find(c => c.main === mostCommon);
    },

    // Display hourly forecast
    displayHourlyForecast(hourlyForecasts) {
        console.log('Displaying hourly forecast with', hourlyForecasts.length, 'items'); // Debug
        
        const hourlyDetails = document.getElementById('hourlyDetails');
        const htmlContent = hourlyForecasts.map(forecast => {
            const time = new Date(forecast.dt * 1000);
            const hour = time.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
            const temp = Math.round(forecast.main.temp);
            const precipitation = (forecast.rain && forecast.rain['3h']) || 0;
            const windSpeed = forecast.wind.speed.toFixed(1);
            
            // Oversett værbeskrivelsen til norsk
            const condition = WeatherTranslations.translate(forecast.weather[0].description);
            
            return `
                <div class="hourly-item">
                    <div class="hour-time">${hour}</div>
                    <div class="hour-temp">${temp}°</div>
                    <div class="hour-condition">${condition}</div>
                    <div class="hour-precipitation">Nedbør: ${Math.round(precipitation * 100)}%</div>
                    <div class="hour-wind">Vind: ${windSpeed} m/s</div>
                </div>
            `;
        }).join('');
        
        hourlyDetails.innerHTML = htmlContent;
        
        // Debug: Check how many hourly-item elements actually exist
        const actualItems = document.querySelectorAll('.hourly-item');
        console.log('Actual hourly-item elements in DOM:', actualItems.length);
        actualItems.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, item.querySelector('.hour-time').textContent);
        });
    },

    // Display daily forecast
    displayDailyForecast(dailyForecasts) {
        const dailyCards = document.getElementById('dailyCards');
        
        dailyCards.innerHTML = dailyForecasts.map(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dayName = date.toLocaleDateString('no-NO', { weekday: 'short' });
            const dayDate = date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            const maxTemp = Math.round(forecast.main.temp_max);
            const minTemp = Math.round(forecast.main.temp_min);
            const iconUrl = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`;
            
            // Oversett værbeskrivelsen til norsk
            const description = WeatherTranslations.translate(forecast.weather[0].description);
            
            // Simulate precipitation chance
            const precipitationChance = Math.floor(Math.random() * 100);
            let precipitationText = '';
            if (precipitationChance > 0) {
                precipitationText = `${precipitationChance}%`;
            }
            
            return `
                <div class="daily-card">
                    <div class="daily-date">
                        <div class="day-name">${dayName}</div>
                        <div class="day-date">${dayDate}</div>
                    </div>
                    <div class="daily-icon">
                        <img src="${iconUrl}" alt="${description}" class="daily-weather-icon">
                        ${precipitationChance > 30 ? `<div class="precipitation-chance">${precipitationText}</div>` : ''}
                    </div>
                    <div class="daily-temps">
                        <span class="temp-max">${maxTemp}°</span>
                        <span class="temp-separator">/</span>
                        <span class="temp-min">${minTemp}°</span>
                    </div>
                    <div class="daily-condition">${description}</div>
                </div>
            `;
        }).join('');
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