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
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showLoadingSpinner();
            }
            if (typeof WeatherAPI !== 'undefined') {
                WeatherAPI.reverseGeocode(lat, lon, unit);
            }
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

        if (typeof UIUtils !== 'undefined') {
            UIUtils.showLoadingSpinner();
        }
        
        console.log('Requesting user location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                // Update app state
                if (typeof WeatherApp !== 'undefined') {
                    WeatherApp.updateState({
                        lastLat: latitude,
                        lastLon: longitude
                    });
                }

                console.log('Fetched geolocation:', latitude, longitude);
                
                if (typeof WeatherAPI !== 'undefined') {
                    WeatherAPI.reverseGeocode(latitude, longitude, unit);
                } else {
                    console.error('WeatherAPI not available');
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.hideLoadingSpinner();
                    }
                }
            },
            (error) => {
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.hideLoadingSpinner();
                }
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

    // Refresh weather data for last known location
    refreshWeatherData() {
        if (typeof WeatherApp === 'undefined') {
            console.error('WeatherApp not available');
            return;
        }

        const state = WeatherApp.getState();
        const unit = 'metric';

        if (state.lastCity && state.lastCountry) {
            if (typeof WeatherAPI !== 'undefined') {
                WeatherAPI.fetchWeatherData('/weather', {
                    city: state.lastCity,
                    country: state.lastCountry,
                    unit
                });
            }
        } else if (state.lastLat !== null && state.lastLon !== null) {
            if (typeof WeatherAPI !== 'undefined') {
                WeatherAPI.fetchWeatherData('/weather_by_coords', {
                    lat: state.lastLat,
                    lon: state.lastLon,
                    unit
                });
            }
        } else {
            const lang = localStorage.getItem('language') || 'no';
            const message = lang === 'no' 
                ? 'Ingen lokasjons- eller bydata tilgjengelig. Vennligst skriv inn et bynavn eller tillat tilgang til lokasjon.'
                : 'No location or city data available. Please enter a city name or allow location access.';
            alert(message);
        }
    }
};