const UIUtils = {
    showLoadingSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'flex';
        }
    },

    hideLoadingSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    },

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    showNotification(message, type = 'info') {
        alert(message);
    },

    validateInput(value, type = 'text') {
        switch (type) {
            case 'city':
                return value && value.trim().length > 0;
            case 'coordinates':
                return !isNaN(value) && value >= -180 && value <= 180;
            default:
                return value && value.trim().length > 0;
        }
    },

    formatTemperature(temp, unit = 'metric') {
        const unitSymbol = unit === 'imperial' ? '°F' : '°C';
        return `${Math.round(temp)}${unitSymbol}`;
    },

    formatWindSpeed(speed, unit = 'metric') {
        const unitSymbol = unit === 'imperial' ? 'mph' : 'm/s';
        return `${speed} ${unitSymbol}`;
    },

    formatTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString();
    },

    createModal(content, className = '') {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        return modal;
    },

    removeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    },

    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';

        let start = performance.now();

        function animate(currentTime) {
            let elapsed = currentTime - start;
            let progress = elapsed / duration;

            if (progress < 1) {
                element.style.opacity = progress;
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = '1';
            }
        }

        requestAnimationFrame(animate);
    },

    fadeOut(element, duration = 300) {
        let start = performance.now();
        let startOpacity = parseFloat(element.style.opacity) || 1;

        function animate(currentTime) {
            let elapsed = currentTime - start;
            let progress = elapsed / duration;

            if (progress < 1) {
                element.style.opacity = startOpacity * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = '0';
                element.style.display = 'none';
            }
        }

        requestAnimationFrame(animate);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    sanitizeInput(input) {
        return input.replace(/[^\w\s,-]/gi, '').trim();
    },

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    scrollToElement(element, offset = 0) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const targetPosition = elementPosition - offset;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    addClass(element, className, delay = 0) {
        setTimeout(() => {
            if (element && element.classList) {
                element.classList.add(className);
            }
        }, delay);
    },

    removeClass(element, className, delay = 0) {
        setTimeout(() => {
            if (element && element.classList) {
                element.classList.remove(className);
            }
        }, delay);
    },

    toggleClass(element, className) {
        if (element && element.classList) {
            element.classList.toggle(className);
        }
    },

    isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    capitalizeWords(str) {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }
};
