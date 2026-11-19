import { WeatherTranslations } from '../core/weather-translations.js';
import { UIUtils } from '../core/ui-utils.js';

export const WeatherDisplay = {
    init() {
        console.log('Weather Display module initialized');
    },

    formatLocationTime(timestamp, offset = 0) {
        if (!Number.isFinite(timestamp)) return 'Ikke tilgjengelig';
        return new Date((timestamp + offset) * 1000).toLocaleTimeString('no-NO', {
            timeZone: 'UTC', hour: '2-digit', minute: '2-digit'
        });
    },

    iconUrl(code) {
        if (!/^\d{2}[dn]$/.test(code)) return '';
        // These day/night PNGs share a silhouette; keep its color consistent.
        const displayCode = code.replace(/^(01|02|10)n$/, '$1d');
        return `https://openweathermap.org/img/wn/${displayCode}@2x.png`;
    },

    precipitationPercent(pop) {
        return Number.isFinite(pop) && pop >= 0 && pop <= 1 ? Math.round(pop * 100) : null;
    },

    displayWeatherData(data) {
        if (!data.main || !data.weather?.length || !data.sys || !data.coord) {
            throw new Error('Ugyldig respons fra vær-tjenesten');
        }
        const create = UIUtils.createElement;
        const weather = data.weather[0];
        const offset = Number.isFinite(data.timezone) ? data.timezone : 0;
        const isNightTime = weather.icon?.endsWith('n') ?? false;
        const main = create('div', 'weather-main');
        const icon = create('img', 'weather-icon');
        const iconUrl = this.iconUrl(weather.icon);
        icon.alt = WeatherTranslations.translate(weather.description);
        if (iconUrl) {
            icon.src = iconUrl;
            main.appendChild(icon);
        }
        main.append(
            create('h2', '', `${data.name}, ${data.sys.country}`),
            create('div', 'main-temp', `${Math.round(data.main.temp)}°C`),
            create('div', 'weather-description', WeatherTranslations.translate(weather.description))
        );
        const details = create('div', 'weather-details');
        const grid = create('div', 'detail-grid');
        // The current-weather endpoint does not supply UV; only show it when provided.
        const uv = Number.isFinite(data.uvi) && data.uvi >= 0 ? data.uvi : null;
        const values = [
            ['thermometer-half', 'Føles som', `${Math.round(data.main.feels_like)}°C`],
            ['tint', 'Luftfuktighet', `${data.main.humidity}%`],
            ['wind', 'Vind', `${data.wind?.speed ?? '—'} m/s`],
            ...(uv === null ? [] : [['sun', 'UV-indeks', uv]]),
            ['sun', 'Soloppgang', this.formatLocationTime(data.sys.sunrise, offset)],
            ['moon', 'Solnedgang', this.formatLocationTime(data.sys.sunset, offset)]
        ];
        if (values.length === 5) grid.classList.add('five-details');
        values.forEach(([symbol, label, value], index) => {
            const item = create('div', index >= values.length - 2 ? 'detail-item sun-item' : 'detail-item');
            const info = create('div', 'detail-info');
            const title = create('div', 'detail-label');
            const glyph = create('i', `fas fa-${symbol}`);
            glyph.setAttribute('aria-hidden', 'true');
            title.append(glyph, document.createTextNode(` ${label}`));
            info.append(title, create('div', 'detail-value', value));
            item.appendChild(info);
            grid.appendChild(item);
        });
        details.appendChild(grid);
        document.getElementById('weatherData').replaceChildren(main, details);
        this.updateBackground(String(weather.main).toLowerCase(), isNightTime);
        this.fetchAndDisplayForecast(data.coord.lat, data.coord.lon);
        window.WeatherApp?.hideInitialLoader();
    },

    cancelForecast() {
        this.forecastRequestId = (this.forecastRequestId || 0) + 1;
        this.forecastController?.abort();
    },

    async fetchAndDisplayForecast(lat, lon) {
        this.cancelForecast();
        const requestId = this.forecastRequestId;
        this.forecastController = new AbortController();
        try {
            const query = new URLSearchParams({lat, lon, unit: 'metric'});
            const response = await fetch(`/forecast?${query}`, {signal: this.forecastController.signal});
            const data = await response.json();
            if (requestId !== this.forecastRequestId) return;
            if (!response.ok || data.error || !Array.isArray(data.list)) {
                throw new Error('Prognosen er ikke tilgjengelig');
            }
            this.displayHourlyAndDailyForecast(data);
        } catch (error) {
            if (requestId !== this.forecastRequestId || error.name === 'AbortError') return;
            const notice = UIUtils.createElement('p', 'forecast-status', 'Prognosen er ikke tilgjengelig akkurat nå.');
            notice.setAttribute('role', 'status');
            document.getElementById('weatherData').appendChild(notice);
        }
    },

    displayHourlyAndDailyForecast(forecastData) {
        const forecastContainer = document.createElement('div');
        forecastContainer.className = 'forecast-container';

        const hourlyForecasts = this.processHourlyForecastData(forecastData.list);
        const offset = Number.isFinite(forecastData.city?.timezone) ? forecastData.city.timezone : 0;
        const dailyForecasts = this.processDailyForecastData(forecastData.list, offset);

        forecastContainer.innerHTML = `
            <div class="forecast-section">
                <div class="forecast-tabs">
                    <button class="forecast-tab active" data-tab="hourly" aria-pressed="true">Time-for-time prognose</button>
                    <button class="forecast-tab" data-tab="daily" aria-pressed="false">5-dagers prognose</button>
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

        this.displayHourlyForecast(hourlyForecasts, offset);
        console.log('Called displayHourlyForecast from displayHourlyAndDailyForecast');
        this.displayDailyForecast(dailyForecasts, offset);
    },

    setupForecastTabs() {
        const tabs = document.querySelectorAll('.forecast-tab');
        const contents = document.querySelectorAll('.forecast-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-pressed', 'false');
                });
                contents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                tab.setAttribute('aria-pressed', 'true');
                document.querySelector(`.${targetTab}-forecast`).classList.add('active');
            });
        });
    },

    processHourlyForecastData(forecastList) {
        console.log('Processing hourly forecast with 8 items');
        return forecastList.slice(0, 8);
    },

    processDailyForecastData(forecastList, offset = 0) {
        const dailyData = {};

        forecastList.forEach(item => {
            const date = new Date((item.dt + offset) * 1000);
            const dateKey = date.toISOString().slice(0, 10);

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    ...item,
                    temps: [item.main.temp],
                    conditions: [item.weather[0]],
                    probabilities: [item.pop]
                };
            } else {
                dailyData[dateKey].temps.push(item.main.temp);
                dailyData[dateKey].conditions.push(item.weather[0]);
                dailyData[dateKey].probabilities.push(item.pop);
            }
        });

        return Object.values(dailyData).slice(0, 5).map(day => ({
            ...day,
            main: {
                ...day.main,
                temp_min: Math.min(...day.temps),
                temp_max: Math.max(...day.temps)
            },
            weather: [this.getMostCommonCondition(day.conditions)],
            // Highest interval probability, not a calculated whole-day probability.
            pop: day.probabilities.every(pop => this.precipitationPercent(pop) !== null)
                ? Math.max(...day.probabilities) : null
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

    displayHourlyForecast(hourlyForecasts, offset = 0) {
        const create = UIUtils.createElement;
        const items = hourlyForecasts.map(forecast => {
            const item = create('div', 'hourly-item');
            const pop = this.precipitationPercent(forecast.pop);
            const probability = create('div', 'hour-precipitation');
            probability.append(
                create('span', 'precipitation-label', 'Sjanse for nedbør'),
                create('span', '', pop === null ? '—' : `${pop}%`)
            );
            probability.title = pop === null
                ? 'Nedbørssjanse er ikke tilgjengelig'
                : 'Sjanse for regn eller snø i dette 3-timersintervallet';
            probability.setAttribute('aria-label', pop === null
                ? 'Nedbørssjanse er ikke tilgjengelig'
                : `Nedbørssjanse: ${pop} prosent i dette 3-timersintervallet.`);
            item.append(
                create('div', 'hour-time', this.formatLocationTime(forecast.dt, offset)),
                create('div', 'hour-temp', `${Math.round(forecast.main.temp)}°`),
                create('div', 'hour-condition', WeatherTranslations.translate(forecast.weather[0].description)),
                probability,
                create('div', 'hour-wind', `Vind: ${forecast.wind.speed.toFixed(1)} m/s`)
            );
            return item;
        });
        document.getElementById('hourlyDetails').replaceChildren(...items);
    },

    displayDailyForecast(dailyForecasts, offset = 0) {
        const create = UIUtils.createElement;
        const cards = dailyForecasts.map(forecast => {
            const date = new Date((forecast.dt + offset) * 1000);
            const card = create('div', 'daily-card');
            const dateElement = create('div', 'daily-date');
            dateElement.append(
                create('div', 'day-name', date.toLocaleDateString('no-NO', {weekday: 'short', timeZone: 'UTC'})),
                create('div', 'day-date', date.toLocaleDateString('no-NO', {day: 'numeric', month: 'short', timeZone: 'UTC'}))
            );
            const description = WeatherTranslations.translate(forecast.weather[0].description);
            const iconBox = create('div', 'daily-icon');
            const icon = create('img', 'daily-weather-icon');
            const iconUrl = this.iconUrl(forecast.weather[0].icon);
            icon.alt = description;
            if (iconUrl) {
                icon.src = iconUrl;
                iconBox.appendChild(icon);
            }
            const pop = this.precipitationPercent(forecast.pop);
            const probability = create('div', 'precipitation-chance');
            probability.append(
                create('span', 'precipitation-label', 'Sjanse for nedbør'),
                create('span', '', pop === null ? '—' : `${pop}%`)
            );
            probability.title = pop === null
                ? 'Nedbørsannsynlighet er ikke tilgjengelig'
                : 'Høyeste nedbørsannsynlighet i et 3-timers intervall denne dagen';
            probability.setAttribute('aria-label', pop === null
                ? 'Nedbørssjanse er ikke tilgjengelig'
                : `Nedbørssjanse: ${pop} prosent. Høyeste verdi i et 3-timersintervall denne dagen.`);
            iconBox.appendChild(probability);
            const temperatures = create('div', 'daily-temps');
            temperatures.append(
                create('span', 'temp-max', `${Math.round(forecast.main.temp_max)}°`),
                create('span', 'temp-separator', '/'),
                create('span', 'temp-min', `${Math.round(forecast.main.temp_min)}°`)
            );
            card.append(dateElement, iconBox, temperatures, create('div', 'daily-condition', description));
            return card;
        });
        document.getElementById('dailyCards').replaceChildren(...cards);
    },

    clearWeatherData() {
        this.cancelForecast();
        this.clearWeatherAnimations();
        document.getElementById('weatherData').replaceChildren();
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
        (this.animationIntervals || []).forEach(clearInterval);
        (this.animationTimeouts || []).forEach(clearTimeout);
        this.animationIntervals = [];
        this.animationTimeouts = [];
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

            this.animationTimeouts.push(setTimeout(() => {
                if (star.parentNode) {
                    star.remove();
                }
            }, 4000));
        };

        this.animationIntervals.push(setInterval(createShootingStar, Math.random() * 5000 + 3000));

        this.animationTimeouts.push(setTimeout(createShootingStar, Math.random() * 2000));
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
                cloud.style.setProperty('--cloud-color', 'rgba(100, 100, 120, 0.6)');
            }

            container.appendChild(cloud);
        }
    },

    createRain(container, dropCount = 100) {
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            const duration = Math.random() * 0.5 + 0.5;
            drop.className = 'raindrop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDelay = -Math.random() * duration + 's';
            drop.style.animationDuration = duration + 's';
            container.appendChild(drop);
        }
    },

    createSnow(container) {
        const snowflakes = ['❄', '❅', '❆', '✻', '✼', '❇', '❈', '❉', '❊', '❋'];

        for (let i = 0; i < 50; i++) {
            const flake = document.createElement('div');
            const duration = Math.random() * 10 + 5;
            flake.className = 'snowflake';
            flake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
            flake.style.left = Math.random() * 100 + '%';
            flake.style.fontSize = (Math.random() * 20 + 10) + 'px';
            // Start within the existing cycle so snowfall already fills the background.
            flake.style.animationDelay = -Math.random() * duration + 's';
            flake.style.animationDuration = duration + 's';
            container.appendChild(flake);
        }
    },

    createLightning(container, intense = false) {
        const createFlash = () => {
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            container.appendChild(lightning);

            this.animationTimeouts.push(setTimeout(() => {
                if (lightning.parentNode) {
                    lightning.remove();
                }
            }, 200));
        };

        const interval = intense ? (Math.random() * 3000 + 2000) : (Math.random() * 8000 + 5000);

        this.animationIntervals.push(setInterval(createFlash, interval));

        this.animationTimeouts.push(setTimeout(createFlash, Math.random() * 3000));
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
            const duration = Math.random() * 4 + 4;
            particle.className = 'ash-particle';
            particle.style.width = (Math.random() * 6 + 2) + 'px';
            particle.style.height = (Math.random() * 6 + 2) + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = -Math.random() * duration + 's';
            particle.style.animationDuration = duration + 's';
            container.appendChild(particle);
        }
    },

    createHail(container) {
        for (let i = 0; i < 60; i++) {
            const hail = document.createElement('div');
            const duration = Math.random() * 0.4 + 0.6;
            hail.className = `hail ${['small', 'medium', 'large'][Math.floor(Math.random() * 3)]}`;
            hail.style.left = Math.random() * 100 + '%';
            hail.style.animationDelay = -Math.random() * duration + 's';
            hail.style.animationDuration = duration + 's';
            container.appendChild(hail);
        }
    },

    createSleet(container) {
        for (let i = 0; i < 80; i++) {
            const sleet = document.createElement('div');
            const duration = Math.random() * 0.8 + 0.8;
            const isRain = Math.random() > 0.4;
            sleet.className = `sleet ${isRain ? 'rain' : 'ice'}`;
            sleet.style.left = Math.random() * 100 + '%';
            sleet.style.animationDelay = -Math.random() * duration + 's';
            sleet.style.animationDuration = duration + 's';
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
            particle.style.animationDelay = -Math.random() * speed + 's';
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

if (typeof window !== 'undefined') {
    window.WeatherDisplay = WeatherDisplay;
}
