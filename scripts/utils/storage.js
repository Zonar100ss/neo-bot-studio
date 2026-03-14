'use strict';

/**
 * Модуль для безопасной работы с localStorage
 * Обрабатывает квоты, ошибки парсинга и префиксы ключей
 */
var StorageModule = (function() {
    var PREFIX = 'neo_bot_';
    var MAX_RETRY_ATTEMPTS = 3;

    /**
     * Получает полный ключ с префиксом
     * @param {string} key - Исходный ключ
     * @returns {string} Ключ с префиксом
     */
    function getFullKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('Неверный ключ хранилища');
        }
        return PREFIX + key;
    }

    /**
     * Безопасно сохраняет данные в localStorage
     * @param {string} key - Ключ
     * @param {*} value - Значение (будет сериализовано в JSON)
     * @returns {boolean} Успешность операции
     */
    function setItem(key, value) {
        try {
            var fullKey = getFullKey(key);
            var serialized = JSON.stringify(value);
            localStorage.setItem(fullKey, serialized);
            console.log('💾 Storage: Сохранено "' + fullKey + '" (' + serialized.length + ' байт)');
            return true;
        } catch (error) {
            console.error('❌ Storage: Ошибка сохранения:', error);
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ Storage: Превышена квота localStorage');
                handleQuotaExceeded();
                try {
                    localStorage.setItem(getFullKey(key), JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error('❌ Storage: Не удалось сохранить даже после очистки');
                    return false;
                }
            }
            return false;
        }
    }

    /**
     * Получает данные из localStorage
     * @param {string} key - Ключ
     * @param {*} defaultValue - Значение по умолчанию
     * @returns {*} Распарсенное значение или defaultValue
     */
    function getItem(key, defaultValue) {
        try {
            var fullKey = getFullKey(key);
            var item = localStorage.getItem(fullKey);
            if (item === null || item === undefined || item === '') {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.warn('⚠️ Storage: Ошибка парсинга JSON для ключа "' + key + '":', error.message);
            return defaultValue;
        }
    }

    /**
     * Удаляет элемент из localStorage
     * @param {string} key - Ключ
     * @returns {boolean} Успешность операции
     */
    function removeItem(key) {
        try {
            var fullKey = getFullKey(key);
            localStorage.removeItem(fullKey);
            console.log('🗑️ Storage: Удалено "' + fullKey + '"');
            return true;
        } catch (error) {
            console.error('❌ Storage: Ошибка удаления:', error);
            return false;
        }
    }

    /**
     * Очищает все данные приложения из localStorage
     * @returns {number} Количество удалённых ключей
     */
    function clearAll() {
        var count = 0;
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
                keysToRemove.push(key);
            }
        }
        for (var j = 0; j < keysToRemove.length; j++) {
            localStorage.removeItem(keysToRemove[j]);
            count++;
        }
        console.log('🧹 Storage: Очищено ' + count + ' ключей');
        return count;
    }

    /**
     * Обрабатывает превышение квоты localStorage
     * Удаляет старые кэшированные данные
     */
    function handleQuotaExceeded() {
        console.warn('⚠️ Storage: Попытка очистки старых данных...');
        var keysToRemove = [];
        var now = Date.now();
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
                if (key.includes('cache') || key.includes('temp')) {
                    keysToRemove.push(key);
                }
            }
        }
        for (var j = 0; j < keysToRemove.length; j++) {
            localStorage.removeItem(keysToRemove[j]);
        }
        console.log('🗑️ Storage: Удалено ' + keysToRemove.length + ' кэшированных элементов');
    }

    /**
     * Получает размер occupied памяти в localStorage
     * @returns {number} Размер в байтах
     */
    function getStorageSize() {
        var size = 0;
        for (var key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length * 2;
            }
        }
        return size;
    }

    /**
     * Проверяет доступность localStorage
     * @returns {boolean} Доступно или нет
     */
    function isAvailable() {
        try {
            var test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    return {
        set: setItem,
        get: getItem,
        remove: removeItem,
        clear: clearAll,
        size: getStorageSize,
        available: isAvailable,
        PREFIX: PREFIX
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageModule;
      }
