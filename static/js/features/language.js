export function updateLanguage(lang, firstLoad = false) {
    document.querySelectorAll('[data-en]').forEach(el => {
        if (el.id && el.id.startsWith('typing-')) return;

        el.textContent = lang === 'no'
            ? el.getAttribute('data-no')
            : el.getAttribute('data-en');
    });

    const themeModeText = document.getElementById('theme-mode-text');
    if (themeModeText) {
        themeModeText.textContent = lang === 'no'
            ? themeModeText.getAttribute('data-no')
            : themeModeText.getAttribute('data-en');
    }

    document.documentElement.lang = lang;

    const enFlag = document.getElementById('en-flag');
    const noFlag = document.getElementById('no-flag');

    if (enFlag && noFlag) {
        enFlag.style.opacity = lang === 'en' ? '1' : '0.5';
        noFlag.style.opacity = lang === 'no' ? '1' : '0.5';
    }

    const cityInput = document.getElementById('cityInput');
    if (cityInput) {
        const placeholder = lang === 'no'
            ? 'Skriv inn bynavn eller bruk lokasjonsknappen'
            : 'Enter city name or use location button';
        cityInput.placeholder = placeholder;
    }

    const title = lang === 'no' ? 'Værdashboard - Sanntids værforhold' : 'Weather Dashboard - Real-time Weather';
    document.title = title;

    localStorage.setItem('language', lang);
}

export function initLanguageSwitcher() {
    let lang = localStorage.getItem('language');
    if (!lang) {
        lang = 'no';
        localStorage.setItem('language', lang);
    }
    updateLanguage(lang, true);
}
