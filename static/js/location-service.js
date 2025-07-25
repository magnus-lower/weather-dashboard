// location-service.js - Handles geolocation and location-based weather
const LocationService = {
    init() {
        console.log('Location Service module initialized');
        // Vent litt før vi prøver automatisk lokasjon for å sikre at alle moduler er lastet
        setTimeout(() => {
            this.tryAutoLocation();
        }, 100);
    },

    // Prøv å få lokasjon automatisk ved oppstart (stille)
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
                
                // Update app state
                if (typeof WeatherApp !== 'undefined') {
                    WeatherApp.updateState({
                        lastLat: latitude,
                        lastLon: longitude
                    });
                }

                // Få været for lokasjonen (med loading spinner siden det er automatisk)
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showLoadingSpinner();
                }
                
                if (typeof WeatherAPI !== 'undefined') {
                    WeatherAPI.reverseGeocode(latitude, longitude, 'metric');
                } else {
                    console.error('WeatherAPI not available');
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.hideLoadingSpinner();
                    }
                }
            },
            (error) => {
                // Stille feil - bare logg det, ikke vis bruker feilmelding
                console.log('Auto-location failed:', this.getErrorMessage(error));
                console.log('User can manually enter city name or click location button');
            },
            {
                enableHighAccuracy: false, // Raskere respons
                timeout: 8000, // Kortere timeout for automatisk prøving
                maximumAge: 600000 // 10 minutter cache
            }
        );
    },

    // Fetch weather by user's current location (når brukeren eksplisitt ber om det)
    fetchWeatherByLocation(lat = null, lon = null) {
        const unit = 'metric';

        if (lat !== null && lon !== null) {
            console.log('Fetching weather for provided coordinates:', lat, lon);
            UIUtils.showLoadingSpinner();
            WeatherAPI.reverseGeocode(lat, lon, unit);
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolokasjon støttes ikke av denne nettleseren. Vennligst skriv inn et bynavn manuelt.');
            return;
        }

        UIUtils.showLoadingSpinner();
        console.log('Requesting user location...');
        
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
                timeout: 15000, // Lengre timeout når bruker eksplisitt ber om det
                maximumAge: 300000 // 5 minutes
            }
        );
    },

    // Get user-friendly error message
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

    // Handle geolocation errors (for explicit user requests)
    handleGeolocationError(error) {
        let message = 'Kunne ikke hente din lokasjon. ';

        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Du har nektet tilgang til lokasjon. For å bruke denne funksjonen:\n\n';
                message += '1. Klikk på lokasjons-ikonet i adresselinjen\n';
                message += '2. Velg "Tillat" for denne nettsiden\n';
                message += '3. Oppdater siden og prøv igjen\n\n';
                message += 'Alternativt kan du skrive inn et bynavn manuelt.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Lokasjonsdata er ikke tilgjengelig fra enheten din. ';
                message += 'Dette kan skje hvis GPS er slått av eller du er innendørs. ';
                message += 'Prøv å gå til et område med bedre GPS-signal, eller skriv inn et bynavn manuelt.';
                break;
            case error.TIMEOUT:
                message += 'Lokasjonsforespørselen tok for lang tid. ';
                message += 'Dette kan skyldes dårlig GPS-signal eller at enheten bruker lang tid på å finne posisjonen. ';
                message += 'Prøv igjen eller skriv inn et bynavn manuelt.';
                break;
            default:
                message += 'En ukjent feil oppstod ved henting av lokasjon. ';
                message += 'Vennligst prøv igjen senere eller skriv inn et bynavn manuelt.';
                break;
        }

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