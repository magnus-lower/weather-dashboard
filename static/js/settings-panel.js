export function initSettingsPanel() {
    const settingsToggle = document.querySelector('.settings-toggle');
    const settingsDropdown = document.getElementById('settings-dropdown');

    if (!settingsToggle || !settingsDropdown) return;

    settingsToggle.addEventListener('click', () => {
        settingsDropdown.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
        if (!settingsToggle.contains(e.target) && !settingsDropdown.contains(e.target)) {
            settingsDropdown.classList.remove('visible');
        }
    });

    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) {
        languageToggle.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('flag-icon')) {
                const lang = target.id.split('-')[0];
                localStorage.setItem('language', lang);
                import('./language.js').then(mod => mod.updateLanguage(lang));
            }
        });
    }

    initDarkMode();
}

export function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;

    const themeModeText = document.getElementById('theme-mode-text');

    const updateDarkModeLabel = (isDark) => {
        if (themeModeText) {
            const lang = localStorage.getItem('language') || 'no';

            themeModeText.setAttribute('data-en', isDark ? 'Light Mode' : 'Dark Mode');
            themeModeText.setAttribute('data-no', isDark ? 'Lys modus' : 'Mørk modus');

            themeModeText.textContent = lang === 'no'
                ? themeModeText.getAttribute('data-no')
                : themeModeText.getAttribute('data-en');

            const labelIcon = themeModeText.previousElementSibling;
            if (labelIcon) {
                labelIcon.className = isDark ? "fas fa-sun" : "fas fa-moon";
            }
        }
    };

    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    updateDarkModeLabel(isDarkMode);

    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener('change', () => {
        const enabled = darkModeToggle.checked;
        updateDarkModeLabel(enabled);
        document.documentElement.classList.toggle('dark-mode', enabled);
        document.body.classList.toggle('dark-mode', enabled);
        localStorage.setItem('darkMode', enabled.toString());

        document.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: enabled } }));
    });
}
