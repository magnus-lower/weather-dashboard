import { WeatherAPI } from '../api/weather-api.js';
import { UIUtils } from '../core/ui-utils.js';

export const LocationService = {
    init() {
        console.log('Location Service module initialized');
        setTimeout(() => {
            this.tryAutoLocation();
        }, 100);
    },

    tryAutoLocation() {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported by this browser');
            return;
        }

        console.log('Attempting to get user location automatically...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log('Auto-location successful:', latitude, longitude);

                if (window.WeatherApp) {
                    window.WeatherApp.updateState({
                        lastLat: latitude,
                        lastLon: longitude
                    });
                }

                UIUtils.showLoadingSpinner();

                WeatherAPI.reverseGeocode(latitude, longitude, 'metric');
            },
            (error) => {
                console.log('Auto-location failed:', this.getErrorMessage(error));
                console.log('User can manually enter city name or click location button');

                if (window.WeatherApp) {
                    setTimeout(() => {
                        window.WeatherApp.hideInitialLoader();
                    }, 1000);
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 600000
            }
        );
    },

    fetchWeatherByLocation(lat = null, lon = null) {
        const unit = 'metric';

        if (lat !== null && lon !== null) {
            console.log('Fetching weather for provided coordinates:', lat, lon);
            UIUtils.showLoadingSpinner();
            WeatherAPI.reverseGeocode(lat, lon, unit);
            return;
        }

        if (!navigator.geolocation) {
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no'
                ? 'Geolokasjon støttes ikke av denne nettleseren. Vennligst skriv inn et bynavn manuelt.'
                : 'Geolocation is not supported by this browser. Please enter a city name manually.';
            alert(message);
            return;
        }

        UIUtils.showLoadingSpinner();

        console.log('Requesting user location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                if (window.WeatherApp) {
                    window.WeatherApp.updateState({
                        lastLat: latitude,
                        lastLon: longitude
                    });
                }

                console.log('Fetched geolocation:', latitude, longitude);

                WeatherAPI.reverseGeocode(latitude, longitude, unit);
            },
            (error) => {
                UIUtils.hideLoadingSpinner();
                this.handleGeolocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000
            }
        );
    },

    getErrorMessage(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                return 'Permission denied';
            case error.POSITION_UNAVAILABLE:
                return 'Position unavailable';
            case error.TIMEOUT:
                return 'Request timeout';
            default:
                return 'Unknown error';
        }
    },

    handleGeolocationError(error) {
        const lang = localStorage.getItem('language') || 'no';
        let message = lang === 'no' ? 'Kunne ikke hente din lokasjon. ' : 'Could not get your location. ';

        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += lang === 'no'
                    ? 'Du har nektet tilgang til lokasjon. For å bruke denne funksjonen:\n\n1. Klikk på lokasjons-ikonet i adresselinjen\n2. Velg "Tillat" for denne nettsiden\n3. Oppdater siden og prøv igjen\n\nAlternativt kan du skrive inn et bynavn manuelt.'
                    : 'You have denied location access. To use this feature:\n\n1. Click the location icon in the address bar\n2. Select "Allow" for this website\n3. Refresh the page and try again\n\nAlternatively, you can enter a city name manually.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += lang === 'no'
                    ? 'Lokasjonsdata er ikke tilgjengelig fra enheten din. Dette kan skje hvis GPS er slått av eller du er innendørs. Prøv å gå til et område med bedre GPS-signal, eller skriv inn et bynavn manuelt.'
                    : 'Location data is not available from your device. This can happen if GPS is turned off or you are indoors. Try going to an area with better GPS signal, or enter a city name manually.';
                break;
            case error.TIMEOUT:
                message += lang === 'no'
                    ? 'Lokasjonsforespørselen tok for lang tid. Dette kan skyldes dårlig GPS-signal eller at enheten bruker lang tid på å finne posisjonen. Prøv igjen eller skriv inn et bynavn manuelt.'
                    : 'Location request took too long. This may be due to poor GPS signal or the device taking a long time to find the position. Try again or enter a city name manually.';
                break;
            default:
                message += lang === 'no'
                    ? 'En ukjent feil oppstod ved henting av lokasjon. Vennligst prøv igjen senere eller skriv inn et bynavn manuelt.'
                    : 'An unknown error occurred while getting location. Please try again later or enter a city name manually.';
                break;
        }

        alert(message);
        console.error('Geolocation error:', error);
    },

    refreshWeatherData() {
        if (!window.WeatherApp) {
            console.error('WeatherApp not available');
            return;
        }

        const state = window.WeatherApp.getState();
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
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no'
                ? 'Ingen lokasjons- eller bydata tilgjengelig. Vennligst skriv inn et bynavn eller tillat tilgang til lokasjon.'
                : 'No location or city data available. Please enter a city name or allow location access.';
            alert(message);
        }
    }
};

if (typeof window !== 'undefined') {
    window.LocationService = LocationService;
}
