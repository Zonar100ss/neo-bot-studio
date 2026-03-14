'use strict';

/**
 * Модуль для управления глобальным состоянием приложения
 * Централизованное хранение и обновление данных
 */
var StateManager = (function() {
    var state = {
        currentScreen: 'splash',
        currentBot: null,
        currentPlugin: null,
        chatHistory: [],
        botList: [],
        pluginList: [],
        settings: {},
        activePlugins: [],
        imagesLibrary: [],
        apiStats: {
            requestsToday: 0,
            totalRequests: 0,
            lastReset: new Date().toDateString()
        },
        ui: {
            theme: 'dark',
            notifications: [],
            modals: []
        }
    };

    var listeners = {};

    /**
     * Подписывается на изменения состояния
     * @param {string} key - Ключ состояния
     * @param {Function} callback - Функция обратного вызова
     */
    function subscribe(key, callback) {
        if (!listeners[key]) {
            listeners[key] = [];
        }
        listeners[key].push(callback);
    }

    /**
     * Уведомляет подписчиков об изменении
     * @param {string} key - Ключ состояния
     * @param {*} newValue - Новое значение
     */
    function notify(key, newValue) {
        if (listeners[key]) {
            listeners[key].forEach(function(callback) {
                try {
                    callback(newValue, key);
                } catch (error) {
                    console.error('❌ State: Ошибка в подписчике:', error);
                }
            });
        }
    }

    /**
     * Получает значение состояния
     * @param {string} key - Ключ
     * @returns {*} Значение
     */
    function get(key) {
        var keys = key.split('.');
        var value = state;
        for (var i = 0; i < keys.length; i++) {
            if (value[keys[i]] === undefined) {
                return undefined;
            }
            value = value[keys[i]];
        }
        return value;
    }

    /**
     * Устанавливает значение состояния
     * @param {string} key - Ключ
     * @param {*} value - Значение
     * @param {boolean} notifyChanges - Уведомлять подписчиков
     */
    function set(key, value, notifyChanges) {
        if (notifyChanges === undefined) {
            notifyChanges = true;
        }
        var keys = key.split('.');
        var target = state;
        for (var i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }
        var oldValue = target[keys[keys.length - 1]];
        target[keys[keys.length - 1]] = value;
        if (notifyChanges) {
            notify(key, value);
        }
        console.log('🔄 State: Обновлено "' + key + '"');
    }

    /**
     * Сбрасывает состояние к значениям по умолчанию
     */
    function reset() {
        state = {
            currentScreen: 'splash',
            currentBot: null,
            currentPlugin: null,
            chatHistory: [],
            botList: [],
            pluginList: [],
            settings: {},
            activePlugins: [],
            imagesLibrary: [],
            apiStats: {
                requestsToday: 0,
                totalRequests: 0,
                lastReset: new Date().toDateString()
            },
            ui: {
                theme: 'dark',
                notifications: [],
                modals: []
            }
        };
        console.log('🔄 State: Сброшено к значениям по умолчанию');
    }

    /**
     * Экспортирует состояние для сохранения
     * @returns {Object} Копия состояния
     */
    function exportState() {
        return JSON.parse(JSON.stringify(state));
    }

    /**
     * Импортирует состояние из сохранения
     * @param {Object} importedState - Импортированное состояние
     */
    function importState(importedState) {
        if (!importedState || typeof importedState !== 'object') {
            console.error('❌ State: Неверный формат импорта');
            return;
        }
        state = Object.assign({}, state, importedState);
        console.log('🔄 State: Импортировано состояние');
    }

    return {
        get: get,
        set: set,
        subscribe: subscribe,
        reset: reset,
        export: exportState,
        import: importState
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}
