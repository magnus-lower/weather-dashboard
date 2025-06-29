// location-service.js - Handles geolocation and location-based weather
const LocationService = {
    init() {
        console.log('Location Service module initialized');
    },

    // Fetch weather by user's current location
    fetchWeatherByLocation(lat = null, lon = null) {
        const unit = 'metric'; // Fixed to metric

        if (lat !== null && lon !== null) {
            console.log('Fetching weather for provided coordinates:', lat, lon);
            WeatherAPI.reverseGeocode(lat, lon, unit);
        } else if (navigator.geolocation) {
            UIUtils.showLoadingSpinner();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    // Update app state
                    WeatherApp.updateState({
                        lastLat: latitude,
                        lastLon: longitude
                    });

                    console.log('Fetched geolocation:', latitude, longitude);
                    WeatherAPI.reverseGeocode(latitude, longitude, unit);
                },
                (error) => {
                    UIUtils.hideLoadingSpinner();
                    this.handleGeolocationError(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    },

    // Handle geolocation errors
    handleGeolocationError(error) {
        let message = 'Unable to retrieve your location. ';

        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Location access was denied. Please check your location settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Location information is unavailable.';
                break;
            case error.TIMEOUT:
                message += 'Location request timed out.';
                break;
            default:
                message += 'An unknown error occurred.';
                break;
        }

        message += ' Please enter a city name manually.';
        alert(message);
        console.error('Geolocation error:', error);
    },

    // Refresh weather data for last known location
    refreshWeatherData() {
        const state = WeatherApp.getState();
        const unit = 'metric'; // Fixed to metric

        if (state.lastCity && state.lastCountry) {
            WeatherAPI.fetchWeatherData('/weather', {
                city: state.lastCity,
                country: state.lastCountry,
                unit
            });
        } else if (state.lastLat !== null && state.lastLon !== null) {
            WeatherAPI.fetchWeatherData('/weather_by_coords', {
                lat: state.lastLat,
                lon: state.lastLon,
                unit
            });
        } else {
            alert('No location or city data available. Please enter a city name or allow location access.');
        }
    }
};