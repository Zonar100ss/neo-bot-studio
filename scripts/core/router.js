'use strict';

/**
 * Модуль для управления навигацией между экранами
 * Обрабатывает переходы, анимации и историю
 */
var Router = (function() {
    var currentScreen = null;
    var historyStack = [];
    var transitionsEnabled = true;

    /**
     * Переходит на указанный экран
     * @param {string} screenId - ID целевого экрана
     * @param {Object} options - Опции перехода
     */
    function navigate(screenId, options) {
        if (options === undefined) {
            options = {};
        }
        var targetElement = document.getElementById(screenId);
        if (!targetElement) {
            console.error('❌ Router: Экран "' + screenId + '" не найден');
            return false;
        }
        if (currentScreen) {
            var currentElement = document.getElementById(currentScreen);
            if (currentElement) {
                if (transitionsEnabled && options.animate !== false) {
                    currentElement.classList.add('hidden');
                    currentElement.classList.remove('active');
                } else {
                    currentElement.style.display = 'none';
                }
            }
        }
        if (transitionsEnabled && options.animate !== false) {
            targetElement.classList.remove('hidden');
            targetElement.classList.add('active');
        } else {
            targetElement.style.display = 'block';
        }
        if (!options.replace) {
            historyStack.push(currentScreen);
        }
        currentScreen = screenId;
        console.log('🧭 Router: Переход на "' + screenId + '"');
        return true;
    }

    /**
     * Возвращает на предыдущий экран
     * @returns {boolean} Успешность операции
     */
    function back() {
        if (historyStack.length === 0) {
            console.warn('⚠️ Router: История пуста');
            return false;
        }
        var previousScreen = historyStack.pop();
        return navigate(previousScreen, { replace: true });
    }

    /**
     * Очищает историю навигации
     */
    function clearHistory() {
        historyStack = [];
        console.log('🧹 Router: История очищена');
    }

    /**
     * Включает или отключает анимации переходов
     * @param {boolean} enabled - Включено или нет
     */
    function setTransitions(enabled) {
        transitionsEnabled = enabled;
        console.log('🎬 Router: Анимации ' + (enabled ? 'включены' : 'отключены'));
    }

    /**
     * Получает текущий экран
     * @returns {string} ID текущего экрана
     */
    function getCurrentScreen() {
        return currentScreen;
    }

    /**
     * Получает размер истории
     * @returns {number} Размер истории
     */
    function getHistorySize() {
        return historyStack.length;
    }

    return {
        navigate: navigate,
        back: back,
        clearHistory: clearHistory,
        setTransitions: setTransitions,
        getCurrent: getCurrentScreen,
        getHistorySize: getHistorySize
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
