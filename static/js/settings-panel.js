export function initSettingsPanel() {
    const settingsToggle = document.querySelector('.settings-toggle');
    const settingsDropdown = document.getElementById('settings-dropdown');

    if (!settingsToggle || !settingsDropdown) return;

    // Toggle settings dropdown
    settingsToggle.addEventListener('click', () => {
        settingsDropdown.classList.toggle('visible');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsToggle.contains(e.target) && !settingsDropdown.contains(e.target)) {
            settingsDropdown.classList.remove('visible');
        }
    });

    // Language toggle functionality
    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) {
        languageToggle.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('flag-icon')) {
                const lang = target.id.split('-')[0]; // Extract 'en' or 'no' from id
                localStorage.setItem('language', lang);
                // We import updateLanguage lazily to avoid circular deps
                import('./language.js').then(mod => mod.updateLanguage(lang));
            }
        });
    }

    // Initialize dark mode functionality
    initDarkMode();
}

// Dark mode functionality
export function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;

    // Find the theme mode text element
    const themeModeText = document.getElementById('theme-mode-text');

    // Function to update the label text based on both dark mode state and language
    const updateDarkModeLabel = (isDark) => {
        if (themeModeText) {
            const lang = localStorage.getItem('language') || 'no';

            // Update the data attributes to reflect the current mode
            themeModeText.setAttribute('data-en', isDark ? 'Light Mode' : 'Dark Mode');
            themeModeText.setAttribute('data-no', isDark ? 'Lys modus' : 'Mørk modus');

            // Apply the correct text based on current language
            themeModeText.textContent = lang === 'no'
                ? themeModeText.getAttribute('data-no')
                : themeModeText.getAttribute('data-en');

            // Update icon
            const labelIcon = themeModeText.previousElementSibling;
            if (labelIcon) {
                labelIcon.className = isDark ? "fas fa-sun" : "fas fa-moon";
            }
        }
    };

    // Apply initial state
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
        
        // Dispatch theme change event for other components
        document.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: enabled } }));
    });
}
