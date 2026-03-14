'use strict';

/**
 * Модуль для построения промтов для ИИ-моделей
 * Шаблоны, переменные и форматирование контекста
 */
var PromptBuilder = (function() {
    var DEFAULT_SYSTEM_PROMPT = 'Вы — ИИ-ассистент. Отвечайте полезно и безопасно.';
    var DEFAULT_DIALOG_PROMPT = 'Пользователь: {user_message}\nАссистент:';

    /**
     * Строит системный промт
     * @param {Object} botData - Данные бота
     * @returns {string} Системный промт
     */
    function buildSystemPrompt(botData) {
        if (!botData) {
            return DEFAULT_SYSTEM_PROMPT;
        }
        var template = botData.prompts && botData.prompts.system ?
            botData.prompts.system :
            'Вы — ИИ-ассистент с именем {bot_name}. Ваша роль: {bot_genre}.';
        return replaceVariables(template, {
            bot_name: botData.name || 'Ассистент',
            bot_genre: botData.genre || 'ассистент',
            bot_description: botData.description || 'помощник'
        });
    }

    /**
     * Строит диалоговый промт
     * @param {Object} botData - Данные бота
     * @param {string} userMessage - Сообщение пользователя
     * @param {Array} history - История чата
     * @returns {string} Диалоговый промт
     */
    function buildDialogPrompt(botData, userMessage, history) {
        if (!botData) {
            return DEFAULT_DIALOG_PROMPT.replace('{user_message}', userMessage);
        }
        var template = botData.prompts && botData.prompts.dialog ?
            botData.prompts.dialog :
            'Контекст: {chat_history}\nПользователь: {user_message}\nАссистент:';
        var historyText = formatHistory(history, botData.settings && botData.settings.contextWindow || 10);
        return replaceVariables(template, {
            user_message: userMessage,
            chat_history: historyText,
            context_size: botData.settings && botData.settings.contextWindow || 10,
            max_tokens: botData.settings && botData.settings.maxTokens || 512
        });
    }

    /**
     * Форматирует историю чата для промта
     * @param {Array} history - История сообщений
     * @param {number} limit - Лимит сообщений
     * @returns {string} Форматированная история
     */
    function formatHistory(history, limit) {
        if (!history || history.length === 0) {
            return 'Нет предыдущих сообщений.';
        }
        var sliced = history.slice(-limit);
        var text = '';
        for (var i = 0; i < sliced.length; i++) {
            var msg = sliced[i];
            var role = msg.sender === 'user' ? 'Пользователь' : 'Ассистент';
            text += role + ': ' + msg.content + '\n';
        }
        return text.trim();
    }

    /**
     * Заменяет переменные в шаблоне
     * @param {string} template - Шаблон
     * @param {Object} variables - Переменные
     * @returns {string} Результат замены
     */
    function replaceVariables(template, variables) {
        if (!template || typeof template !== 'string') {
            return '';
        }
        var result = template;
        for (var key in variables) {
            if (variables.hasOwnProperty(key)) {
                var regex = new RegExp('{' + key + '}', 'g');
                result = result.replace(regex, variables[key] || '');
            }
        }
        return result;
    }

    return {
        system: buildSystemPrompt,
        dialog: buildDialogPrompt,
        formatHistory: formatHistory,
        replace: replaceVariables
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptBuilder;
}
