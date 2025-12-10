// js/modules/language.js
export function updateLanguage(lang, firstLoad = false) {
    document.querySelectorAll('[data-en]').forEach(el => {
        // Skip typing effects if they exist
        if (el.id && el.id.startsWith('typing-')) return;

        el.textContent = lang === 'no'
            ? el.getAttribute('data-no')
            : el.getAttribute('data-en');
    });

    // Update theme mode text explicitly (to handle the dynamic dark/light mode label)
    const themeModeText = document.getElementById('theme-mode-text');
    if (themeModeText) {
        themeModeText.textContent = lang === 'no'
            ? themeModeText.getAttribute('data-no')
            : themeModeText.getAttribute('data-en');
    }

    // Update document language
    document.documentElement.lang = lang;

    // Update flag opacities
    const enFlag = document.getElementById('en-flag');
    const noFlag = document.getElementById('no-flag');

    if (enFlag && noFlag) {
        enFlag.style.opacity = lang === 'en' ? '1' : '0.5';
        noFlag.style.opacity = lang === 'no' ? '1' : '0.5';
    }

    // Update input placeholder based on language
    const cityInput = document.getElementById('cityInput');
    if (cityInput) {
        const placeholder = lang === 'no' 
            ? 'Skriv inn bynavn eller bruk lokasjonsknappen'
            : 'Enter city name or use location button';
        cityInput.placeholder = placeholder;
    }

    // Update page title
    const title = lang === 'no' ? 'Værdashboard - Sanntids værforhold' : 'Weather Dashboard - Real-time Weather';
    document.title = title;

    // Store language preference
    localStorage.setItem('language', lang);
}

export function initLanguageSwitcher() {
    let lang = localStorage.getItem('language');
    if (!lang) {
        lang = 'no'; // Default to Norwegian
        localStorage.setItem('language', lang);
    }
    updateLanguage(lang, true);
}