'use strict';

/**
 * Модуль для валидации пользовательских данных
 * Проверяет строки, числа, файлы и специальные форматы
 */
var ValidationModule = (function() {
    var MAX_NAME_LENGTH = 50;
    var MAX_DESC_LENGTH = 500;
    var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
    var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    /**
     * Валидирует имя бота или плагина
     * @param {string} name - Имя для проверки
     * @returns {Object} Результат валидации { valid, error }
     */
    function validateName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: 'Имя не может быть пустым' };
        }
        var trimmed = name.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: 'Имя не может состоять из пробелов' };
        }
        if (trimmed.length > MAX_NAME_LENGTH) {
            return { valid: false, error: 'Имя слишком длинное (макс. ' + MAX_NAME_LENGTH + ' символов)' };
        }
        var forbiddenChars = / [< > \ / \\ | ? * : ]/g;
        if (forbiddenChars.test(trimmed)) {
            return { valid: false, error: 'Имя содержит недопустимые символы' };
        }
        return { valid: true, error: null };
    }

    /**
     * Валидирует описание
     * @param {string} description - Описание для проверки
     * @returns {Object} Результат валидации { valid, error }
     */
    function validateDescription(description) {
        if (!description) {
            return { valid: true, error: null }; // Описание необязательно
        }
        if (typeof description !== 'string') {
            return { valid: false, error: 'Описание должно быть строкой' };
        }
        if (description.length > MAX_DESC_LENGTH) {
            return { valid: false, error: 'Описание слишком длинное (макс. ' + MAX_DESC_LENGTH + ' символов)' };
        }
        return { valid: true, error: null };
    }

    /**
     * Валидирует изображение (File объект)
     * @param {File} file - Файл для проверки
     * @returns {Object} Результат валидации { valid, error }
     */
    function validateImageFile(file) {
        if (!file) {
            return { valid: false, error: 'Файл не выбран' };
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return { valid: false, error: 'Недопустимый формат изображения (только JPG, PNG, WEBP, GIF)' };
        }
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: 'Файл слишком большой (макс. 5 МБ)' };
        }
        return { valid: true, error: null };
    }

    /**
     * Валидирует JSON код плагина
     * @param {string} code - Код для проверки
     * @returns {Object} Результат валидации { valid, error }
     */
    function validatePluginCode(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: 'Код не может быть пустым' };
        }
        try {
            new Function(code);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: 'Синтаксическая ошибка: ' + error.message };
        }
    }

    /**
     * Валидирует URL
     * @param {string} url - URL для проверки
     * @returns {boolean} Валиден или нет
     */
    function validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Валидирует число в диапазоне
     * @param {number} value - Значение
     * @param {number} min - Минимум
     * @param {number} max - Максимум
     * @returns {Object} Результат валидации { valid, error, value }
     */
    function validateNumberRange(value, min, max) {
        var num = Number(value);
        if (isNaN(num)) {
            return { valid: false, error: 'Значение должно быть числом', value: null };
        }
        if (num < min || num > max) {
            return { valid: false, error: 'Значение должно быть от ' + min + ' до ' + max, value: null };
        }
        return { valid: true, error: null, value: num };
    }

    /**
     * Очищает строку от потенциально опасных символов
     * @param {string} str - Строка для очистки
     * @returns {string} Очищенная строка
     */
    function sanitizeString(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }
        return str.replace(/[<>]/g, '');
    }

    return {
        name: validateName,
        description: validateDescription,
        image: validateImageFile,
        code: validatePluginCode,
        url: validateUrl,
        number: validateNumberRange,
        sanitize: sanitizeString,
        LIMITS: {
            NAME: MAX_NAME_LENGTH,
            DESC: MAX_DESC_LENGTH,
            FILE_SIZE: MAX_FILE_SIZE
        }
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationModule;
}
