'use strict';

/**
 * Модуль с общими вспомогательными функциями
 * Генерация ID, форматирование, задержки и т.д.
 */
var HelpersModule = (function() {
    /**
     * Генерирует уникальный ID
     * @param {string} prefix - Префикс ID
     * @returns {string} Уникальный ID
     */
    function generateId(prefix) {
        var timestamp = Date.now().toString(36);
        var randomPart = Math.random().toString(36).substring(2, 8);
        return prefix + '_' + timestamp + '_' + randomPart;
    }

    /**
     * Создаёт задержку (Promise)
     * @param {number} ms - Миллисекунды
     * @returns {Promise<void>}
     */
    function delay(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    }

    /**
     * Форматирует дату в локальный формат
     * @param {number|Date} timestamp - Временная метка
     * @param {boolean} showTime - Показывать время
     * @returns {string} Форматированная дата
     */
    function formatDate(timestamp, showTime) {
        if (showTime === undefined) {
            showTime = true;
        }
        var date = new Date(timestamp);
        var options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        if (showTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('ru-RU', options);
    }

    /**
     * Форматирует размер файла в человекочитаемый вид
     * @param {number} bytes - Размер в байтах
     * @returns {string} Форматированный размер
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        var k = 1024;
        var sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Обрезает строку до определённой длины
     * @param {string} str - Строка
     * @param {number} maxLength - Максимальная длина
     * @param {string} suffix - Суффикс обрезки
     * @returns {string} Обрезанная строка
     */
    function truncateString(str, maxLength, suffix) {
        if (suffix === undefined) {
            suffix = '...';
        }
        if (!str || str.length <= maxLength) {
            return str || '';
        }
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Генерирует случайный цвет в HEX
     * @returns {string} HEX цвет
     */
    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Глубокое копирование объекта
     * @param {*} obj - Объект для копирования
     * @returns {*} Копия объекта
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(function(item) {
                return deepClone(item);
            });
        }
        var cloned = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Проверяет, является ли объект пустым
     * @param {Object} obj - Объект
     * @returns {boolean} Пустой или нет
     */
    function isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Debounce функция для ограничения частоты вызовов
     * @param {Function} func - Функция
     * @param {number} wait - Задержка в мс
     * @returns {Function} Обёрнутая функция
     */
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    /**
     * Throttle функция для ограничения частоты вызовов
     * @param {Function} func - Функция
     * @param {number} limit - Лимит в мс
     * @returns {Function} Обёрнутая функция
     */
    function throttle(func, limit) {
        var inThrottle;
        return function() {
            var context = this;
            var args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    return {
        generateId: generateId,
        delay: delay,
        formatDate: formatDate,
        formatFileSize: formatFileSize,
        truncate: truncateString,
        randomColor: getRandomColor,
        clone: deepClone,
        isEmpty: isEmpty,
        debounce: debounce,
        throttle: throttle
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpersModule;
}
