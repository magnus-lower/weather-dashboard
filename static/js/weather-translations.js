// weather-translations.js - Oversettelse av værbeskrivelser fra engelsk til norsk
const WeatherTranslations = {
    // Oversettelsesordbok for værbeskrivelser
    translations: {
        // Clear sky
        'clear sky': 'klar himmel',
        
        // Clouds
        'few clouds': 'få skyer',
        'scattered clouds': 'spredte skyer', 
        'broken clouds': 'brutte skyer',
        'overcast clouds': 'overskyet',
        
        // Rain
        'light rain': 'lett regn',
        'moderate rain': 'moderat regn',
        'heavy intensity rain': 'kraftig regn',
        'very heavy rain': 'svært kraftig regn',
        'extreme rain': 'ekstrem regn',
        'freezing rain': 'underkjølt regn',
        'light intensity shower rain': 'lett regnbyge',
        'shower rain': 'regnbyge',
        'heavy intensity shower rain': 'kraftig regnbyge',
        'ragged shower rain': 'ujevn regnbyge',
        
        // Drizzle
        'light intensity drizzle': 'lett støvregn',
        'drizzle': 'støvregn',
        'heavy intensity drizzle': 'kraftig støvregn',
        'light intensity drizzle rain': 'lett støvregn',
        'drizzle rain': 'støvregn',
        'heavy intensity drizzle rain': 'kraftig støvregn',
        'shower rain and drizzle': 'regnbyge og støvregn',
        'heavy shower rain and drizzle': 'kraftig regnbyge og støvregn',
        'shower drizzle': 'støvregnbyge',
        
        // Thunderstorm
        'thunderstorm with light rain': 'tordenvær med lett regn',
        'thunderstorm with rain': 'tordenvær med regn',
        'thunderstorm with heavy rain': 'tordenvær med kraftig regn',
        'light thunderstorm': 'lett tordenvær',
        'thunderstorm': 'tordenvær',
        'heavy thunderstorm': 'kraftig tordenvær',
        'ragged thunderstorm': 'ujevnt tordenvær',
        'thunderstorm with light drizzle': 'tordenvær med lett støvregn',
        'thunderstorm with drizzle': 'tordenvær med støvregn',
        'thunderstorm with heavy drizzle': 'tordenvær med kraftig støvregn',
        
        // Snow
        'light snow': 'lett snø',
        'snow': 'snø',
        'heavy snow': 'kraftig snø',
        'sleet': 'sludd',
        'light shower sleet': 'lett sluddbyge',
        'shower sleet': 'sluddbyge',
        'light rain and snow': 'lett regn og snø',
        'rain and snow': 'regn og snø',
        'light shower snow': 'lett snøbyge',
        'shower snow': 'snøbyge',
        'heavy shower snow': 'kraftig snøbyge',
        
        // Atmosphere
        'mist': 'tåke',
        'smoke': 'røyk',
        'haze': 'dis',
        'sand/dust whirls': 'sand/støv virvler',
        'fog': 'tåke',
        'sand': 'sand',
        'dust': 'støv',
        'volcanic ash': 'vulkansk aske',
        'squalls': 'vindkast',
        'tornado': 'tornado',
        
        // Additional common descriptions
        'partly cloudy': 'delvis skyet',
        'mostly cloudy': 'stort sett skyet',
        'light clouds': 'lette skyer',
        'heavy clouds': 'tunge skyer'
    },

    // Hovedfunksjon for å oversette værbeskrivelse
    translate(englishDescription) {
        if (!englishDescription) return '';
        
        // Konverter til lowercase for sammenligning
        const lowerDescription = englishDescription.toLowerCase().trim();
        
        // Sjekk om vi har en direkte oversettelse
        if (this.translations[lowerDescription]) {
            return this.capitalizeFirst(this.translations[lowerDescription]);
        }
        
        // Hvis ikke direkte match, prøv å finne deler av beskrivelsen
        for (const [english, norwegian] of Object.entries(this.translations)) {
            if (lowerDescription.includes(english)) {
                return this.capitalizeFirst(norwegian);
            }
        }
        
        // Hvis ingen oversettelse finnes, returner originalen med stor forbokstav
        console.warn(`Ingen norsk oversettelse funnet for: "${englishDescription}"`);
        return this.capitalizeFirst(englishDescription);
    },

    // Hjelpefunksjon for å gjøre første bokstav stor
    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    // Funksjon for å legge til nye oversettelser (for fremtidig utvidelse)
    addTranslation(english, norwegian) {
        this.translations[english.toLowerCase()] = norwegian.toLowerCase();
        console.log(`Lagt til oversettelse: "${english}" -> "${norwegian}"`);
    }
};

// Eksporter for bruk i andre moduler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherTranslations;
}
