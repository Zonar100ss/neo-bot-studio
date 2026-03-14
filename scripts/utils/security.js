'use strict';

/**
 * Модуль для обеспечения безопасности приложения
 * Защита от XSS, CSRF и других уязвимостей
 */
var SecurityModule = (function() {
    /**
     * Экранирует HTML-символы для предотвращения XSS
     * @param {string} unsafe - Входная строка
     * @returns {string} Безопасная строка
     */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return String(unsafe !== null && unsafe !== undefined ? unsafe : '');
        }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Очищает HTML от опасных тегов
     * @param {string} html - HTML строка
     * @returns {string} Очищенный HTML
     */
    function sanitizeHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }
        var temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    /**
     * Проверяет URL на безопасность
     * @param {string} url - URL для проверки
     * @returns {boolean} Безопасен или нет
     */
    function isSafeUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        try {
            var parsed = new URL(url);
            var allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
            return allowedProtocols.includes(parsed.protocol);
        } catch (e) {
            return false;
        }
    }

    /**
     * Создаёт безопасный nonce для CSP
     * @returns {string}Nonce строка
     */
    function generateNonce() {
        var array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('');
    }

    /**
     * Проверяет содержимое на наличие скриптов
     * @param {string} content - Содержимое для проверки
     * @returns {boolean} Содержит скрипты или нет
     */
    function containsScripts(content) {
        if (!content || typeof content !== 'string') {
            return false;
        }
        var scriptPattern = / < script | < \/ script | javascript : | on\w + = /gi;
        return scriptPattern.test(content);
    }

    /**
     * Удаляет опасные атрибуты из HTML
     * @param {string} html - HTML строка
     * @returns {string} Очищенный HTML
     */
    function removeDangerousAttributes(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }
        return html.replace(/ on\w + = " [^"] * " /gi, '')
            .replace(/ on\w + = '[^'] * '/gi, '')
            .replace(/ on\w + = [^\s >] + /gi, '');
    }

    /**
     * Валидирует JSON на наличие прототипных атак
     * @param {string} jsonString - JSON строка
     * @returns {boolean} Валиден или нет
     */
    function validateJson(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') {
            return false;
        }
        if (jsonString.includes('__proto__') ||
            jsonString.includes('constructor') ||
            jsonString.includes('prototype')) {
            console.warn('⚠️ Security: Обнаружена потенциальная прототипная атака');
            return false;
        }
        try {
            JSON.parse(jsonString);
            return true;
        } catch (e) {
            return false;
        }
    }

    return {
        escapeHtml: escapeHtml,
        sanitizeHtml: sanitizeHtml,
        isSafeUrl: isSafeUrl,
        generateNonce: generateNonce,
        containsScripts: containsScripts,
        removeDangerousAttributes: removeDangerousAttributes,
        validateJson: validateJson
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityModule;
}
