// location-service.js - Handles geolocation and location-based weather
const LocationService = {
    init() {
        console.log('Location Service module initialized');
    },

    // Fetch weather by user's current location
    fetchWeatherByLocation(lat = null, lon = null) {
        const unit = 'metric';

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
            alert('Geolokasjon støttes ikke av denne nettleseren.');
        }
    },

    // Handle geolocation errors
    handleGeolocationError(error) {
        let message = 'Unable to retrieve your location. ';

        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Tilgang til lokasjon ble nektet. Vennligst sjekk lokasjonsinnstillingene.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Lokasjonsinformasjon er ikke tilgjengelig.';
                break;
            case error.TIMEOUT:
                message += 'Lokasjonsforespørsel tok for lang tid.';
                break;
            default:
                message += 'En ukjent feil oppstod.';
                break;
        }

        message += ' Vennligst skriv inn et bynavn manuelt.';
        alert(message);
        console.error('Geolocation error:', error);
    },

    // Refresh weather data for last known location
    refreshWeatherData() {
        const state = WeatherApp.getState();
        const unit = 'metric';

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
            alert('Ingen lokasjons- eller bydata tilgjengelig. Vennligst skriv inn et bynavn eller tillat tilgang til lokasjon.');
        }
    }
};