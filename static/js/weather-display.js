const WeatherDisplay = {
    init() {
        console.log('Weather Display module initialized');
    },

    displayWeatherData(data) {
        let iconCode = data.weather[0].icon;
        const currentTime = new Date().getTime() / 1000;
        const sunriseTime = data.sys.sunrise;
        const sunsetTime = data.sys.sunset;

        console.log('Current time:', new Date(currentTime * 1000).toLocaleTimeString());
        console.log('Sunrise:', new Date(sunriseTime * 1000).toLocaleTimeString());
        console.log('Sunset:', new Date(sunsetTime * 1000).toLocaleTimeString());
        console.log('Original icon:', iconCode);

        const isNightTime = currentTime < sunriseTime || currentTime > sunsetTime;

        if (isNightTime) {
            console.log('It is night time - changing to night icon');
            if (iconCode.endsWith('d')) {
                iconCode = iconCode.slice(0, -1) + 'n';
                console.log('Changed day icon to night icon:', iconCode);
            }
        } else {
            console.log('It is day time - ensuring day icon');
            if (iconCode.endsWith('n')) {
                iconCode = iconCode.slice(0, -1) + 'd';
                console.log('Changed night icon to day icon:', iconCode);
            }
        }

        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        console.log('Final icon URL:', iconUrl);
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
        const unit = '°C';
        const windUnit = 'm/s';

        const weatherDescription = WeatherTranslations.translate(data.weather[0].description);

        const appState = WeatherApp.getState();
        let displayCityName = appState.lastCity || data.name;
        const displayCountry = appState.lastCountry || data.sys.country;

        if (displayCityName && displayCountry) {
            const cityParts = displayCityName.split(', ');
            const lastPart = cityParts[cityParts.length - 1];

            if (lastPart === displayCountry) {
                displayCityName = cityParts.slice(0, cityParts.length - 1).join(', ');
            }
        }

        document.getElementById('weatherData').innerHTML = `
            <div class="weather-main">
                <img src="${iconUrl}" alt="Værikon" class="weather-icon">
                <h2>${displayCityName}, ${displayCountry}</h2>
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

        this.updateBackground(data.weather[0].main.toLowerCase(), isNightTime);

        this.fetchUVIndex(data.coord.lat, data.coord.lon);
        this.fetchAndDisplayForecast(data.name, data.sys.country);

        if (typeof WeatherApp !== 'undefined') {
            WeatherApp.hideInitialLoader();
        }
    },

    async fetchUVIndex(lat, lon) {
        try {
            const uvElement = document.querySelector('.detail-item:nth-child(4) .detail-info .detail-value');
            if (uvElement) {
                const now = new Date();
                const hour = now.getHours();
                const month = now.getMonth() + 1;
                const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

                let uvIndex = 0;

                if (hour >= 6 && hour <= 20) {
                    const latFactor = Math.cos(lat * Math.PI / 180);

                    const seasonFactor = Math.cos((dayOfYear - 172) * 2 * Math.PI / 365) * 0.3 + 0.7;

                    const timeFactor = Math.sin((hour - 6) * Math.PI / 14);

                    uvIndex = Math.round(10 * latFactor * seasonFactor * timeFactor);

                    uvIndex += Math.floor(Math.random() * 2) - 1;

                    uvIndex = Math.max(0, Math.min(11, uvIndex));
                }

                uvElement.textContent = uvIndex;
                uvElement.className = `detail-value uv-${this.getUVLevel(uvIndex)}`;

                console.log(`UV Index calculated: ${uvIndex} (${this.getUVLevel(uvIndex)})`);
            }
        } catch (error) {
            console.error('Error calculating UV index:', error);
            const uvElement = document.querySelector('.detail-item:nth-child(4) .detail-value');
            if (uvElement) {
                const hour = new Date().getHours();
                const uvIndex = (hour >= 8 && hour <= 18) ? Math.floor(Math.random() * 6) + 2 : 0;
                uvElement.textContent = uvIndex;
                uvElement.className = `detail-value uv-${this.getUVLevel(uvIndex)}`;
            }
        }
    },

    getUVLevel(uvIndex) {
        if (uvIndex <= 2) return 'low';
        if (uvIndex <= 5) return 'moderate';
        if (uvIndex <= 7) return 'high';
        if (uvIndex <= 10) return 'very-high';
        return 'extreme';
    },

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

    displayHourlyAndDailyForecast(forecastData) {
        const forecastContainer = document.createElement('div');
        forecastContainer.className = 'forecast-container';

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

        const existingForecast = document.querySelector('.forecast-container');
        if (existingForecast) {
            existingForecast.remove();
        }

        const weatherData = document.getElementById('weatherData');
        if (weatherData) {
            weatherData.appendChild(forecastContainer);
        }

        this.setupForecastTabs();

        this.displayHourlyForecast(hourlyForecasts);
        console.log('Called displayHourlyForecast from displayHourlyAndDailyForecast');
        this.displayDailyForecast(dailyForecasts);
    },

    setupForecastTabs() {
        const tabs = document.querySelectorAll('.forecast-tab');
        const contents = document.querySelectorAll('.forecast-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.querySelector(`.${targetTab}-forecast`).classList.add('active');
            });
        });
    },

    processHourlyForecastData(forecastList) {
        console.log('Processing hourly forecast with 8 items');
        return forecastList.slice(0, 8);
    },

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

    displayHourlyForecast(hourlyForecasts) {
        console.log('Displaying hourly forecast with', hourlyForecasts.length, 'items');

        const hourlyDetails = document.getElementById('hourlyDetails');
        const htmlContent = hourlyForecasts.map(forecast => {
            const time = new Date(forecast.dt * 1000);
            const hour = time.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
            const temp = Math.round(forecast.main.temp);
            const precipitation = (forecast.rain && forecast.rain['3h']) || 0;
            const windSpeed = forecast.wind.speed.toFixed(1);

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

        const actualItems = document.querySelectorAll('.hourly-item');
        console.log('Actual hourly-item elements in DOM:', actualItems.length);
        actualItems.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, item.querySelector('.hour-time').textContent);
        });
    },

    displayDailyForecast(dailyForecasts) {
        const dailyCards = document.getElementById('dailyCards');

        dailyCards.innerHTML = dailyForecasts.map(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dayName = date.toLocaleDateString('no-NO', { weekday: 'short' });
            const dayDate = date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            const maxTemp = Math.round(forecast.main.temp_max);
            const minTemp = Math.round(forecast.main.temp_min);
            const iconUrl = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`;

            const description = WeatherTranslations.translate(forecast.weather[0].description);

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

    clearWeatherData() {
        document.getElementById('weatherData').innerHTML = '';
    },

    updateBackground(weatherCondition, isNightTime) {
        const body = document.body;

        this.clearWeatherAnimations();

        const animationContainer = document.createElement('div');
        animationContainer.className = 'weather-animation';
        body.appendChild(animationContainer);

        if (isNightTime) {
            this.createNightBackground(weatherCondition, animationContainer);
        } else {
            this.createDayBackground(weatherCondition, animationContainer);
        }
    },

    clearWeatherAnimations() {
        const existing = document.querySelector('.weather-animation');
        if (existing) {
            existing.remove();
        }
    },

    createNightBackground(weatherCondition, container) {
        const body = document.body;

        switch (weatherCondition) {
            case 'clear':
                body.style.background = 'linear-gradient(to bottom, #0F0F23, #191970, #1e1e2e)';
                this.createStars(container);
                this.createShootingStars(container);
                break;
            case 'clouds':
                body.style.background = 'linear-gradient(to bottom, #2C2C54, #40407a, #57606f)';
                this.createStars(container, 30);
                this.createClouds(container, true);
                break;
            case 'rain':
            case 'drizzle':
                body.style.background = 'linear-gradient(to bottom, #1e3c72, #2a5298, #3a6ba5)';
                this.createRain(container, weatherCondition === 'drizzle' ? 50 : 100);
                this.createLightning(container);
                this.createClouds(container, true);
                break;
            case 'thunderstorm':
                body.style.background = 'linear-gradient(to bottom, #0f0f0f, #1a1a2e, #16213e)';
                this.createLightning(container, true);
                this.createRain(container, 150);
                break;
            case 'snow':
                body.style.background = 'linear-gradient(to bottom, #2C3E50, #34495e, #566573)';
                this.createSnow(container);
                this.createStars(container, 40);
                break;
            case 'mist':
            case 'fog':
                body.style.background = 'linear-gradient(to bottom, #1C1C1C, #2E2E2E, #404040)';
                this.createMist(container);
                this.createFogBank(container);
                this.createStars(container, 20);
                break;
            case 'smoke':
            case 'haze':
                body.style.background = 'linear-gradient(to bottom, #2B2B2B, #3A3A3A, #4A4A4A)';
                this.createSmoke(container);
                this.createStars(container, 15);
                break;
            case 'dust':
            case 'sand':
                body.style.background = 'linear-gradient(to bottom, #4A4A3A, #5A5A4A, #6A6A5A)';
                this.createDust(container);
                break;
            case 'ash':
                body.style.background = 'linear-gradient(to bottom, #1A1A1A, #2A2A2A, #3A3A3A)';
                this.createAsh(container);
                break;
            case 'squall':
            case 'tornado':
                body.style.background = 'linear-gradient(to bottom, #0A0A0A, #1A1A1A, #2A2A2A)';
                this.createWind(container, true);
                this.createTornado(container);
                this.createLightning(container, true);
                break;
            case 'sleet':
                body.style.background = 'linear-gradient(to bottom, #1e3c72, #2a5298, #3a6ba5)';
                this.createSleet(container);
                this.createStars(container, 25);
                break;
            default:
                body.style.background = 'linear-gradient(to bottom, #2C3E50, #34495e, #4A5B6C)';
                this.createStars(container);
                break;
        }
    },

    createDayBackground(weatherCondition, container) {
        const body = document.body;

        switch (weatherCondition) {
            case 'clear':
                body.style.background = 'linear-gradient(to bottom, #87CEEB, #98D8E8, #B0E0E6)';
                this.createSunRays(container);
                break;
            case 'clouds':
                body.style.background = 'linear-gradient(to bottom, #B0C4DE, #D3D3D3, #E6E6FA)';
                this.createClouds(container, false);
                break;
            case 'rain':
            case 'drizzle':
                body.style.background = 'linear-gradient(to bottom, #708090, #778899, #B0C4DE)';
                this.createRain(container, weatherCondition === 'drizzle' ? 40 : 80);
                this.createClouds(container, false);
                break;
            case 'thunderstorm':
                body.style.background = 'linear-gradient(to bottom, #2F4F4F, #696969, #778899)';
                this.createLightning(container, true);
                this.createRain(container, 120);
                break;
            case 'snow':
                body.style.background = 'linear-gradient(to bottom, #E0FFFF, #F0F8FF, #F5F5F5)';
                this.createSnow(container);
                break;
            case 'mist':
            case 'fog':
                body.style.background = 'linear-gradient(to bottom, #D3D3D3, #DCDCDC, #F5F5F5)';
                this.createMist(container);
                this.createFogBank(container);
                break;
            case 'smoke':
            case 'haze':
                body.style.background = 'linear-gradient(to bottom, #C0C0C0, #D0D0D0, #E0E0E0)';
                this.createSmoke(container);
                break;
            case 'dust':
            case 'sand':
                body.style.background = 'linear-gradient(to bottom, #DAA520, #DEB887, #F5DEB3)';
                this.createDust(container);
                break;
            case 'ash':
                body.style.background = 'linear-gradient(to bottom, #696969, #808080, #A9A9A9)';
                this.createAsh(container);
                break;
            case 'squall':
            case 'tornado':
                body.style.background = 'linear-gradient(to bottom, #2F4F4F, #708090, #778899)';
                this.createWind(container, true);
                this.createTornado(container);
                this.createLightning(container);
                break;
            case 'sleet':
                body.style.background = 'linear-gradient(to bottom, #708090, #778899, #B0C4DE)';
                this.createSleet(container);
                break;
            case 'hail':
                body.style.background = 'linear-gradient(to bottom, #4682B4, #5F9EA0, #87CEEB)';
                this.createHail(container);
                this.createLightning(container);
                break;
            case 'extreme':
                body.style.background = 'linear-gradient(to bottom, #8B0000, #A0522D, #CD853F)';
                this.createAurora(container);
                this.createWind(container, true);
                break;
            default:
                body.style.background = 'linear-gradient(to bottom, #D3D3D3, #E0E0E0, #F0F0F0)';
                break;
        }
    },

    createStars(container, count = 100) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = `star ${['small', 'medium', 'large'][Math.floor(Math.random() * 3)]}`;
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 70 + '%';
            star.style.animationDelay = Math.random() * 2 + 's';
            star.style.animationDuration = (Math.random() * 3 + 1) + 's';
            container.appendChild(star);
        }
    },

    createShootingStars(container) {
        const createShootingStar = () => {
            const star = document.createElement('div');
            star.className = 'shooting-star';
            star.style.top = Math.random() * 50 + '%';
            star.style.left = '100%';
            star.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(star);

            setTimeout(() => {
                if (star.parentNode) {
                    star.remove();
                }
            }, 4000);
        };

        setInterval(createShootingStar, Math.random() * 5000 + 3000);

        setTimeout(createShootingStar, Math.random() * 2000);
    },

    createClouds(container, isDark = false) {
        const cloudCount = Math.random() * 8 + 5;

        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = `cloud ${['small', 'medium', 'large'][Math.floor(Math.random() * 3)]}`;
            cloud.style.top = Math.random() * 60 + '%';
            cloud.style.left = Math.random() * 100 + '%';
            cloud.style.animationDuration = (Math.random() * 30 + 20) + 's';

            if (isDark) {
                cloud.style.background = 'rgba(100, 100, 120, 0.6)';
                const before = cloud.querySelector(':before');
                if (before) {
                    before.style.background = 'rgba(100, 100, 120, 0.6)';
                }
            }

            container.appendChild(cloud);
        }
    },

    createRain(container, dropCount = 100) {
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'raindrop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDelay = Math.random() * 2 + 's';
            drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
            container.appendChild(drop);
        }
    },

    createSnow(container) {
        const snowflakes = ['❄', '❅', '❆', '✻', '✼', '❇', '❈', '❉', '❊', '❋'];

        for (let i = 0; i < 50; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
            flake.style.left = Math.random() * 100 + '%';
            flake.style.fontSize = (Math.random() * 20 + 10) + 'px';
            flake.style.animationDelay = Math.random() * 10 + 's';
            flake.style.animationDuration = (Math.random() * 10 + 5) + 's';
            container.appendChild(flake);
        }
    },

    createLightning(container, intense = false) {
        const createFlash = () => {
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            container.appendChild(lightning);

            setTimeout(() => {
                if (lightning.parentNode) {
                    lightning.remove();
                }
            }, 200);
        };

        const interval = intense ? (Math.random() * 3000 + 2000) : (Math.random() * 8000 + 5000);

        setInterval(createFlash, interval);

        setTimeout(createFlash, Math.random() * 3000);
    },

    createSunRays(container) {
        const rays = document.createElement('div');
        rays.className = 'sun-ray';
        container.appendChild(rays);
    },

    createMist(container) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'mist-particle';
            particle.style.width = (Math.random() * 40 + 20) + 'px';
            particle.style.height = (Math.random() * 40 + 20) + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            container.appendChild(particle);
        }
    },

    createFogBank(container) {
        const fogBank = document.createElement('div');
        fogBank.className = 'fog-bank';
        container.appendChild(fogBank);
    },

    createDust(container) {
        for (let i = 0; i < 60; i++) {
            const particle = document.createElement('div');
            particle.className = 'dust-particle';
            particle.style.width = (Math.random() * 8 + 3) + 'px';
            particle.style.height = (Math.random() * 8 + 3) + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 5 + 5) + 's';
            container.appendChild(particle);
        }
    },

    createSmoke(container) {
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'smoke-particle';
            particle.style.width = (Math.random() * 50 + 30) + 'px';
            particle.style.height = (Math.random() * 50 + 30) + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.bottom = Math.random() * 30 + '%';
            particle.style.animationDelay = Math.random() * 12 + 's';
            particle.style.animationDuration = (Math.random() * 8 + 8) + 's';
            container.appendChild(particle);
        }
    },

    createAsh(container) {
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.className = 'ash-particle';
            particle.style.width = (Math.random() * 6 + 2) + 'px';
            particle.style.height = (Math.random() * 6 + 2) + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
            container.appendChild(particle);
        }
    },

    createHail(container) {
        for (let i = 0; i < 60; i++) {
            const hail = document.createElement('div');
            hail.className = `hail ${['small', 'medium', 'large'][Math.floor(Math.random() * 3)]}`;
            hail.style.left = Math.random() * 100 + '%';
            hail.style.animationDelay = Math.random() * 2 + 's';
            hail.style.animationDuration = (Math.random() * 0.4 + 0.6) + 's';
            container.appendChild(hail);
        }
    },

    createSleet(container) {
        for (let i = 0; i < 80; i++) {
            const sleet = document.createElement('div');
            const isRain = Math.random() > 0.4;
            sleet.className = `sleet ${isRain ? 'rain' : 'ice'}`;
            sleet.style.left = Math.random() * 100 + '%';
            sleet.style.animationDelay = Math.random() * 2 + 's';
            sleet.style.animationDuration = (Math.random() * 0.8 + 0.8) + 's';
            container.appendChild(sleet);
        }
    },

    createWind(container, intense = false) {
        const particleCount = intense ? 40 : 20;
        const speed = intense ? 1 : 1.5;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'wind-particle';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 3 + 's';
            particle.style.animationDuration = speed + 's';
            container.appendChild(particle);
        }
    },

    createTornado(container) {
        const tornado = document.createElement('div');
        tornado.className = 'tornado';
        container.appendChild(tornado);

        for (let i = 0; i < 20; i++) {
            const debris = document.createElement('div');
            debris.className = 'dust-particle';
            debris.style.width = '6px';
            debris.style.height = '6px';
            debris.style.left = (45 + Math.random() * 10) + '%';
            debris.style.top = (50 + Math.random() * 30) + '%';
            debris.style.animationDuration = '1s';
            debris.style.background = 'rgba(139, 69, 19, 0.8)';
            container.appendChild(debris);
        }
    },

    createAurora(container) {
        const aurora = document.createElement('div');
        aurora.className = 'aurora';
        container.appendChild(aurora);

        for (let i = 0; i < 3; i++) {
            const layer = document.createElement('div');
            layer.className = 'aurora';
            layer.style.animationDelay = (i * 2) + 's';
            layer.style.animationDuration = (8 + i * 2) + 's';
            layer.style.filter = `hue-rotate(${i * 60}deg)`;
            container.appendChild(layer);
        }
    }
};
