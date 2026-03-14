'use strict';

/**
 * Модуль для загрузки и инициализации плагинов
 * Безопасное выполнение кода плагинов
 */
var PluginLoader = (function() {
    var loadedPlugins = {};
    var activePlugins = [];

    /**
     * Загружает плагин из данных
     * @param {Object} pluginData - Данные плагина
     * @returns {boolean} Успешность загрузки
     */
    function load(pluginData) {
        if (!pluginData || !pluginData.id || !pluginData.code) {
            console.error('❌ PluginLoader: Неверные данные плагина');
            return false;
        }
        try {
            var pluginFunc = new Function('return ' + pluginData.code)();
            loadedPlugins[pluginData.id] = {
                data: pluginData,
                instance: pluginFunc,
                active: false
            };
            console.log('✅ PluginLoader: Загружен плагин "' + pluginData.name + '"');
            return true;
        } catch (error) {
            console.error('❌ PluginLoader: Ошибка загрузки плагина:', error);
            return false;
        }
    }

    /**
     * Активирует плагин
     * @param {string} pluginId - ID плагина
     * @returns {boolean} Успешность активации
     */
    function activate(pluginId) {
        if (!loadedPlugins[pluginId]) {
            console.error('❌ PluginLoader: Плагин не найден');
            return false;
        }
        loadedPlugins[pluginId].active = true;
        if (!activePlugins.includes(pluginId)) {
            activePlugins.push(pluginId);
        }
        console.log('✅ PluginLoader: Активирован плагин "' + pluginId + '"');
        return true;
    }

    /**
     * Деактивирует плагин
     * @param {string} pluginId - ID плагина
     * @returns {boolean} Успешность деактивации
     */
    function deactivate(pluginId) {
        if (!loadedPlugins[pluginId]) {
            return false;
        }
        loadedPlugins[pluginId].active = false;
        activePlugins = activePlugins.filter(function(id) {
            return id !== pluginId;
        });
        console.log('⏹️ PluginLoader: Деактивирован плагин "' + pluginId + '"');
        return true;
    }

    /**
     * Выполняет код активного плагина
     * @param {string} pluginId - ID плагина
     * @param {*} context - Контекст выполнения
     * @returns {*} Результат выполнения
     */
    function execute(pluginId, context) {
        if (!loadedPlugins[pluginId] || !loadedPlugins[pluginId].active) {
            return null;
        }
        try {
            var plugin = loadedPlugins[pluginId].instance;
            if (typeof plugin === 'function') {
                return plugin(context);
            }
            return null;
        } catch (error) {
            console.error('❌ PluginLoader: Ошибка выполнения плагина:', error);
            return null;
        }
    }

    /**
     * Получает список загруженных плагинов
     * @returns {Array} Список плагинов
     */
    function getLoadedList() {
        return Object.keys(loadedPlugins).map(function(id) {
            return loadedPlugins[id].data;
        });
    }

    /**
     * Получает список активных плагинов
     * @returns {Array} Список активных ID
     */
    function getActiveList() {
        return activePlugins.slice();
    }

    /**
     * Очищает все загруженные плагины
     */
    function clearAll() {
        loadedPlugins = {};
        activePlugins = [];
        console.log('🧹 PluginLoader: Все плагины очищены');
    }

    return {
        load: load,
        activate: activate,
        deactivate: deactivate,
        execute: execute,
        getLoaded: getLoadedList,
        getActive: getActiveList,
        clear: clearAll
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PluginLoader;
}
