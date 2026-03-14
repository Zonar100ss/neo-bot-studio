'use strict';

/**
 * Модуль для работы с внешними API ИИ-моделей
 * Поддерживает несколько провайдеров и зеркалирование
 */
var ApiHandler = (function() {
    var API_ENDPOINTS = [
        'https://api-inference.huggingface.co/models/',
        'https://hf-mirror.com/models/'
    ];
    var DEFAULT_MODEL = 'Qwen/Qwen2.5-0.5B-Instruct';
    var TIMEOUT = 15000;
    var MAX_RETRIES = 3;

    /**
     * Отправляет запрос к API
     * @param {string} prompt - Текст запроса
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<string>} Ответ модели
     */
    async function sendRequest(prompt, config) {
        if (config === undefined) {
            config = {};
        }
        var model = config.model || DEFAULT_MODEL;
        var apiKey = config.apiKey || null;
        var endpointIndex = config.endpointIndex || 0;
        var retries = 0;

        while (retries < MAX_RETRIES) {
            try {
                var endpoint = API_ENDPOINTS[endpointIndex] + model;
                var controller = new AbortController();
                var timeoutId = setTimeout(function() {
                    controller.abort();
                }, TIMEOUT);

                var headers = {
                    'Content-Type': 'application/json'
                };
                if (apiKey) {
                    headers['Authorization'] = 'Bearer ' + apiKey;
                }

                var response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: {
                            max_new_tokens: config.maxTokens || 512,
                            temperature: config.temperature || 0.7
                        }
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error('API Error: ' + response.status);
                }

                var data = await response.json();
                return extractTextFromResponse(data);
            } catch (error) {
                retries++;
                console.warn('⚠️ API: Попытка ' + retries + ' неудачна:', error.message);
                if (retries >= MAX_RETRIES) {
                    throw error;
                }
                endpointIndex = (endpointIndex + 1) % API_ENDPOINTS.length;
                await delay(1000 * retries);
            }
        }
        throw new Error('Превышено количество попыток');
    }

    /**
     * Извлекает текст из ответа API
     * @param {Object} data - Данные ответа
     * @returns {string} Текст
     */
    function extractTextFromResponse(data) {
        if (Array.isArray(data) && data.length > 0) {
            return data[0].generated_text || '';
        }
        if (data.generated_text) {
            return data.generated_text;
        }
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        }
        return JSON.stringify(data);
    }

    /**
     * Проверяет доступность API
     * @param {string} model - Модель для проверки
     * @returns {Promise<boolean>} Доступно или нет
     */
    async function checkAvailability(model) {
        if (model === undefined) {
            model = DEFAULT_MODEL;
        }
        try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() {
                controller.abort();
            }, 5000);
            var response = await fetch(API_ENDPOINTS[0] + model, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok || response.status === 400 || response.status === 503;
        } catch (error) {
            console.warn('⚠️ API: Проверка недоступности:', error.message);
            return false;
        }
    }

    /**
     * Задержка для повторных попыток
     * @param {number} ms - Миллисекунды
     * @returns {Promise<void>}
     */
    function delay(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    }

    return {
        send: sendRequest,
        check: checkAvailability,
        ENDPOINTS: API_ENDPOINTS,
        DEFAULT_MODEL: DEFAULT_MODEL
    };
})();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiHandler;
}
