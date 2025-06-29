// forecast-service.js - Handles weather forecast functionality
const ForecastService = {
    // Fetch 5-day weather forecast
    fetchForecast(city, country) {
        const unit = 'metric';
        UIUtils.showLoadingSpinner();

        const queryParams = {
            city,
            country,
            unit
        };

        const queryString = new URLSearchParams(queryParams).toString();

        fetch(`/forecast?${queryString}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                UIUtils.hideLoadingSpinner();
                if (data.error) {
                    console.log('Forecast error:', data.error); // Log instead of alert
                } else {
                    this.displayForecast(data);
                }
            })
            .catch(error => {
                UIUtils.hideLoadingSpinner();
                console.log('Forecast fetch error:', error); // Log instead of alert
            });
    },

    // Display forecast data
    displayForecast(data) {
        const forecastContainer = document.getElementById('forecastContainer');
        if (!forecastContainer) {
            // Create forecast container if it doesn't exist
            const weatherDataSection = document.getElementById('weatherData');
            const container = document.createElement('div');
            container.id = 'forecastContainer';
            container.className = 'forecast-container';
            container.innerHTML = '<h3>5-dagers varsel</h3>';

            // Insert after weather data
            weatherDataSection.after(container);
        } else {
            // Clear existing forecast data
            forecastContainer.innerHTML = '<h3>5-dagers varsel</h3>';
        }

        // Group forecast data by day
        const dailyForecasts = this.groupForecastsByDay(data.list);
        const unit = '°C';

        // Create a card for each day
        const forecastCards = document.createElement('div');
        forecastCards.className = 'forecast-cards';

        Object.keys(dailyForecasts).forEach(date => {
            const forecasts = dailyForecasts[date];

            // Calculate min/max temperature and most common weather condition for the day
            const minTemp = Math.min(...forecasts.map(f => f.main.temp_min)).toFixed(1);
            const maxTemp = Math.max(...forecasts.map(f => f.main.temp_max)).toFixed(1);

            // Find most common weather condition
            const weatherCounts = {};
            forecasts.forEach(f => {
                const condition = f.weather[0].main;
                weatherCounts[condition] = (weatherCounts[condition] || 0) + 1;
            });

            const mostCommonWeather = Object.keys(weatherCounts).reduce((a, b) =>
                weatherCounts[a] > weatherCounts[b] ? a : b);

            // Get icon for the most common weather
            const weatherIcon = forecasts.find(f => f.weather[0].main === mostCommonWeather).weather[0].icon;

            // Format date
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            // Create the forecast card
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="forecast-date">${formattedDate}</div>
                <img src="https://openweathermap.org/img/wn/${weatherIcon}@2x.png" alt="${mostCommonWeather}" class="forecast-icon">
                <div class="forecast-temps">
                    <span class="temp-max">${maxTemp}${unit}</span>
                    <span class="temp-min">${minTemp}${unit}</span>
                </div>
                <div class="forecast-condition">${mostCommonWeather}</div>
            `;

            forecastCards.appendChild(card);
        });

        document.getElementById('forecastContainer').appendChild(forecastCards);
    },

    // Helper function to group forecasts by day
    groupForecastsByDay(forecastList) {
        const dailyForecasts = {};

        forecastList.forEach(forecast => {
            // Get date part only (YYYY-MM-DD)
            const date = forecast.dt_txt.split(' ')[0];

            if (!dailyForecasts[date]) {
                dailyForecasts[date] = [];
            }

            dailyForecasts[date].push(forecast);
        });

        return dailyForecasts;
    }
};