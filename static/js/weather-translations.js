const WeatherTranslations = {
    translations: {
        'clear sky': 'klar himmel',

        'few clouds': 'få skyer',
        'scattered clouds': 'spredte skyer',
        'broken clouds': 'brutte skyer',
        'overcast clouds': 'overskyet',

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

        'light intensity drizzle': 'lett støvregn',
        'drizzle': 'støvregn',
        'heavy intensity drizzle': 'kraftig støvregn',
        'light intensity drizzle rain': 'lett støvregn',
        'drizzle rain': 'støvregn',
        'heavy intensity drizzle rain': 'kraftig støvregn',
        'shower rain and drizzle': 'regnbyge og støvregn',
        'heavy shower rain and drizzle': 'kraftig regnbyge og støvregn',
        'shower drizzle': 'støvregnbyge',

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

        'partly cloudy': 'delvis skyet',
        'mostly cloudy': 'stort sett skyet',
        'light clouds': 'lette skyer',
        'heavy clouds': 'tunge skyer'
    },

    translate(englishDescription) {
        if (!englishDescription) return '';

        const lowerDescription = englishDescription.toLowerCase().trim();

        if (this.translations[lowerDescription]) {
            return this.capitalizeFirst(this.translations[lowerDescription]);
        }

        for (const [english, norwegian] of Object.entries(this.translations)) {
            if (lowerDescription.includes(english)) {
                return this.capitalizeFirst(norwegian);
            }
        }

        console.warn(`Ingen norsk oversettelse funnet for: "${englishDescription}"`);
        return this.capitalizeFirst(englishDescription);
    },

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    addTranslation(english, norwegian) {
        this.translations[english.toLowerCase()] = norwegian.toLowerCase();
        console.log(`Lagt til oversettelse: "${english}" -> "${norwegian}"`);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherTranslations;
}
