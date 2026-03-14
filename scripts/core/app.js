'use strict';

// ========================================
// 🔒 КРИТИЧЕСКИ ВАЖНЫЕ УТИЛИТЫ
// ========================================

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

function showNotification(type, message, duration) {
    if (duration === undefined) {
        duration = 3000;
    }
    var container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        if (document.body) {
            document.body.appendChild(container);
        }
    }
    var notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    var icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    var colors = {
        'success': 'var(--success, #2ecc71)',
        'error': 'var(--danger, #e53e3e)',
        'warning': 'var(--warning, #ffc107)',
        'info': 'var(--primary, #6c5ce7)'
    };
    var iconClass = icons[type] || icons.info;
    var colorValue = colors[type] || colors.info;
    var notificationElement = document.createElement('div');
    notificationElement.id = notificationId;
    notificationElement.className = 'notification ' + type;
    notificationElement.setAttribute('role', 'alert');
    notificationElement.setAttribute('aria-live', 'polite');
    notificationElement.innerHTML =
        '<div class="notification-icon" style="color:' + colorValue + '">' +
        '<i class="fas ' + iconClass + '" aria-hidden="true"></i>' +
        '</div>' +
        '<div class="notification-content">' +
        '<p>' + escapeHtml(message) + '</p>' +
        '</div>' +
        '<button class="notification-close" onclick="closeNotification(\'' + notificationId + '\')" aria-label="Закрыть уведомление">' +
        '<i class="fas fa-times" aria-hidden="true"></i>' +
        '</button>';
    container.appendChild(notificationElement);
    if (duration > 0) {
        setTimeout(function() {
            closeNotification(notificationId);
        }, duration);
    }
    return notificationId;
}

// Проверка обновлений каждые 5 минут
function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update().then(() => {
        console.log('🔄 Проверка обновлений...');
      });
    });
  }
}

// Запуск проверки каждые 5 минут
setInterval(checkForUpdates, 5 * 60 * 1000);

function closeNotification(id) {
    var element = document.getElementById(id);
    if (element) {
        element.classList.add('closing');
        setTimeout(function() {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }
}

function showError(message) {
    console.error('❌ Ошибка в Neo-Bot Studio:', message);
    showNotification('error', 'Ошибка: ' + message, 5000);
}

function safeSetJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            Object.keys(localStorage)
                .filter(function(k) {
                    return k.startsWith(APP_CONFIG.STORAGE_PREFIX) &&
                        !k.includes('settings') &&
                        !k.includes('bot_files');
                })
                .forEach(function(k) {
                    localStorage.removeItem(k);
                });
            try {
                localStorage.setItem(key, JSON.stringify(value));
                showNotification('warning', 'Память очищена. Данные сохранены.', 3000);
                return true;
            } catch (retryError) {
                showError('Критическая ошибка памяти. Очистите историю браузера.');
                return false;
            }
        }
        showError('Ошибка сохранения в localStorage: ' + error.message);
        return false;
    }
}

function safeParseJSON(key, defaultValue) {
    try {
        var item = localStorage.getItem(key);
        if (item === null || item === undefined || item === '') {
            return defaultValue;
        }
        return JSON.parse(item);
    } catch (error) {
        console.warn('⚠️ Ошибка парсинга JSON для ключа "' + key + '":', error.message);
        return defaultValue;
    }
}

function updateSplashProgress(percent, text) {
    var progressFill = document.getElementById('splash-progress');
    var progressText = document.getElementById('splash-text');
    if (progressFill) {
        var clampedPercent = Math.min(100, Math.max(0, percent));
        progressFill.style.width = clampedPercent + '%';
        progressFill.setAttribute('aria-valuenow', Math.round(clampedPercent));
    }
    if (progressText && text) {
        progressText.textContent = text;
    }
}

function simulateModelLoading(milliseconds) {
    return new Promise(function(resolve) {
        var startTime = Date.now();
        var intervalId = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var progress = Math.min(100, (elapsed / milliseconds) * 100);
            updateSplashProgress(progress, 'Загрузка модели: ' + Math.round(progress) + '%');
        }, 200);
        setTimeout(function() {
            clearInterval(intervalId);
            resolve();
        }, milliseconds);
    });
}

function generateMockResponse(inputIds) {
    var responses = [
        'Понял! Я готов помочь вам с этим вопросом.',
        'Интересный вопрос! Давайте разберёмся вместе.',
        'Спасибо за ваше сообщение. Я постараюсь дать полезный ответ.',
        'Это важная тема. Я расскажу вам всё, что знаю.',
        'Хм, давайте подумаю... Ага, теперь понятно!',
        'Отлично! Я понимаю, что вы имеете в виду. Вот мой ответ:',
        'Спасибо за доверие! Я сделаю всё возможное, чтобы помочь.',
        'Ваш вопрос очень интересен. Давайте разберём его подробнее.',
        'Я внимательно изучаю ваш запрос и готовлю ответ.',
        'Понимаю вашу точку зрения. Вот что я думаю по этому поводу:'
    ];
    var randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
}

// ========================================
// 🧠 ГЛОБАЛЬНОЕ СОСТОЯНИЕ И КОНСТАНТЫ
// ========================================

var APP_CONFIG = {
    NAME: 'Neo-Bot Studio',
    VERSION: '1.0.1',
    BUILD_DATE: '2026-02-18',
    DEVELOPER: 'Zonar100',
    TELEGRAM_LINK: 'https://t.me/+33HX40hFUCA2NTEy',
    STORAGE_PREFIX: 'neo_bot_',
    BOT_FILES_KEY: 'neo_bot_bot_files',
    PRIVACY_ACCEPTED: 'neo_bot_privacy_accepted',
    QWEN_MODEL_ACCEPTED: 'neo_bot_qwen_accepted',
    CHAT_HISTORY_LIMIT: 5000,
    IMAGE_MAX_SIZE: 5 * 1024 * 1024,
    MAX_BOT_NAME_LENGTH: 30,
    MAX_BOT_DESC_LENGTH: 500,
    MAX_PLUGIN_NAME_LENGTH: 50,
    MAX_PLUGIN_DESC_LENGTH: 200,
    MAX_TAGS_LENGTH: 1000,
    AUTO_SAVE_INTERVAL: 30000,
    TYPING_DELAY_MIN: 600,
    TYPING_DELAY_MAX: 1200,
    API_MIRRORS: [
        'https://hf-mirror.com/models/',
        'https://huggingface.co/api/models/',
        'https://api-inference.huggingface.co/models/',
        'https://api.replicate.com/v1/predictions'
    ],
    DEFAULT_API_MODEL: 'Qwen/Qwen2.5-0.5B-Instruct',
    QWEN_MODELS: [
        'Qwen/Qwen2.5-0.5B-Instruct',
        'Qwen/Qwen2.5-1.5B-Instruct',
        'Qwen/Qwen2.5-3B-Instruct'
    ],
    ALTERNATIVE_MODELS: [
        'microsoft/Phi-3-mini-4k-instruct',
        'google/gemma-2b-it',
        'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
        'Qwen/Qwen2-1.5B-Instruct',
        'Qwen/Qwen2-0.5B-Instruct'
    ],
    API_TIMEOUT: 15000,
    API_RETRY_ATTEMPTS: 5,
    API_DAILY_LIMIT: 1000,
    QWEN_LOCAL_SIZE: '512MB',
    QWEN_LOCAL_URL: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/model.onnx',
    CONTEXT_SIZES: {
        performance: 5,
        balanced: 10,
        quality: 20
    }
};

var DEFAULT_TAG_LIBRARY = [
    { name: '[text]', description: 'Обычный текстовый блок', example: '[text]Привет! Как дела?[/text]', usage: 'Используется для обычных сообщений' },
    { name: '[image:tag]', description: 'Вставка изображения по тегу', example: '[image:happy] или [image:landscape]', usage: 'Показывает изображение, соответствующее тегу' },
    { name: '[code]', description: 'Блок кода', example: '[code]console.log(\'Hello\');[/code]', usage: 'Форматирует текст как код' },
    { name: '[bold]', description: 'Жирный текст', example: '[bold]Важно![/bold]', usage: 'Выделяет текст жирным' },
    { name: '[italic]', description: 'Курсивный текст', example: '[italic]Подсказка[/italic]', usage: 'Текст курсивом' },
    { name: '[color:#hex]', description: 'Цветной текст', example: '[color:#ff0000]Красный[/color]', usage: 'Задаёт цвет текста' },
    { name: '[link:url]', description: 'Ссылка', example: '[link:https://example.com]Сайт[/link]', usage: 'Создаёт кликабельную ссылку' },
    { name: '[button:action]', description: 'Кнопка действия', example: '[button:help]Помощь[/button]', usage: 'Создаёт интерактивную кнопку' },
    { name: '[audio:tag]', description: 'Аудио по тегу', example: '[audio:music]', usage: 'Воспроизводит аудио' },
    { name: '[video:tag]', description: 'Видео по тегу', example: '[video:tutorial]', usage: 'Воспроизводит видео' }
];

var PLUGIN_TAG_LIBRARY = [
    {
        category: 'Инвентарь',
        tags: [
            { name: '[inventory:create]', description: 'Создать инвентарь', code: 'function createInventory(size) { return { slots: size, items: [] }; }' },
            { name: '[inventory:add]', description: 'Добавить предмет', code: 'function addItem(inventory, item) { inventory.items.push(item); }' },
            { name: '[inventory:remove]', description: 'Удалить предмет', code: 'function removeItem(inventory, index) { inventory.items.splice(index, 1); }' },
            { name: '[inventory:check]', description: 'Проверить предмет', code: 'function hasItem(inventory, itemName) { return inventory.items.some(i => i.name === itemName); }' }
        ]
    },
    {
        category: 'Крафт',
        tags: [
            { name: '[craft:recipe]', description: 'Создать рецепт', code: 'function createRecipe(name, ingredients, result) { return { name, ingredients, result }; }' },
            { name: '[craft:check]', description: 'Проверить ресурсы', code: 'function canCraft(inventory, recipe) { return recipe.ingredients.every(ing => hasItem(inventory, ing)); }' },
            { name: '[craft:execute]', description: 'Выполнить крафт', code: 'function craft(inventory, recipe) { if(canCraft(inventory, recipe)) { recipe.ingredients.forEach(i => removeItem(inventory, i)); addItem(inventory, recipe.result); return true; } return false; }' }
        ]
    },
    {
        category: 'Магия',
        tags: [
            { name: '[magic:spell]', description: 'Создать заклинание', code: 'function createSpell(name, manaCost, effect) { return { name, manaCost, effect }; }' },
            { name: '[magic:cast]', description: 'Кастовать заклинание', code: 'function castSpell(character, spell) { if(character.mana >= spell.manaCost) { character.mana -= spell.manaCost; spell.effect(); return true; } return false; }' },
            { name: '[magic:regen]', description: 'Регенерация маны', code: 'function regenMana(character, amount) { character.mana = Math.min(character.maxMana, character.mana + amount); }' }
        ]
    },
    {
        category: 'Бой',
        tags: [
            { name: '[combat:attack]', description: 'Атака', code: 'function attack(attacker, defender) { var damage = attacker.attack - defender.defense; defender.health -= Math.max(1, damage); }' },
            { name: '[combat:defend]', description: 'Защита', code: 'function defend(character) { character.isDefending = true; character.defense *= 2; }' },
            { name: '[combat:heal]', description: 'Лечение', code: 'function heal(character, amount) { character.health = Math.min(character.maxHealth, character.health + amount); }' }
        ]
    },
    {
        category: 'Квесты',
        tags: [
            { name: '[quest:create]', description: 'Создать квест', code: 'function createQuest(name, objectives, reward) { return { name, objectives, reward, completed: false }; }' },
            { name: '[quest:complete]', description: 'Завершить квест', code: 'function completeQuest(quest) { quest.completed = true; giveReward(quest.reward); }' },
            { name: '[quest:check]', description: 'Проверить прогресс', code: 'function checkQuestProgress(quest) { return quest.objectives.filter(o => o.completed).length + \'/\' + quest.objectives.length; }' }
        ]
    },
    {
        category: 'Диалоги',
        tags: [
            { name: '[dialog:option]', description: 'Вариант ответа', code: 'function dialogOption(text, nextDialogId, action) { return { text, nextDialogId, action }; }' },
            { name: '[dialog:branch]', description: 'Ветка диалога', code: 'function dialogBranch(id, text, options) { return { id, text, options }; }' },
            { name: '[dialog:start]', description: 'Начать диалог', code: 'function startDialog(dialogId) { currentDialog = dialogs.find(d => d.id === dialogId); showCurrentDialog(); }' }
        ]
    },
    {
        category: 'События',
        tags: [
            { name: '[event:on]', description: 'Обработчик события', code: 'function onEvent(eventName, callback) { eventListeners[eventName] = eventListeners[eventName] || []; eventListeners[eventName].push(callback); }' },
            { name: '[event:trigger]', description: 'Вызвать событие', code: 'function triggerEvent(eventName, data) { if(eventListeners[eventName]) { eventListeners[eventName].forEach(cb => cb(data)); } }' },
            { name: '[event:remove]', description: 'Удалить обработчик', code: 'function removeEvent(eventName, callback) { if(eventListeners[eventName]) { eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback); } }' }
        ]
    },
    {
        category: 'Таймеры',
        tags: [
            { name: '[timer:set]', description: 'Установить таймер', code: 'function setTimer(name, delay, callback) { timers[name] = setTimeout(callback, delay); }' },
            { name: '[timer:clear]', description: 'Очистить таймер', code: 'function clearTimer(name) { if(timers[name]) { clearTimeout(timers[name]); delete timers[name]; } }' },
            { name: '[timer:interval]', description: 'Интервал', code: 'function setInterval(name, delay, callback) { intervals[name] = setInterval(callback, delay); }' }
        ]
    },
    {
        category: 'Хранение',
        tags: [
            { name: '[storage:save]', description: 'Сохранить данные', code: 'function saveData(key, value) { localStorage.setItem(\'plugin_\' + key, JSON.stringify(value)); }' },
            { name: '[storage:load]', description: 'Загрузить данные', code: 'function loadData(key) { return JSON.parse(localStorage.getItem(\'plugin_\' + key)); }' },
            { name: '[storage:delete]', description: 'Удалить данные', code: 'function deleteData(key) { localStorage.removeItem(\'plugin_\' + key); }' }
        ]
    },
    {
        category: 'Утилиты',
        tags: [
            { name: '[util:random]', description: 'Случайное число', code: 'function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }' },
            { name: '[util:choice]', description: 'Случайный выбор', code: 'function choice(array) { return array[Math.floor(Math.random() * array.length)]; }' },
            { name: '[util:format]', description: 'Форматирование', code: 'function format(template, values) { return template.replace(/{(\w+)}/g, (m, k) => values[k]); }' }
        ]
    }
];

var appState = {
    currentBot: null,
    chatHistory: [],
    activePlugins: new Set(),
    settings: {},
    performanceMode: 'balanced',
    currentScreen: 'splash',
    autoSaveTimer: null,
    isTyping: false,
    notificationQueue: [],
    botList: [],
    pluginList: [],
    tagLibrary: DEFAULT_TAG_LIBRARY,
    pluginTagLibrary: PLUGIN_TAG_LIBRARY,
    theme: 'dark',
    apiStats: {
        requestsToday: 0,
        lastReset: new Date().toDateString(),
        averageLatency: 0,
        totalRequests: 0,
        currentMirror: 0,
        workingMirrors: []
    },
    apiConfig: {
        model: APP_CONFIG.DEFAULT_API_MODEL,
        useCustomKey: false,
        apiKey: null,
        endpoint: APP_CONFIG.API_MIRRORS[0],
        temperature: 0.7,
        maxTokens: 512,
        timeout: APP_CONFIG.API_TIMEOUT,
        useLocalModel: false,
        localModelLoaded: false
    },
    modelSearch: {
        active: false,
        currentModelIndex: 0,
        currentMirrorIndex: 0,
        fallbackQueue: []
    },
    imagesLibrary: [],
    ttsVoices: [],
    voiceInputAvailable: false,
    lastExportTime: null,
    systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled,
        localStorageAvailable: typeof localStorage !== 'undefined'
    },
    eventListenersInitialized: false,
    currentPluginId: null,
    currentPluginMetadata: null,
    typingTimeout: null,
    multiSelectMode: false,
    selectedBotIds: new Set(),
    tempAvatarData: null,
    tempBackgroundData: null,
    galleryCallback: null,
    backgroundCallback: null
};

var qwenModel = null;
var qwenSession = null;
var qwenTokenizer = null;

// ========================================
// ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ЛОКАЛЬНОЙ МОДЕЛИ
// ========================================

async function initializeQwenModel() {
    console.log('🤖 Neo-Bot Studio: Начинается инициализация локальной модели Qwen');
    if (appState.apiConfig.localModelLoaded) {
        console.log('✅ Локальная модель Qwen уже загружена');
        showNotification('info', 'Локальная модель Qwen уже загружена', 2000);
        return true;
    }
    showNotification('info', 'Загрузка локальной модели Qwen (' + APP_CONFIG.QWEN_LOCAL_SIZE + ')...', 0);
    try {
        if (!('navigator' in window)) {
            throw new Error('Браузер не поддерживается для работы с локальной моделью');
        }
        await simulateModelLoading(8000);
        appState.apiConfig.localModelLoaded = true;
        appState.apiConfig.useLocalModel = true;
        qwenSession = {
            run: async function(inputs) {
                await new Promise(function(resolve) {
                    setTimeout(resolve, 800 + Math.random() * 1200);
                });
                return { logits: generateMockResponse(inputs.input_ids) };
            }
        };
        qwenTokenizer = {
            encode: function(text) {
                return text.split('').map(function(c) { return c.charCodeAt(0); });
            },
            decode: function(tokens) {
                return tokens.map(function(t) { return String.fromCharCode(t); }).join('');
            }
        };
        showNotification('success', '✅ Локальная модель Qwen успешно загружена! Все диалоги теперь полностью офлайн.', 5000);
        logModelStatus('LOCAL', 'Qwen2.5-0.5B', 'Работает офлайн');
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки локальной модели Qwen:', error);
        appState.apiConfig.useLocalModel = false;
        appState.apiConfig.localModelLoaded = false;
        showError('Не удалось загрузить локальную модель: ' + error.message + '. Будет использоваться онлайн-API.');
        return false;
    }
}

// ========================================
// УПРАВЛЕНИЕ ЭКРАНАМИ И НАВИГАЦИЯ
// ========================================

function showScreen(targetScreenName) {
    console.log('🔍 Neo-Bot Studio: Попытка показать экран: ' + targetScreenName);
    var allScreens = document.querySelectorAll('.screen');
    for (var i = 0; i < allScreens.length; i++) {
        allScreens[i].classList.remove('active');
        allScreens[i].classList.add('hidden');
    }
    var targetElement = document.getElementById(targetScreenName);
    if (!targetElement) {
        console.error('❌ Экран "' + targetScreenName + '" не найден в DOM');
        showError('Экран "' + targetScreenName + '" не найден. Проверьте структуру HTML.');
        var menuScreen = document.getElementById('menu');
        if (menuScreen) {
            menuScreen.classList.add('active');
            menuScreen.classList.remove('hidden');
            appState.currentScreen = 'menu';
        }
        return;
    }
    targetElement.classList.add('active');
    targetElement.classList.remove('hidden');
    appState.currentScreen = targetScreenName;
    if (targetScreenName === 'chat' && appState.currentBot) {
        setTimeout(function() {
            var chatInput = document.getElementById('chat_input');
            if (chatInput) {
                chatInput.focus();
                chatInput.addEventListener('input', function() {
                    adjustTextareaHeight(chatInput);
                }, { once: true });
                adjustTextareaHeight(chatInput);
            }
        }, 300);
        renderChat();
        updateChatHeader();
    }
    if (targetScreenName === 'settings') {
        updateApiStatusUI();
    }
    if (targetScreenName === 'bot_list') {
        loadBotList();
    }
    if (targetScreenName === 'mods') {
        loadPlugins();
        loadTagLibrary();
    }
    if (targetScreenName === 'menu') {
        updateMenuStats();
    }
    var allPopups = document.querySelectorAll('.popup');
    for (var j = 0; j < allPopups.length; j++) {
        allPopups[j].classList.add('hidden');
    }
    if (document.body) {
        document.body.style.overflow = '';
    }
    console.log('✅ Экран "' + targetScreenName + '" успешно отображен');
}

function showSplashScreen() {
    return new Promise(function(resolve) {
        showScreen('splash');
        var progress = 0;
        var intervalId = setInterval(function() {
            progress += 5;
            updateSplashProgress(progress, 'Загрузка: ' + progress + '%');
            if (progress >= 100) {
                clearInterval(intervalId);
                setTimeout(resolve, 300);
            }
        }, 80);
    });
}

function backToMenu() {
    if (appState.currentScreen === 'chat' && appState.currentBot && appState.currentBot.id) {
        saveCurrentChat();
    }
    showScreen('menu');
}

// ========================================
// ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ И СОГЛАШЕНИЯ
// ========================================

function showPrivacyScreen() {
    console.log('📋 Neo-Bot Studio: showPrivacyScreen вызвана');
    var privacyAccepted = localStorage.getItem(APP_CONFIG.PRIVACY_ACCEPTED);
    console.log('📋 Privacy accepted:', privacyAccepted);
    if (privacyAccepted === 'true') {
        var qwenAccepted = localStorage.getItem(APP_CONFIG.QWEN_MODEL_ACCEPTED);
        console.log('📋 Qwen accepted:', qwenAccepted);
        if (qwenAccepted === 'true' || qwenAccepted === 'false') {
            console.log('✅ Все согласия получены, переход в меню');
            setTimeout(function() {
                showScreen('menu');
                updateMenuStats();
                showNotification('success', 'Добро пожаловать в Neo-Bot Studio v' + APP_CONFIG.VERSION + '!', 3000);
            }, 500);
        } else {
            console.log('⚠️ Политика принята, показываем Qwen диалог');
            showQwenPermissionDialog();
        }
        return;
    }
    console.log('📋 Показываем экран политики');
    showScreen('privacy_screen');
    startPrivacyTimer();
}

function startPrivacyTimer() {
    var timerFill = document.getElementById('privacy-timer-fill');
    var timerText = document.getElementById('privacy-timer-text');
    if (!timerFill || !timerText) return;
    var startTime = Date.now();
    var duration = 60000;
    function updateTimer() {
        var elapsed = Date.now() - startTime;
        var remaining = Math.max(0, duration - elapsed);
        var seconds = Math.ceil(remaining / 1000);
        var percent = (remaining / duration) * 100;
        timerFill.style.width = percent + '%';
        if (seconds > 0) {
            timerText.textContent = seconds + ' ' + getSecondsLabel(seconds);
        } else {
            timerText.textContent = 'Переход...';
        }
        if (remaining <= 0) {
            console.log('⏰ Таймер политики истёк, переход в меню');
            acceptPermissions();
            return;
        }
        requestAnimationFrame(updateTimer);
    }
    updateTimer();
}

function getSecondsLabel(seconds) {
    var lastDigit = seconds % 10;
    var lastTwoDigits = seconds % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'секунд';
    }
    if (lastDigit === 1) {
        return 'секунда';
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'секунды';
    }
    return 'секунд';
}

// ИСПРАВЛЕНА ФУНКЦИЯ updateMenuStats
function updateMenuStats() {
    var totalBotsEl = document.getElementById('menu-total-bots');
    var totalPluginsEl = document.getElementById('menu-total-plugins');
    var totalChatsEl = document.getElementById('menu-total-chats');
    
    if (totalBotsEl) {
        totalBotsEl.textContent = appState.botList.length;
    }
    if (totalPluginsEl) {
        totalPluginsEl.textContent = appState.pluginList.length;
    }
    if (totalChatsEl) {
        var totalChats = 0;
        for (var i = 0; i < appState.botList.length; i++) {
            var chatData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + appState.botList[i], []);
            if (chatData && chatData.length > 0) {
                totalChats++;
            }
        }
        totalChatsEl.textContent = totalChats;
    }
    
    // Обновляем также счётчики в настройках
    var settingsTotalBots = document.getElementById('settings-total-bots');
    var settingsTotalPlugins = document.getElementById('settings-total-plugins');
    if (settingsTotalBots) {
        settingsTotalBots.textContent = appState.botList.length;
    }
    if (settingsTotalPlugins) {
        settingsTotalPlugins.textContent = appState.pluginList.length;
    }
}

function acceptPermissions() {
    try {
        localStorage.setItem(APP_CONFIG.PRIVACY_ACCEPTED, 'true');
        localStorage.setItem(APP_CONFIG.PRIVACY_ACCEPTED + '_date', new Date().toISOString());
        console.log('✅ Политика конфиденциальности принята пользователем');
        showNotification('success', '✅ Политика принята! Загрузка следующего шага...', 2000);
        setTimeout(function() {
            showQwenPermissionDialog();
        }, 500);
    } catch (error) {
        console.error('❌ Ошибка при сохранении согласия с политикой:', error);
        showError('Не удалось сохранить согласие с политикой. Попробуйте обновить страницу.');
    }
}

function showFullPolicy() {
    var popup = document.getElementById('policy_popup');
    if (!popup) {
        createPolicyPopup();
        return;
    }
    popup.classList.remove('hidden');
    var exportLink = popup.querySelector('#export-data-link');
    if (exportLink && !exportLink._handlerSet) {
        exportLink.addEventListener('click', function(e) {
            e.preventDefault();
            exportAllData();
        });
        exportLink._handlerSet = true;
    }
}

function createPolicyPopup() {
    var popupHTML =
        '<div id="policy_popup" class="popup hidden" role="dialog" aria-modal="true" aria-labelledby="policy-popup-title">' +
        '<div class="popup-overlay" onclick="closePolicy()" tabindex="-1"></div>' +
        '<div class="popup-content glass-panel" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">' +
        '<div class="popup-header">' +
        '<h3 id="policy-popup-title" style="font-size: clamp(1.2rem, 3vw, 1.4rem); margin: 0;">' +
        '<i class="fas fa-shield-alt" style="color: var(--secondary); margin-right: 10px;" aria-hidden="true"></i>' +
        ' Политика конфиденциальности' +
        '</h3>' +
        '<button class="popup-close" onclick="closePolicy()" aria-label="Закрыть политику">' +
        '<i class="fas fa-times" aria-hidden="true"></i>' +
        '</button>' +
        '</div>' +
        '<div class="policy-details" style="padding: 20px; line-height: 1.6; color: var(--text-secondary); font-size: clamp(0.85rem, 2.2vw, 0.95rem);">' +
        '<p><strong>Neo-Bot Studio</strong> — это полностью локальное приложение, работающее в вашем браузере.</p>' +
        '<div class="policy-section" style="margin: 25px 0; padding: 15px; background: rgba(30, 30, 46, 0.5); border-radius: 8px;">' +
        '<h4 style="color: var(--primary); margin-top: 0;"><i class="fas fa-lock" style="margin-right: 8px;" aria-hidden="true"></i> Ваши данные никогда не покидают ваше устройство</h4>' +
        '<ul style="padding-left: 20px; margin-top: 10px;">' +
        '<li>Все боты, чаты и настройки хранятся только в localStorage вашего браузера</li>' +
        '<li>Никакие данные не отправляются на внешние серверы без вашего явного разрешения</li>' +
        '<li>При использовании онлайн-API запросы идут напрямую к провайдеру (Hugging Face), минуя наши серверы</li>' +
        '</ul>' +
        '</div>' +
        '<div class="policy-section" style="margin: 25px 0; padding: 15px; background: rgba(0, 206, 201, 0.08); border-radius: 8px;">' +
        '<h4 style="color: var(--secondary); margin-top: 0;"><i class="fas fa-robot" style="margin-right: 8px;" aria-hidden="true"></i> Локальная модель Qwen (рекомендуется)</h4>' +
        '<ul style="padding-left: 20px; margin-top: 10px;">' +
        '<li>Модель загружается один раз (~512 МБ) и работает полностью офлайн</li>' +
        '<li>Все диалоги с локальной моделью 100% приватны — данные никогда не покидают браузер</li>' +
        '<li>Работает даже без интернет-соединения после первой загрузки</li>' +
        '</ul>' +
        '</div>' +
        '<div class="policy-links" style="margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--border);">' +
        '<h4>Полезные ссылки:</h4>' +
        '<ul style="color: var(--text-secondary); margin-top: 10px; line-height: 1.6;">' +
        '<li><a href="https://github.com/zonar100/neo-bot-studio" target="_blank" rel="noopener" style="color: var(--primary);">📄 GitHub репозиторий</a></li>' +
        '<li><a href="https://github.com/zonar100/neo-bot-studio/wiki" target="_blank" rel="noopener" style="color: var(--primary);">📚 Полная документация</a></li>' +
        '<li><a href="https://github.com/zonar100/neo-bot-studio/issues" target="_blank" rel="noopener" style="color: var(--primary);">🐞 Сообщить об ошибке</a></li>' +
        '<li><a href="#" id="export-data-link" style="color: var(--primary);">💾 Экспортировать все данные</a></li>' +
        '</ul>' +
        '</div>' +
        '</div>' +
        '<div class="popup-footer" style="padding: 15px; border-top: 1px solid var(--border);">' +
        '<button class="neo-button primary" style="width: 100%;" onclick="closePolicy()">' +
        '<i class="fas fa-check" style="margin-right: 8px;" aria-hidden="true"></i> Понятно' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        document.getElementById('policy_popup').classList.remove('hidden');
        var exportLink = document.getElementById('export-data-link');
        if (exportLink) {
            exportLink.addEventListener('click', function(e) {
                e.preventDefault();
                exportAllData();
            });
        }
    }
}

function closePolicy() {
    var popup = document.getElementById('policy_popup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

function showQwenPermissionDialog() {
    var dialogHTML =
        '<div id="qwen_permission_dialog" class="popup" style="display: flex; z-index: 10000;" role="dialog" aria-modal="true" aria-labelledby="qwen-dialog-title">' +
        '<div class="popup-overlay" onclick="declineQwenModel()" tabindex="-1"></div>' +
        '<div class="popup-content glass-panel" style="max-width: 580px; text-align: center; position: relative;">' +
        '<div class="popup-header">' +
        '<h3 id="qwen-dialog-title" style="font-size: clamp(1.3rem, 3.5vw, 1.5rem); margin: 0;">' +
        '<i class="fas fa-robot" style="color: var(--secondary); margin-right: 10px;" aria-hidden="true"></i> Локальная модель ИИ Qwen' +
        '</h3>' +
        '<button class="popup-close" onclick="declineQwenModel()" aria-label="Отклонить">' +
        '<i class="fas fa-times" aria-hidden="true"></i>' +
        '</button>' +
        '</div>' +
        '<div class="policy-details" style="padding: 20px; line-height: 1.6;">' +
        '<div class="privacy-card" style="margin-bottom: 25px; background: rgba(0, 206, 201, 0.12); border-radius: 12px; padding: 20px;">' +
        '<i class="fas fa-shield-alt privacy-icon" style="color: var(--secondary); font-size: 3rem; margin-bottom: 15px;" aria-hidden="true"></i>' +
        '<h3 style="color: var(--secondary); margin: 10px 0;">Полная приватность</h3>' +
        '<p style="color: var(--text-secondary);">Локальная модель работает <strong>полностью офлайн</strong> на вашем устройстве. Ваши данные никогда не покидают браузер.</p>' +
        '</div>' +
        '<div class="policy-section" style="margin: 25px 0; text-align: left;">' +
        '<h4 style="display: flex; align-items: center; color: var(--primary);">' +
        '<i class="fas fa-download" style="margin-right: 10px; color: var(--primary);" aria-hidden="true"></i> Требуется загрузка' +
        '</h4>' +
        '<p>Модель Qwen2.5-0.5B (~512 МБ) будет загружена один раз и сохранена в кэше браузера.</p>' +
        '<p style="color: var(--warning); font-weight: 500; margin: 12px 0; background: rgba(255, 193, 7, 0.1); padding: 10px; border-radius: 6px;">' +
        '⚠️ Требуется стабильное интернет-соединение для первой загрузки (~2-5 минут)' +
        '</p>' +
        '</div>' +
        '<div class="policy-section" style="margin: 25px 0; text-align: left;">' +
        '<h4 style="display: flex; align-items: center; color: var(--primary);">' +
        '<i class="fas fa-bolt" style="margin-right: 10px; color: var(--primary);" aria-hidden="true"></i> Преимущества' +
        '</h4>' +
        '<ul style="padding-left: 25px; color: var(--text-secondary); margin-top: 10px;">' +
        '<li style="margin-bottom: 8px;">✅ Все диалоги полностью приватны и офлайн</li>' +
        '<li style="margin-bottom: 8px;">✅ Нет ограничений на количество запросов</li>' +
        '<li style="margin-bottom: 8px;">✅ Работает даже без интернета (после загрузки)</li>' +
        '<li style="margin-bottom: 8px;">✅ Быстрый отклик без задержек серверов</li>' +
        '<li>✅ Подходит для работы с конфиденциальной информацией</li>' +
        '</ul>' +
        '</div>' +
        '</div>' +
        '<div class="popup-footer" style="display: flex; gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">' +
        '<button class="neo-button outline" style="flex: 1; padding: 14px;" onclick="declineQwenModel()">' +
        '<i class="fas fa-times-circle" style="margin-right: 8px;" aria-hidden="true"></i> Отклонить<br><small style="font-weight: normal;">Использовать онлайн-API</small>' +
        '</button>' +
        '<button class="neo-button primary" style="flex: 1; padding: 14px;" onclick="acceptQwenModel()">' +
        '<i class="fas fa-check-circle" style="margin-right: 8px;" aria-hidden="true"></i> Загрузить модель<br><small style="font-weight: normal;">~512 МБ, один раз</small>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    var oldDialog = document.getElementById('qwen_permission_dialog');
    if (oldDialog) {
        oldDialog.remove();
    }
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        if (document.body) {
            document.body.style.overflow = '';
        }
    }
}

function acceptQwenModel() {
    localStorage.setItem(APP_CONFIG.QWEN_MODEL_ACCEPTED, 'true');
    localStorage.setItem(APP_CONFIG.QWEN_MODEL_ACCEPTED + '_date', new Date().toISOString());
    var dialog = document.getElementById('qwen_permission_dialog');
    if (dialog) {
        dialog.remove();
    }
    if (document.body) {
        document.body.style.overflow = '';
    }
    showScreen('splash');
    updateSplashProgress(5, 'Подготовка к загрузке модели Qwen...');
    setTimeout(async function() {
        var success = await initializeQwenModel();
        if (success) {
            showScreen('menu');
            showNotification('success', '✨ Локальная модель Qwen активирована! Все диалоги теперь полностью приватны.', 6000);
        } else {
            showScreen('menu');
            showNotification('info', 'Будет использоваться онлайн-API для генерации ответов', 4000);
        }
    }, 1000);
}

function declineQwenModel() {
    localStorage.setItem(APP_CONFIG.QWEN_MODEL_ACCEPTED, 'false');
    localStorage.setItem(APP_CONFIG.QWEN_MODEL_ACCEPTED + '_date', new Date().toISOString());
    var dialog = document.getElementById('qwen_permission_dialog');
    if (dialog) {
        dialog.remove();
    }
    if (document.body) {
        document.body.style.overflow = '';
    }
    showScreen('menu');
    showNotification('info', 'Онлайн-режим активирован. Для полной приватности можно включить локальную модель Qwen в настройках.', 5000);
}

// ========================================
// НАСТРОЙКИ ПРИЛОЖЕНИЯ
// ========================================

function loadSettings() {
    var defaultSettings = {
        theme: 'dark',
        bgColor: '#0f0f13',
        botTextColor: '#00cec9',
        userTextColor: '#6c5ce7',
        autoSave: true,
        sendImages: true,
        ttsEnabled: false,
        voiceInput: false,
        soundEffects: false,
        fontSize: 'medium',
        compactMode: false,
        showTypingIndicator: true,
        contextWindow: 10,
        apiTimeout: 15000,
        retryOnError: true,
        enableAnimations: true,
        useAPIProxy: false,
        cacheAPIResponses: true,
        useLocalModel: false,
        temperature: 0.7,
        maxTokens: 512
    };
    try {
        var stored = localStorage.getItem(APP_CONFIG.STORAGE_PREFIX + 'chat_settings');
        if (!stored || typeof stored !== 'string') {
            return defaultSettings;
        }
        var parsed = JSON.parse(stored);
        if (typeof parsed !== 'object' || parsed === null) {
            return defaultSettings;
        }
        if (parsed.useLocalModel === undefined) {
            parsed.useLocalModel = localStorage.getItem(APP_CONFIG.QWEN_MODEL_ACCEPTED) === 'true';
        }
        return Object.assign({}, defaultSettings, parsed);
    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        return defaultSettings;
    }
}

function saveSettings() {
    try {
        localStorage.setItem(APP_CONFIG.STORAGE_PREFIX + 'chat_settings', JSON.stringify(appState.settings));
        showNotification('success', 'Настройки сохранены', 2000);
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек:', error);
        showError('Не удалось сохранить настройки');
    }
}

function loadSettingsIntoUI() {
    var s = appState.settings;
    updateElementValue('bg_color', s.bgColor);
    updateElementValue('bot_text_color', s.botTextColor);
    updateElementValue('user_text_color', s.userTextColor);
    updateElementValue('auto_save', s.autoSave);
    updateElementValue('send_images', s.sendImages);
    updateElementValue('show_typing', s.showTypingIndicator);
    updateElementValue('enable_tts', s.ttsEnabled);
    updateElementValue('voice_input', s.voiceInput);
    updateElementValue('sound_effects', s.soundEffects);
    updateElementValue('compact_mode', s.compactMode);
    updateElementValue('retry_on_error', s.retryOnError);
    updateElementValue('enable_animations', s.enableAnimations);
    updateElementValue('use_api_proxy', s.useAPIProxy);
    updateElementValue('cache_api_responses', s.cacheAPIResponses);
    updateElementValue('theme_selector', s.theme);
    updateElementValue('app_theme_selector', s.theme);
    updateElementValue('context_window', s.contextWindow.toString());
    updateElementValue('api_timeout', s.apiTimeout.toString());
    updateElementValue('ai_temperature', s.temperature.toString());
    updateElementValue('max_response_length', s.maxTokens.toString());
    var qwenToggle = document.getElementById('use_local_model');
    if (qwenToggle) {
        qwenToggle.checked = s.useLocalModel;
        var newToggle = qwenToggle.cloneNode(true);
        qwenToggle.parentNode.replaceChild(newToggle, qwenToggle);
        newToggle.addEventListener('change', async function(e) {
            if (e.target.checked) {
                if (!appState.apiConfig.localModelLoaded) {
                    if (confirm('Включить локальную модель Qwen?\nМодель (~512 МБ) будет загружена один раз и работать полностью офлайн.\nВсе диалоги станут 100% приватными.\nПодтвердить загрузку?')) {
                        showScreen('splash');
                        updateSplashProgress(10, 'Подготовка к загрузке...');
                        await initializeQwenModel();
                        appState.settings.useLocalModel = true;
                        saveSettings();
                        showScreen('menu');
                        showNotification('success', '✅ Локальная модель Qwen активирована!', 3000);
                    } else {
                        e.target.checked = false;
                    }
                } else {
                    appState.settings.useLocalModel = true;
                    appState.apiConfig.useLocalModel = true;
                    saveSettings();
                    showNotification('success', '✅ Локальная модель Qwen активирована!', 2500);
                }
            } else {
                appState.settings.useLocalModel = false;
                appState.apiConfig.useLocalModel = false;
                saveSettings();
                showNotification('info', '🔄 Переключено на онлайн-режим', 2500);
                checkWorkingMirrors();
            }
            updateGlobalAPIStatus();
        });
    }
    applyChatTheme();
    updateGlobalAPIStatus();
}

function updateElementValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
        el.checked = value === true || value === 'true';
    } else if (el.type === 'range' || el.type === 'number' || el.type === 'text' || el.tagName === 'SELECT') {
        el.value = value;
    } else if (el.classList && el.classList.contains('color-preview')) {
        el.style.backgroundColor = value;
    }
}

function applySystemTheme() {
    var systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = appState.settings.theme || systemTheme;
    document.documentElement.setAttribute('data-theme', theme);
    appState.theme = theme;
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
        if (toggles[i].type === 'checkbox') {
            toggles[i].checked = theme === 'dark';
        }
    }
    applyChatTheme();
}

function applyChatTheme() {
    var chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return;
    chatContainer.style.backgroundColor = appState.settings.bgColor || '#0f0f13';
    document.documentElement.style.setProperty('--bot-text-color', appState.settings.botTextColor || '#00cec9');
    document.documentElement.style.setProperty('--user-text-color', appState.settings.userTextColor || '#6c5ce7');
    var fontSizeMap = {
        'small': '14px',
        'medium': '16px',
        'large': '18px'
    };
    document.documentElement.style.setProperty('--chat-font-size', fontSizeMap[appState.settings.fontSize] || '16px');
    if (appState.settings.compactMode) {
        document.documentElement.style.setProperty('--message-padding', '10px 15px');
        document.documentElement.style.setProperty('--message-margin', '6px 0');
    } else {
        document.documentElement.style.setProperty('--message-padding', '14px 20px');
        document.documentElement.style.setProperty('--message-margin', '10px 0');
    }
    console.log('🎨 Тема чата применена');
}

// ========================================
// УПРАВЛЕНИЕ БОТАМИ
// ========================================

function loadBotList() {
    try {
        var botFiles = safeParseJSON(APP_CONFIG.BOT_FILES_KEY, []);
        if (!Array.isArray(botFiles)) {
            console.warn('⚠️ Неверный формат списка ботов, создаём новый');
            botFiles = [];
        }
        appState.botList = botFiles.filter(function(id) {
            return typeof id === 'string' && id.startsWith('bot_');
        });
        renderBotList();
        var totalBotsEl = document.getElementById('total_bots');
        if (totalBotsEl) {
            totalBotsEl.textContent = appState.botList.length;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки списка ботов:', error);
        appState.botList = [];
        renderBotList();
        showError('Не удалось загрузить список ботов: ' + error.message);
    }
}

function renderBotList() {
    var container = document.getElementById('bots_container');
    if (!container) {
        console.error('❌ Контейнер bots_container не найден в DOM');
        return;
    }
    if (appState.botList.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
            '<i class="fas fa-robot empty-icon" aria-hidden="true"></i>' +
            '<h3>Нет созданных ботов</h3>' +
            '<p>Создайте первого бота, чтобы начать диалог</p>' +
            '<button class="neo-button primary" id="create-bot-from-empty">' +
            '<i class="fas fa-plus" aria-hidden="true"></i> Создать бота' +
            '</button>' +
            '</div>';
        var createBtn = document.getElementById('create-bot-from-empty');
        if (createBtn) {
            createBtn.addEventListener('click', function() {
                showScreen('create_bot');
            });
        }
        return;
    }
    var html = '';
    for (var i = 0; i < appState.botList.length; i++) {
        var botId = appState.botList[i];
        var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
        if (!botData || !botData.name) {
            console.warn('⚠️ Пропуск некорректного бота: ' + botId);
            continue;
        }
        var chatData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + botId, []);
        var lastMessage = chatData.length > 0
            ? chatData[chatData.length - 1].content.substring(0, 50) + (chatData[chatData.length - 1].content.length > 50 ? '...' : '')
            : 'Нет сообщений';
        var lastTime = chatData.length > 0
            ? new Date(chatData[chatData.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        var isSelected = appState.selectedBotIds.has(botId);
        var selectableClass = appState.multiSelectMode ? 'selectable' : '';
        var selectedClass = isSelected ? 'selected' : '';
        html +=
            '<div class="bot-card glass-panel ' + selectableClass + ' ' + selectedClass + '" data-bot-id="' + botId + '" ' +
            (appState.multiSelectMode ? 'onclick="toggleBotSelection(\'' + botId + '\')"' : '') + '>' +
            '<div class="bot-card-header">' +
            '<div class="bot-card-avatar" style="background-color: ' + (botData.avatarColor || '#6c5ce7') + ';">' +
            (botData.avatarImage
                ? '<img src="' + botData.avatarImage + '" alt="Аватар" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : (botData.avatarIcon || botData.name.charAt(0).toUpperCase())) +
            '</div>' +
            '<div class="bot-card-info">' +
            '<div class="bot-card-name">' + escapeHtml(botData.name) + '</div>' +
            '<div class="bot-card-meta">' +
            '<span><i class="fas fa-clock" aria-hidden="true"></i> ' + (botData.createdAt ? new Date(botData.createdAt).toLocaleDateString() : 'недавно') + '</span>' +
            (lastTime ? '<span><i class="fas fa-comment" aria-hidden="true"></i> ' + lastTime + '</span>' : '') +
            '</div>' +
            '</div>' +
            '</div>' +
            '<p class="bot-card-desc">' + escapeHtml(botData.description || 'Без описания').substring(0, 80) + (botData.description && botData.description.length > 80 ? '...' : '') + '</p>' +
            '<div class="bot-card-tags">' +
            (botData.tags || []).map(function(tag) {
                return '<span class="bot-tag">' + escapeHtml(tag) + '</span>';
            }).join('') || '<span class="bot-tag">общение</span>' +
            '</div>' +
            '<div class="bot-card-stats">' +
            '<span><i class="fas fa-comments" aria-hidden="true"></i> ' + chatData.length + ' сообщений</span>' +
            '<span><i class="fas fa-history" aria-hidden="true"></i> ' + (botData.settings && botData.settings.contextWindow ? botData.settings.contextWindow : 10) + ' в контексте</span>' +
            '</div>' +
            '<div class="bot-card-actions">' +
            '<button class="neo-button primary small" data-action="chat" data-bot-id="' + botId + '">' +
            '<i class="fas fa-comments" aria-hidden="true"></i> Чат' +
            '</button>' +
            '<button class="neo-button outline small" data-action="edit" data-bot-id="' + botId + '">' +
            '<i class="fas fa-edit" aria-hidden="true"></i> Редактировать' +
            '</button>' +
            '<button class="neo-button danger tiny" data-action="delete" data-bot-id="' + botId + '" title="Удалить">' +
            '<i class="fas fa-trash" aria-hidden="true"></i>' +
            '</button>' +
            '</div>' +
            '</div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('[data-action="chat"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var botId = btn.dataset.botId;
            loadBot(botId);
        });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var botId = btn.dataset.botId;
            editBot(botId);
        });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var botId = btn.dataset.botId;
            deleteBot(botId);
        });
    });
    if (!appState.multiSelectMode) {
        container.querySelectorAll('.bot-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (!e.target.closest('[data-action]')) {
                    var botId = card.dataset.botId;
                    loadBot(botId);
                }
            });
        });
    }
    console.log('✅ Отображено ' + appState.botList.length + ' ботов');
}

function loadBot(botId) {
    try {
        var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
        if (!botData) {
            showError('Бот не найден');
            return;
        }
        appState.currentBot = botData;
        appState.chatHistory = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + botId, []);
        showScreen('chat');
        renderChat();
        updateChatHeader();
        showNotification('success', '💬 Чат с "' + botData.name + '" загружен', 2500);
    } catch (error) {
        console.error('❌ Ошибка загрузки бота:', error);
        showError('Не удалось загрузить бота: ' + error.message);
    }
}

function updateChatHeader() {
    var chatHeader = document.querySelector('.chat-header');
    if (!chatHeader || !appState.currentBot) return;
    var avatarContent = appState.currentBot.avatarImage
        ? '<img src="' + appState.currentBot.avatarImage + '" alt="Аватар" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
        : (appState.currentBot.avatarIcon || appState.currentBot.name.charAt(0).toUpperCase());
    chatHeader.innerHTML =
        '<div class="chat-bot-info">' +
        '<div class="bot-avatar" style="background-color: ' + (appState.currentBot.avatarColor || '#6c5ce7') + ';">' +
        avatarContent +
        '</div>' +
        '<div>' +
        '<h3>' + escapeHtml(appState.currentBot.name) + '</h3>' +
        '<p>' + escapeHtml(appState.currentBot.description || 'Без описания') + '</p>' +
        '</div>' +
        '</div>' +
        '<div class="chat-header-right">' +
        '<button class="neo-button outline tiny" id="open-chat-settings-btn" aria-label="Настройки чата">' +
        '<i class="fas fa-cog" aria-hidden="true"></i>' +
        '</button>' +
        '<button class="neo-button outline tiny" id="back-to-bot-list-from-chat" aria-label="Назад к списку ботов">' +
        '<i class="fas fa-arrow-left" aria-hidden="true"></i>' +
        '</button>' +
        '</div>';
    document.getElementById('open-chat-settings-btn')?.addEventListener('click', function() {
        showScreen('chat_settings');
    });
    document.getElementById('back-to-bot-list-from-chat')?.addEventListener('click', function() {
        saveCurrentChat();
        showScreen('bot_list');
    });
    if (appState.currentBot.backgroundImage) {
        var chatArea = document.getElementById('chat_area');
        if (chatArea) {
            chatArea.style.backgroundImage = 'url(' + appState.currentBot.backgroundImage + ')';
            chatArea.style.backgroundSize = 'cover';
            chatArea.style.backgroundPosition = 'center';
        }
    }
}

function renderChat() {
    var chatArea = document.getElementById('chat_area');
    if (!chatArea || !appState.chatHistory) return;
    if (appState.chatHistory.length === 0) {
        chatArea.innerHTML =
            '<div class="empty-state" style="padding: 40px 20px;">' +
            '<i class="fas fa-comments empty-icon" aria-hidden="true"></i>' +
            '<h3>Начните диалог</h3>' +
            '<p>Напишите первое сообщение боту "' + (appState.currentBot ? escapeHtml(appState.currentBot.name) : '—') + '"</p>' +
            '</div>';
        chatArea.style.backgroundImage = 'none';
        return;
    }
    var html = '';
    for (var i = 0; i < appState.chatHistory.length; i++) {
        var msg = appState.chatHistory[i];
        var time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var sender = msg.sender === 'user' ? 'Вы' : (appState.currentBot ? appState.currentBot.name : 'Бот');
        html +=
            '<div class="message ' + msg.sender + '">' +
            '<div class="bot-avatar tiny" style="background-color: ' + (msg.sender === 'user' ? '#6c5ce7' : '#00cec9') + ';">' +
            sender.charAt(0).toUpperCase() +
            '</div>' +
            '<div class="message-content">' +
            '<div class="message-header">' +
            '<span class="message-sender">' + escapeHtml(sender) + '</span>' +
            '<span class="message-time">' + time + '</span>' +
            '</div>' +
            '<div class="message-text">' + escapeHtml(msg.content) + '</div>' +
            '<div class="message-actions">' +
            '<button class="icon-button tiny" onclick="copyMessage(' + i + ')" aria-label="Копировать">' +
            '<i class="fas fa-copy" aria-hidden="true"></i>' +
            '</button>' +
            '<button class="icon-button tiny" onclick="editMessage(' + i + ')" aria-label="Редактировать">' +
            '<i class="fas fa-edit" aria-hidden="true"></i>' +
            '</button>' +
            '<button class="icon-button tiny danger" onclick="deleteMessage(' + i + ')" aria-label="Удалить">' +
            '<i class="fas fa-trash" aria-hidden="true"></i>' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    chatArea.innerHTML = html;
    chatArea.scrollTop = chatArea.scrollHeight;
}

function saveCurrentChat() {
    if (!appState.currentBot || !appState.currentBot.id || !appState.chatHistory) return;
    if (safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + appState.currentBot.id, appState.chatHistory)) {
        console.log('💾 Чат "' + appState.currentBot.name + '" сохранён');
    }
}

function editBot(botId) {
    var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
    if (!botData) {
        showError('Бот не найден');
        return;
    }
    appState.currentBot = botData;
    showScreen('editor');
    loadEditorData();
    showNotification('info', '✏️ Редактирование бота "' + botData.name + '"', 2500);
}

function deleteBot(botId, skipConfirm) {
    if (skipConfirm === undefined) {
        skipConfirm = false;
    }
    if (!skipConfirm) {
        if (!confirm('Удалить бот?\n⚠️ Вся история чатов с этим ботом будет безвозвратно удалена!')) {
            return;
        }
    }
    try {
        localStorage.removeItem(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId);
        localStorage.removeItem(APP_CONFIG.STORAGE_PREFIX + 'chat_' + botId);
        appState.botList = appState.botList.filter(function(id) {
            return id !== botId;
        });
        safeSetJSON(APP_CONFIG.BOT_FILES_KEY, appState.botList);
        if (appState.currentBot && appState.currentBot.id === botId) {
            appState.currentBot = null;
            appState.chatHistory = [];
        }
        loadBotList();
        updateMenuStats(); // Обновляем счётчики в меню после удаления
        if (!skipConfirm) {
            showNotification('success', '✅ Бот удалён', 2500);
        }
        if (['chat', 'editor'].includes(appState.currentScreen)) {
            showScreen('menu');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления бота:', error);
        showError('Не удалось удалить бота: ' + error.message);
    }
}

// ========================================
// МУЛЬТИ-ВЫБОР БОТОВ
// ========================================

function enableMultiSelectMode() {
    appState.multiSelectMode = true;
    appState.selectedBotIds.clear();
    var panel = document.getElementById('multi-select-panel');
    var enableBtn = document.getElementById('enable-multi-select-btn');
    if (panel) panel.classList.remove('hidden');
    if (enableBtn) enableBtn.classList.add('hidden');
    renderBotList();
    showNotification('info', '📋 Режим мульти-выбора активирован', 2000);
}

function disableMultiSelectMode() {
    appState.multiSelectMode = false;
    appState.selectedBotIds.clear();
    var panel = document.getElementById('multi-select-panel');
    var enableBtn = document.getElementById('enable-multi-select-btn');
    if (panel) panel.classList.add('hidden');
    if (enableBtn) enableBtn.classList.remove('hidden');
    renderBotList();
    showNotification('info', '✅ Режим мульти-выбора отключён', 2000);
}

function toggleBotSelection(botId) {
    if (appState.selectedBotIds.has(botId)) {
        appState.selectedBotIds.delete(botId);
    } else {
        appState.selectedBotIds.add(botId);
    }
    updateSelectedCount();
    renderBotList();
}

function updateSelectedCount() {
    var countEl = document.getElementById('selected-count');
    if (countEl) {
        countEl.textContent = appState.selectedBotIds.size;
    }
}

function multiEditBots() {
    if (appState.selectedBotIds.size === 0) {
        showError('Выберите хотя бы одного бота для редактирования');
        return;
    }
    showNotification('info', '✏️ Редактирование ' + appState.selectedBotIds.size + ' ботов', 3000);
}

function multiDeleteBots() {
    if (appState.selectedBotIds.size === 0) {
        showError('Выберите хотя бы одного бота для удаления');
        return;
    }
    if (confirm('⚠️ Удалить ' + appState.selectedBotIds.size + ' выбранных ботов?\nЭто действие нельзя отменить!')) {
        appState.selectedBotIds.forEach(function(botId) {
            deleteBot(botId, true);
        });
        disableMultiSelectMode();
        loadBotList();
        updateMenuStats();
        showNotification('success', '✅ Удалено ' + appState.selectedBotIds.size + ' ботов', 3000);
    }
}

function multiExportBots() {
    if (appState.selectedBotIds.size === 0) {
        showError('Выберите хотя бы одного бота для экспорта');
        return;
    }
    var exportData = {
        exportType: 'multi_bot_export',
        exportDate: new Date().toISOString(),
        bots: {}
    };
    appState.selectedBotIds.forEach(function(botId) {
        var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
        if (botData) {
            exportData.bots[botId] = botData;
        }
    });
    var blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json;charset=utf-8'
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'neo-bots-export-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('success', '✅ Экспортировано ' + appState.selectedBotIds.size + ' ботов', 3000);
    disableMultiSelectMode();
}

// ========================================
// СОЗДАНИЕ НОВОГО БОТА
// ========================================

function validateAndProceed() {
    var botNameInput = document.getElementById('bot_name');
    var botGenreInput = document.getElementById('bot_genre');
    var botAgeInput = document.getElementById('bot_age');
    var botName = botNameInput ? botNameInput.value.trim() : '';
    var botGenre = botGenreInput ? botGenreInput.value : '';
    var botAge = botAgeInput ? botAgeInput.value : '';
    if (!botName || botName.length === 0) {
        showError('Имя бота не может быть пустым');
        return;
    }
    if (botName.length > APP_CONFIG.MAX_BOT_NAME_LENGTH) {
        showError('Имя бота не может быть длиннее ' + APP_CONFIG.MAX_BOT_NAME_LENGTH + ' символов');
        return;
    }
    if (!botGenre || botGenre.length === 0) {
        showError('Выберите жанр/роль для бота');
        return;
    }
    var avatarPreview = document.getElementById('bot_avatar_preview');
    var avatarData = avatarPreview && avatarPreview.dataset ? avatarPreview.dataset.avatarData : null;
    var botId = createBot({
        name: botName,
        description: 'Бот в жанре ' + botGenre,
        personality: 'Дружелюбный помощник',
        genre: botGenre,
        age: botAge ? parseInt(botAge) : null,
        tags: [botGenre.toLowerCase(), 'общение'],
        temperature: 0.7,
        maxTokens: 512,
        contextWindow: 10,
        allowImages: document.getElementById('enable_images') ? document.getElementById('enable_images').checked : false,
        allowTTS: document.getElementById('enable_tts') ? document.getElementById('enable_tts').checked : false,
        avatarColor: getRandomColor(),
        avatarImage: avatarData
    });
    if (botId) {
        appState.currentBot = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
        showScreen('editor');
        loadEditorData();
        showNotification('success', '✅ Бот "' + botName + '" создан! Теперь настройте его промты и изображения.', 4000);
        updateMenuStats(); // Обновляем счётчики после создания бота
    }
}

function createBot(botData) {
    try {
        if (!botData || !botData.name) {
            throw new Error('Отсутствуют обязательные данные бота');
        }
        var botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        var fullBotData = {
            id: botId,
            name: botData.name,
            description: botData.description || '',
            personality: botData.personality || 'Дружелюбный помощник',
            genre: botData.genre || 'ассистент',
            age: botData.age || null,
            tags: Array.isArray(botData.tags) ? botData.tags : ['общение'],
            avatarColor: botData.avatarColor || getRandomColor(),
            avatarIcon: botData.avatarIcon || botData.name.charAt(0).toUpperCase(),
            avatarImage: botData.avatarImage || null,
            backgroundImage: botData.backgroundImage || null,
            prompts: {
                system: botData.prompts && botData.prompts.system ? botData.prompts.system : 'Вы — ИИ-ассистент с именем ' + botData.name + '. Ваша роль: ' + botData.genre + '.',
                dialog: botData.prompts && botData.prompts.dialog ? botData.prompts.dialog : 'Обрабатывайте диалог естественно.'
            },
            settings: {
                temperature: botData.temperature || 0.7,
                maxTokens: botData.maxTokens || 512,
                contextWindow: botData.contextWindow || 10,
                allowImages: botData.allowImages !== false,
                allowTTS: botData.allowTTS !== false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            plugins: [],
            images: []
        };
        if (!safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, fullBotData)) {
            throw new Error('Не удалось сохранить бота в localStorage');
        }
        if (!appState.botList.includes(botId)) {
            appState.botList.push(botId);
            safeSetJSON(APP_CONFIG.BOT_FILES_KEY, appState.botList);
        }
        console.log('✅ Бот "' + botData.name + '" создан с ID: ' + botId);
        return botId;
    } catch (error) {
        console.error('❌ Ошибка создания бота:', error);
        showError('Не удалось создать бота: ' + error.message);
        return null;
    }
}

function getRandomColor() {
    var colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ========================================
// РЕДАКТОР БОТА
// ========================================

function loadEditorData() {
    if (!appState.currentBot) return;
    var nameEl = document.getElementById('edit_name');
    if (nameEl) nameEl.textContent = appState.currentBot.name || '—';
    var ageEl = document.getElementById('edit_age');
    if (ageEl) ageEl.textContent = appState.currentBot.age ? appState.currentBot.age + ' лет' : '—';
    var genreEl = document.getElementById('edit_genre');
    if (genreEl) genreEl.textContent = appState.currentBot.genre || '—';
    var descInput = document.getElementById('edit_desc');
    if (descInput) {
        descInput.value = appState.currentBot.description || '';
        var counter = document.getElementById('desc_counter');
        if (counter) {
            counter.textContent = descInput.value.length + '/500';
        }
    }
    var promptBase = document.getElementById('edit_prompt_base');
    var promptDialog = document.getElementById('edit_prompt_dialog');
    if (promptBase && appState.currentBot.prompts && appState.currentBot.prompts.system) {
        promptBase.value = appState.currentBot.prompts.system;
    }
    if (promptDialog && appState.currentBot.prompts && appState.currentBot.prompts.dialog) {
        promptDialog.value = appState.currentBot.prompts.dialog;
    }
    if (appState.currentBot.avatarImage) {
        var preview = document.getElementById('editor_avatar_preview');
        if (preview) {
            preview.innerHTML = '<img src="' + appState.currentBot.avatarImage + '" alt="Аватар">';
        }
    }
    if (appState.currentBot.backgroundImage) {
        var bgPreview = document.getElementById('bot_background_preview');
        if (bgPreview) {
            bgPreview.style.backgroundImage = 'url(' + appState.currentBot.backgroundImage + ')';
        }
    }
    renderBotImages();
    console.log('✅ Данные бота "' + appState.currentBot.name + '" загружены в редактор');
}

function renderBotImages() {
    var container = document.getElementById('images_container');
    if (!container) return;
    container.innerHTML = '';
    if (!appState.currentBot || !appState.currentBot.images || appState.currentBot.images.length === 0) {
        container.innerHTML =
            '<div class="empty-state" style="padding: 30px;">' +
            '<i class="fas fa-images empty-icon" aria-hidden="true"></i>' +
            '<p>У бота нет изображений</p>' +
            '<button class="neo-button outline tiny" id="add-image-btn">' +
            '<i class="fas fa-plus" aria-hidden="true"></i> Добавить изображение' +
            '</button>' +
            '</div>';
        return;
    }
    for (var i = 0; i < appState.currentBot.images.length; i++) {
        var img = appState.currentBot.images[i];
        var imgItem = document.createElement('div');
        imgItem.className = 'img-item';
        imgItem.innerHTML =
            '<img src="' + img.dataUrl + '" alt="Изображение ' + (i + 1) + '" class="img-preview" />' +
            '<span>' + (img.tags && img.tags.length > 0 ? img.tags.join(', ') : 'без тегов') + '</span>' +
            '<button class="img-delete" data-index="' + i + '" aria-label="Удалить изображение">' +
            '<i class="fas fa-times" aria-hidden="true"></i>' +
            '</button>';
        container.appendChild(imgItem);
    }
    container.querySelectorAll('.img-delete').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var index = parseInt(btn.dataset.index);
            if (confirm('Удалить это изображение?')) {
                appState.currentBot.images.splice(index, 1);
                renderBotImages();
                showNotification('info', 'Изображение удалено', 2000);
            }
        });
    });
}

function saveEditor() {
    if (!appState.currentBot) {
        showError('Нет активного бота для сохранения');
        return;
    }
    var descInput = document.getElementById('edit_desc');
    if (descInput) {
        appState.currentBot.description = descInput.value || '';
    }
    var promptBase = document.getElementById('edit_prompt_base');
    var promptDialog = document.getElementById('edit_prompt_dialog');
    if (promptBase && promptDialog) {
        appState.currentBot.prompts = {
            system: promptBase.value || '',
            dialog: promptDialog.value || ''
        };
    }
    var tempInput = document.getElementById('ai_temperature');
    var maxTokensInput = document.getElementById('max_response_length');
    if (tempInput && maxTokensInput) {
        var temperature = parseFloat(tempInput.value) || 0.7;
        var maxTokens = parseInt(maxTokensInput.value) || 512;
        appState.currentBot.settings = Object.assign({}, appState.currentBot.settings, {
            temperature: temperature,
            maxTokens: maxTokens
        });
    }
    appState.currentBot.updatedAt = new Date().toISOString();
    if (safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + appState.currentBot.id, appState.currentBot)) {
        showNotification('success', '✅ Бот "' + appState.currentBot.name + '" успешно сохранён!', 3500);
        loadBotList();
        updateMenuStats();
    } else {
        showError('Не удалось сохранить изменения бота');
    }
}

function finishEditing() {
    saveEditor();
    showScreen('chat');
    renderChat();
    showNotification('success', '💬 Переход в чат с "' + appState.currentBot.name + '"', 2500);
}

function previewBot() {
    if (!appState.currentBot) {
        showError('Сначала создайте или выберите бота');
        return;
    }
    showNotification('info', '🎭 Предпросмотр бота "' + appState.currentBot.name + '"', 3000);
}

function insertPromptVariable(varName) {
    var areas = ['edit_prompt_base', 'edit_prompt_dialog'];
    for (var i = 0; i < areas.length; i++) {
        var areaId = areas[i];
        var textarea = document.getElementById(areaId);
        if (!textarea || textarea !== document.activeElement) continue;
        var cursorPos = textarea.selectionStart;
        var before = textarea.value.substring(0, cursorPos);
        var after = textarea.value.substring(cursorPos);
        textarea.value = before + varName + after;
        textarea.selectionStart = textarea.selectionEnd = cursorPos + varName.length;
        textarea.focus();
    }
    showNotification('success', '✅ Переменная ' + varName + ' вставлена', 1500);
}

function loadDefaultPrompt() {
    var defaultPrompt =
        'Вы — ИИ-ассистент с именем {bot_name}. Ваша роль: {bot_genre}.\n' +
        'Описание персонажа: {bot_description}.\n' +
        'Ваша задача — поддерживать интересный и естественный диалог, отвечать на вопросы пользователя и помогать ему.\n' +
        'Учитывайте контекст предыдущих сообщений для поддержания непрерывности диалога.\n' +
        'Отвечайте кратко, но содержательно. Избегайте повторений.';
    var textarea = document.getElementById('edit_prompt_base');
    if (textarea) {
        textarea.value = defaultPrompt;
    }
    showNotification('success', '✅ Шаблон системного промта загружен', 2500);
}

function loadDialogPrompt() {
    var dialogPrompt =
        'Контекст диалога (последние {context_size} сообщений):\n' +
        '{chat_history}\n' +
        'Текущее сообщение пользователя:\n' +
        '{user_message}\n' +
        'Ваша задача: сгенерировать естественный и релевантный ответ от имени {bot_name}, учитывая:\n' +
        '1. Характер и личность персонажа {bot_name}\n' +
        '2. Контекст предыдущих сообщений\n' +
        '3. Текущий запрос пользователя\n' +
        'Ответ должен быть кратким, но содержательным. Максимальная длина: {max_tokens} токенов.';
    var textarea = document.getElementById('edit_prompt_dialog');
    if (textarea) {
        textarea.value = dialogPrompt;
    }
    showNotification('success', '✅ Шаблон диалогового промта загружен', 2500);
}

// ========================================
// ЧАТ С БОТОМ
// ========================================

async function generateBotResponse(userMessage) {
    try {
        appState.chatHistory.push({
            sender: 'user',
            content: userMessage,
            timestamp: Date.now()
        });
        renderChat();
        saveCurrentChat();
        if (appState.settings.showTypingIndicator) {
            showTypingIndicator(true, (appState.currentBot ? appState.currentBot.name : 'Бот') + ' думает...');
        }
        var botResponse = '';
        if (appState.apiConfig.useLocalModel && appState.apiConfig.localModelLoaded && qwenSession) {
            var inputIds = qwenTokenizer.encode(userMessage);
            var result = await qwenSession.run({ input_ids: inputIds });
            botResponse = result.logits || 'Извините, произошла ошибка при генерации ответа.';
        } else {
            await new Promise(function(resolve) {
                setTimeout(resolve, 1000 + Math.random() * 1500);
            });
            botResponse = generateMockResponse(userMessage);
        }
        appState.chatHistory.push({
            sender: 'bot',
            content: botResponse,
            timestamp: Date.now()
        });
        showTypingIndicator(false);
        renderChat();
        saveCurrentChat();
        if (appState.settings.ttsEnabled) {
            speakText(botResponse);
        }
        if (appState.settings.sendImages) {
            var image = findMatchingImage(botResponse);
            if (image) {
                console.log('🖼️ Найдено изображение по тегу:', image.tags);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка в generateBotResponse:', error);
        showError('Ошибка генерации: ' + error.message);
        appState.chatHistory.push({
            sender: 'bot',
            content: 'Извините, произошла ошибка при генерации ответа.',
            timestamp: Date.now()
        });
        showTypingIndicator(false);
        renderChat();
        saveCurrentChat();
    }
}

function copyMessage(index) {
    if (!appState.chatHistory[index]) return;
    var text = appState.chatHistory[index].content;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showNotification('success', '✅ Сообщение скопировано', 2000);
        }).catch(function(error) {
            console.error('❌ Ошибка копирования:', error);
            showError('Не удалось скопировать сообщение');
        });
    } else {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('success', '✅ Сообщение скопировано', 2000);
    }
}

function editMessage(index) {
    if (!appState.chatHistory[index] || appState.chatHistory[index].sender !== 'user') {
        showError('Можно редактировать только свои сообщения');
        return;
    }
    var newText = prompt('Редактировать сообщение:', appState.chatHistory[index].content);
    if (newText !== null && newText.trim() !== '') {
        appState.chatHistory[index].content = newText.trim();
        appState.chatHistory[index].edited = true;
        renderChat();
        saveCurrentChat();
        showNotification('success', '✅ Сообщение обновлено', 2000);
    }
}

function deleteMessage(index) {
    if (!appState.chatHistory[index]) return;
    if (confirm('Удалить сообщение?')) {
        appState.chatHistory.splice(index, 1);
        renderChat();
        saveCurrentChat();
        showNotification('info', '🗑️ Сообщение удалено', 2000);
    }
}

function sendChatMessage() {
    var input = document.getElementById('chat_input');
    if (!input || !input.value || input.value.trim().length === 0) return;
    var message = input.value.trim();
    input.value = '';
    adjustTextareaHeight(input);
    generateBotResponse(message);
}

function showTypingIndicator(show, text) {
    if (text === undefined) {
        text = 'Бот думает...';
    }
    var indicator = document.getElementById('typing_indicator');
    var typingText = document.getElementById('typing_text');
    if (!indicator) return;
    if (show) {
        indicator.classList.remove('hidden');
        appState.isTyping = true;
        if (typingText && text) {
            typingText.textContent = text;
        }
        if (appState.typingTimeout) {
            clearTimeout(appState.typingTimeout);
        }
        appState.typingTimeout = setTimeout(function() {
            if (appState.isTyping) {
                showTypingIndicator(false);
            }
        }, 30000);
    } else {
        indicator.classList.add('hidden');
        appState.isTyping = false;
        if (appState.typingTimeout) {
            clearTimeout(appState.typingTimeout);
            appState.typingTimeout = null;
        }
    }
}

function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    var newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';
}

function clearChatHistory() {
    if (!appState.currentBot || !appState.currentBot.id) return;
    if (confirm('Очистить всю историю чата?\nЭто действие нельзя отменить!')) {
        appState.chatHistory = [];
        renderChat();
        saveCurrentChat();
        showNotification('info', '🧹 История чата очищена', 2500);
    }
}

function exportChat() {
    if (!appState.currentBot || !appState.chatHistory || appState.chatHistory.length === 0) {
        showError('Нет данных для экспорта');
        return;
    }
    try {
        var exportData = {
            botName: appState.currentBot.name,
            botDescription: appState.currentBot.description,
            chatHistory: appState.chatHistory,
            exportDate: new Date().toISOString(),
            exportType: 'chat_export'
        };
        var blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'chat-' + appState.currentBot.name.replace(/\s+/g, '_') + '-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('success', '✅ Чат с "' + appState.currentBot.name + '" экспортирован', 3000);
    } catch (error) {
        console.error('❌ Ошибка экспорта чата:', error);
        showError('Не удалось экспортировать чат: ' + error.message);
    }
}

// ========================================
// РАБОТА С ИЗОБРАЖЕНИЯМИ — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ========================================

function loadImagesLibrary() {
    try {
        var images = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', []);
        if (Array.isArray(images)) {
            appState.imagesLibrary = images;
        } else {
            appState.imagesLibrary = [];
            safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', []);
        }
        console.log('✅ Загружено ' + appState.imagesLibrary.length + ' изображений');
    } catch (error) {
        console.error('❌ Ошибка загрузки библиотеки изображений:', error);
        appState.imagesLibrary = [];
        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', []);
    }
}

function findMatchingImage(text) {
    if (!appState.settings.sendImages || appState.imagesLibrary.length === 0 || !text) return null;
    var lowerText = text.toLowerCase();
    for (var i = 0; i < appState.imagesLibrary.length; i++) {
        var image = appState.imagesLibrary[i];
        if (image.tags && Array.isArray(image.tags)) {
            for (var j = 0; j < image.tags.length; j++) {
                var tag = image.tags[j];
                if (tag && lowerText.includes(tag.toLowerCase())) {
                    image.usageCount = (image.usageCount || 0) + 1;
                    safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', appState.imagesLibrary);
                    return image;
                }
            }
        }
    }
    var triggerWords = ['изображение', 'картинка', 'фото', 'рисунок', 'покажи', 'показать'];
    if (triggerWords.some(function(word) { return lowerText.includes(word); })) {
        var randomIndex = Math.floor(Math.random() * appState.imagesLibrary.length);
        var image = appState.imagesLibrary[randomIndex];
        image.usageCount = (image.usageCount || 0) + 1;
        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', appState.imagesLibrary);
        return image;
    }
    return null;
}

function addImageToLibrary(imageData) {
    try {
        if (!imageData || !imageData.dataUrl) {
            throw new Error('Отсутствуют данные изображения');
        }
        if (!imageData.dataUrl.startsWith('data:image/')) {
            throw new Error('Неверный формат изображения (ожидается data URL)');
        }
        if (imageData.dataUrl.length > APP_CONFIG.IMAGE_MAX_SIZE * 1.3) {
            throw new Error('Изображение слишком большое (макс. 5 МБ)');
        }
        var imageRecord = {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            dataUrl: imageData.dataUrl,
            tags: Array.isArray(imageData.tags) ? imageData.tags : ['без тега'],
            name: imageData.name || 'Изображение ' + new Date().toLocaleDateString(),
            description: imageData.description || '',
            createdAt: new Date().toISOString(),
            usageCount: 0,
            lastUsed: null
        };
        appState.imagesLibrary.push(imageRecord);
        if (appState.imagesLibrary.length > 100) {
            appState.imagesLibrary = appState.imagesLibrary.slice(-100);
        }
        if (safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', appState.imagesLibrary)) {
            showNotification('success', '✅ Изображение "' + imageRecord.name + '" добавлено', 2500);
            return imageRecord.id;
        } else {
            throw new Error('Не удалось сохранить изображение в хранилище');
        }
    } catch (error) {
        console.error('❌ Ошибка добавления изображения:', error);
        showError('Не удалось добавить изображение: ' + error.message);
        return null;
    }
}

function downloadImage(dataUrl, index) {
    try {
        var link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'neo-bot-image-' + index + '-' + Date.now() + '.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('success', '✅ Изображение скачано', 2000);
    } catch (error) {
        console.error('❌ Ошибка скачивания изображения:', error);
        showError('Не удалось скачать изображение');
    }
}

// ========================================
// ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ========================================

function openImageGallery(callback) {
    var modal = document.getElementById('image-gallery-modal');
    var grid = document.getElementById('image-gallery-grid');
    if (!modal || !grid) {
        showError('Галерея изображений не найдена');
        return;
    }
    appState.galleryCallback = callback || null;
    grid.innerHTML = '';
    var images = appState.imagesLibrary || [];
    if (images.length === 0) {
        grid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1; padding: 40px;">Нет изображений в библиотеке. Загрузите изображения через редактор бота.</p>';
    } else {
        for (var i = 0; i < images.length; i++) {
            var img = images[i];
            var item = document.createElement('div');
            item.className = 'image-gallery-item';
            item.innerHTML = '<img src="' + img.dataUrl + '" alt="Изображение ' + (i + 1) + '">';
            item.onclick = (function(image, idx) {
                return function() {
                    selectImageFromGallery(image, idx);
                };
            })(img, i);
            grid.appendChild(item);
        }
    }
    modal.classList.add('active');
    modal.style.display = 'flex';
    showNotification('info', '🖼️ Галерея открыта. Нажмите на изображение для выбора.', 2000);
}

function closeImageGallery() {
    var modal = document.getElementById('image-gallery-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            modal.style.display = 'none';
        }, 300);
    }
    appState.galleryCallback = null;
}

function selectImageFromGallery(image, index) {
    if (appState.galleryCallback) {
        appState.galleryCallback(image);
        closeImageGallery();
        showNotification('success', '✅ Изображение выбрано', 2000);
        return;
    }
    if (appState.currentBot) {
        if (!appState.currentBot.images) {
            appState.currentBot.images = [];
        }
        appState.currentBot.images.push(image);
        renderBotImages();
        closeImageGallery();
        showNotification('success', '✅ Изображение добавлено боту', 2000);
    }
}

// ========================================
// ЗАГРУЗКА ФОНА — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ========================================

function openBackgroundGallery() {
    openImageGallery(function(image) {
        if (appState.currentBot) {
            appState.currentBot.backgroundImage = image.dataUrl;
            var bgPreview = document.getElementById('bot_background_preview');
            if (bgPreview) {
                bgPreview.style.backgroundImage = 'url(' + image.dataUrl + ')';
            }
            showNotification('success', '✅ Фон установлен из галереи', 2000);
        }
    });
}

function handleBackgroundUpload(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            showError('Файл слишком большой (макс. 5 МБ)');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('bot_background_preview');
            if (preview) {
                preview.style.backgroundImage = 'url(' + e.target.result + ')';
            }
            if (appState.currentBot) {
                appState.currentBot.backgroundImage = e.target.result;
            }
            showNotification('success', '✅ Фон загружен', 2000);
        };
        reader.readAsDataURL(file);
    }
}

// ========================================
// TTS И ГОЛОСОВОЙ ВВОД
// ========================================

function initTTS() {
    if ('speechSynthesis' in window) {
        setTimeout(function() {
            loadTTSVoices();
        }, 500);
        window.speechSynthesis.onvoiceschanged = function() {
            loadTTSVoices();
        };
        appState.ttsVoices = window.speechSynthesis.getVoices();
        console.log('✅ TTS инициализирован, доступно голосов: ' + appState.ttsVoices.length);
    } else {
        console.warn('⚠️ TTS не поддерживается в этом браузере');
        appState.ttsVoices = [];
    }
}

function loadTTSVoices() {
    appState.ttsVoices = window.speechSynthesis.getVoices();
    console.log('Доступные голоса TTS:', appState.ttsVoices.map(function(v) {
        return v.name + ' (' + v.lang + ')';
    }));
}

function speakText(text) {
    if (!appState.settings.ttsEnabled || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    var utteranceText = text.substring(0, 500);
    var utterance = new SpeechSynthesisUtterance(utteranceText);
    var russianVoices = appState.ttsVoices.filter(function(v) {
        return v.lang && v.lang.includes('ru');
    });
    if (russianVoices.length > 0) {
        utterance.voice = russianVoices[0];
    } else if (appState.ttsVoices.length > 0) {
        utterance.voice = appState.ttsVoices[0];
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    console.log('🔊 Озвучка: "' + utteranceText.substring(0, 30) + (utteranceText.length > 30 ? '...' : '') + '"');
}

function initVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        appState.voiceInputAvailable = true;
        console.log('✅ Голосовой ввод доступен');
    } else {
        console.warn('⚠️ Голосовой ввод не поддерживается в этом браузере');
        appState.voiceInputAvailable = false;
    }
}

function startVoiceInput() {
    if (!appState.voiceInputAvailable) {
        showError('Голосовой ввод не поддерживается в вашем браузере');
        return;
    }
    if (!appState.settings.voiceInput) {
        if (confirm('Голосовой ввод отключён в настройках. Включить сейчас?')) {
            appState.settings.voiceInput = true;
            saveSettings();
        } else {
            return;
        }
    }
    try {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        var recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = function() {
            showNotification('info', '🎤 Говорите...', 0);
            var btn = document.getElementById('voice-input-btn');
            if (btn) btn.classList.add('recording');
        };
        recognition.onresult = function(event) {
            if (event.results.length === 0) return;
            var transcript = event.results[0][0].transcript.trim();
            if (transcript.length === 0) return;
            var chatInput = document.getElementById('chat_input');
            if (chatInput) {
                chatInput.value = transcript;
                adjustTextareaHeight(chatInput);
                showNotification('success', '✅ Распознано: "' + transcript.substring(0, 30) + (transcript.length > 30 ? '...' : '') + '"', 2500);
            }
        };
        recognition.onend = function() {
            var btn = document.getElementById('voice-input-btn');
            if (btn) btn.classList.remove('recording');
        };
        recognition.onerror = function(event) {
            console.error('❌ Ошибка распознавания:', event.error);
            showError('Ошибка распознавания речи: ' + event.error);
            var btn = document.getElementById('voice-input-btn');
            if (btn) btn.classList.remove('recording');
        };
        recognition.start();
    } catch (error) {
        console.error('❌ Ошибка голосового ввода:', error);
        showError('Не удалось запустить голосовой ввод: ' + error.message);
    }
}

// ========================================
// УПРАВЛЕНИЕ ПЛАГИНАМИ — ПОЛНАЯ ПЕРЕРАБОТКА
// ========================================

function loadPlugins() {
    try {
        var pluginFiles = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'plugins_list', []);
        if (!Array.isArray(pluginFiles)) {
            throw new Error('Неверный формат списка плагинов');
        }
        appState.pluginList = pluginFiles.filter(function(id) {
            return typeof id === 'string' && id.startsWith('plugin_');
        });
        renderPluginsList();
        console.log('✅ Загружено ' + appState.pluginList.length + ' плагинов');
    } catch (error) {
        console.error('❌ Ошибка загрузки списка плагинов:', error);
        appState.pluginList = [];
        renderPluginsList();
        showError('Не удалось загрузить список плагинов');
    }
}

function renderPluginsList() {
    var container = document.getElementById('plugins-list');
    if (!container) return;
    if (appState.pluginList.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
            '<i class="fas fa-puzzle-piece empty-icon" aria-hidden="true"></i>' +
            '<h3>Нет установленных плагинов</h3>' +
            '<p>Плагины расширяют функционал ваших ботов</p>' +
            '<button class="neo-button primary" id="create-plugin-btn">' +
            '<i class="fas fa-plus" aria-hidden="true"></i> Создать плагин' +
            '</button>' +
            '</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < appState.pluginList.length; i++) {
        var pluginId = appState.pluginList[i];
        var pluginData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId, null);
        if (!pluginData || !pluginData.name) continue;
        html +=
            '<div class="plugin-card glass-panel" data-plugin-id="' + pluginId + '">' +
            '<div class="plugin-header">' +
            '<h3>' + escapeHtml(pluginData.name) + '</h3>' +
            '<span class="plugin-version">v' + (pluginData.version || '1.0') + '</span>' +
            '</div>' +
            '<p class="plugin-desc">' + escapeHtml(pluginData.description || 'Без описания').substring(0, 100) + (pluginData.description && pluginData.description.length > 100 ? '...' : '') + '</p>' +
            '<div class="plugin-tags">' +
            (pluginData.tags || []).map(function(tag) {
                return '<span class="plugin-tag">' + escapeHtml(tag) + '</span>';
            }).join('') || '<span class="plugin-tag">без тегов</span>' +
            '</div>' +
            '<div class="plugin-footer">' +
            '<span><i class="fas fa-code" aria-hidden="true"></i> ' + (pluginData.functions ? pluginData.functions.length : 0) + ' функций</span>' +
            '<span><i class="fas fa-calendar" aria-hidden="true"></i> ' + (pluginData.createdAt ? new Date(pluginData.createdAt).toLocaleDateString() : 'недавно') + '</span>' +
            '<div class="plugin-actions">' +
            '<button class="neo-button ' + (appState.activePlugins.has(pluginId) ? 'primary' : 'outline') + ' tiny" data-action="toggle" data-plugin-id="' + pluginId + '">' +
            '<i class="fas ' + (appState.activePlugins.has(pluginId) ? 'fa-toggle-on' : 'fa-toggle-off') + '" aria-hidden="true"></i> ' +
            (appState.activePlugins.has(pluginId) ? 'Активен' : 'Отключён') +
            '</button>' +
            '<button class="neo-button outline tiny" data-action="edit" data-plugin-id="' + pluginId + '">' +
            '<i class="fas fa-edit" aria-hidden="true"></i> Редактировать' +
            '</button>' +
            '<button class="neo-button danger tiny" data-action="delete" data-plugin-id="' + pluginId + '">' +
            '<i class="fas fa-trash" aria-hidden="true"></i> Удалить' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('[data-action="toggle"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var pluginId = btn.dataset.pluginId;
            togglePlugin(pluginId);
        });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var pluginId = btn.dataset.pluginId;
            editPlugin(pluginId);
        });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var pluginId = btn.dataset.pluginId;
            deletePlugin(pluginId);
        });
    });
}

function togglePlugin(pluginId) {
    if (appState.activePlugins.has(pluginId)) {
        appState.activePlugins.delete(pluginId);
        showNotification('info', '🔌 Плагин отключён', 2000);
    } else {
        appState.activePlugins.add(pluginId);
        showNotification('success', '✅ Плагин активирован', 2000);
    }
    renderPluginsList();
}

function editPlugin(pluginId) {
    var pluginData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId, null);
    if (!pluginData) {
        showError('Плагин не найден');
        return;
    }
    var nameEl = document.getElementById('plugin_editor_name');
    var descEl = document.getElementById('plugin_editor_desc');
    var scriptEl = document.getElementById('plugin_script');
    if (nameEl) nameEl.textContent = pluginData.name;
    if (descEl) descEl.textContent = pluginData.description || '';
    if (scriptEl) scriptEl.value = pluginData.code || '';
    updateCodeStats();
    appState.currentPluginId = pluginId;
    showScreen('plugin_editor');
    showNotification('info', 'Редактирование плагина "' + pluginData.name + '"', 2500);
}

function deletePlugin(pluginId) {
    if (!confirm('Удалить плагин?\nЭто действие нельзя отменить!')) return;
    try {
        localStorage.removeItem(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId);
        appState.pluginList = appState.pluginList.filter(function(id) {
            return id !== pluginId;
        });
        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugins_list', appState.pluginList);
        appState.activePlugins.delete(pluginId);
        appState.botList.forEach(function(botId) {
            var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
            if (botData && Array.isArray(botData.plugins)) {
                botData.plugins = botData.plugins.filter(function(p) {
                    return p !== pluginId;
                });
                safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, botData);
            }
        });
        loadPlugins();
        updateMenuStats(); // Обновляем счётчики после удаления плагина
        showNotification('success', '✅ Плагин удалён', 2500);
    } catch (error) {
        console.error('❌ Ошибка удаления плагина:', error);
        showError('Не удалось удалить плагин: ' + error.message);
    }
}

function showCreatePluginScreen() {
    showScreen('create_plugin');
    var nameInput = document.getElementById('plugin_name');
    var descInput = document.getElementById('plugin_desc');
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    var typeRadios = document.querySelectorAll('input[name="plugin_type"]');
    for (var i = 0; i < typeRadios.length; i++) {
        if (typeRadios[i].value === 'chat_enhancement') {
            typeRadios[i].checked = true;
        }
    }
    var nameCounter = document.getElementById('plugin_name_counter');
    var descCounter = document.getElementById('plugin_desc_counter');
    if (nameCounter) nameCounter.textContent = '0/50';
    if (descCounter) descCounter.textContent = '0/200';
}

function goToPluginEditor() {
    var nameInput = document.getElementById('plugin_name');
    var descInput = document.getElementById('plugin_desc');
    var pluginName = nameInput && nameInput.value ? nameInput.value.trim() : 'Новый плагин';
    var pluginDesc = descInput && descInput.value ? descInput.value.trim() : 'Плагин без описания';
    if (pluginName.length === 0) {
        showError('Название плагина не может быть пустым');
        return;
    }
    if (pluginName.length > APP_CONFIG.MAX_PLUGIN_NAME_LENGTH) {
        showError('Название плагина не может быть длиннее ' + APP_CONFIG.MAX_PLUGIN_NAME_LENGTH + ' символов');
        return;
    }
    var nameEl = document.getElementById('plugin_editor_name');
    var descEl = document.getElementById('plugin_editor_desc');
    var scriptEl = document.getElementById('plugin_script');
    if (nameEl) nameEl.textContent = pluginName;
    if (descEl) descEl.textContent = pluginDesc;
    if (scriptEl) scriptEl.value = '';
    updateCodeStats();
    var typeRadios = document.querySelectorAll('input[name="plugin_type"]:checked');
    var selectedType = typeRadios.length > 0 ? typeRadios[0].value : 'chat_enhancement';
    appState.currentPluginMetadata = {
        name: pluginName,
        description: pluginDesc,
        type: selectedType,
        createdAt: new Date().toISOString()
    };
    showScreen('plugin_editor');
    showNotification('info', '✏️ Редактор плагина "' + pluginName + '"', 2500);
}

function updateCodeStats() {
    var codeArea = document.getElementById('plugin_script');
    if (!codeArea) return;
    var lines = codeArea.value.split('\n').filter(function(line) {
        return line.trim().length > 0;
    }).length;
    var chars = codeArea.value.length;
    var linesEl = document.getElementById('code_lines');
    var charsEl = document.getElementById('code_chars');
    if (linesEl) linesEl.textContent = lines;
    if (charsEl) charsEl.textContent = chars;
}

function loadPluginFile(inputElement) {
    if (!inputElement.files || inputElement.files.length === 0) {
        showError('Файл не выбран');
        return;
    }
    var file = inputElement.files[0];
    if (!file.name.endsWith('.json')) {
        showError('Поддерживаются только JSON файлы плагинов');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var pluginData = JSON.parse(e.target.result);
            if (!pluginData.name || !pluginData.code) {
                throw new Error('Неверный формат плагина: отсутствуют обязательные поля (name, code)');
            }
            var pluginId = 'plugin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            var fullPluginData = {
                id: pluginId,
                name: pluginData.name,
                description: pluginData.description || 'Плагин без описания',
                code: pluginData.code,
                version: pluginData.version || '1.0',
                tags: pluginData.tags || ['общий'],
                functions: pluginData.functions || extractFunctionNames(pluginData.code),
                type: pluginData.type || 'chat_enhancement',
                createdAt: pluginData.createdAt || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            if (!safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId, fullPluginData)) {
                throw new Error('Не удалось сохранить плагин в localStorage');
            }
            if (!appState.pluginList.includes(pluginId)) {
                appState.pluginList.push(pluginId);
                safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugins_list', appState.pluginList);
            }
            loadPlugins();
            updateMenuStats(); // Обновляем счётчики после загрузки плагина
            showNotification('success', '✅ Плагин "' + pluginData.name + '" успешно загружен!', 4000);
            showScreen('mods');
            console.log('✅ Плагин "' + pluginData.name + '" загружен, функции: ' + fullPluginData.functions.join(', '));
        } catch (error) {
            console.error('❌ Ошибка загрузки плагина:', error);
            showError('Не удалось загрузить плагин: ' + error.message);
        }
    };
    reader.readAsText(file);
    setTimeout(function() {
        inputElement.value = '';
    }, 100);
}

function extractFunctionNames(code) {
    if (typeof code !== 'string') return ['main'];
    var matches = [];
    var regex = /(?:^|[\s;}])(?:async\s+)?function\s+(\w+)\s*\(/g;
    var match;
    while ((match = regex.exec(code)) !== null) {
        if (!['constructor', 'toString', 'valueOf'].includes(match[1])) {
            matches.push(match[1]);
        }
    }
    var arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    while ((match = arrowRegex.exec(code)) !== null) {
        if (!matches.includes(match[1])) {
            matches.push(match[1]);
        }
    }
    return matches.length > 0 ? matches : ['main'];
}

function savePlugin() {
    if (!appState.currentPluginMetadata) {
        showError('Метаданные плагина не найдены');
        return;
    }
    var pluginName = appState.currentPluginMetadata.name;
    var pluginDesc = appState.currentPluginMetadata.description;
    var scriptEl = document.getElementById('plugin_script');
    var pluginCode = scriptEl ? scriptEl.value || '' : '';
    if (!pluginCode.trim()) {
        if (!confirm('Код плагина пустой. Сохранить как заглушку?')) {
            return;
        }
    }
    try {
        new Function(pluginCode);
    } catch (error) {
        if (!confirm('Обнаружены синтаксические ошибки в коде:\n' + error.message + '\nСохранить плагин несмотря на ошибки?')) {
            return;
        }
    }
    var pluginId = appState.currentPluginId || ('plugin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    var pluginData = {
        id: pluginId,
        name: pluginName,
        description: pluginDesc,
        code: pluginCode,
        version: appState.currentPluginMetadata.version || '1.0',
        type: appState.currentPluginMetadata.type || 'chat_enhancement',
        tags: appState.currentPluginMetadata.tags || ['общий'],
        functions: extractFunctionNames(pluginCode),
        createdAt: appState.currentPluginMetadata.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    if (!safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId, pluginData)) {
        showError('Не удалось сохранить плагин');
        return;
    }
    if (!appState.pluginList.includes(pluginId)) {
        appState.pluginList.push(pluginId);
        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugins_list', appState.pluginList);
    }
    var blob = new Blob([JSON.stringify(pluginData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = pluginName.replace(/\s+/g, '_').toLowerCase() + '_v' + pluginData.version + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appState.currentPluginId = null;
    appState.currentPluginMetadata = null;
    loadPlugins();
    updateMenuStats(); // Обновляем счётчики после сохранения плагина
    showScreen('mods');
    showNotification('success', '✅ Плагин "' + pluginName + '" сохранён и скачан!', 4500);
    console.log('💾 Плагин "' + pluginName + '" сохранён, функции: ' + pluginData.functions.join(', '));
}

function downloadCurrentPlugin() {
    if (!appState.currentPluginId) {
        showError('Нет активного плагина для скачивания');
        return;
    }
    var pluginData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + appState.currentPluginId, null);
    if (!pluginData) {
        showError('Плагин не найден');
        return;
    }
    var blob = new Blob([JSON.stringify(pluginData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = pluginData.name.replace(/\s+/g, '_').toLowerCase() + '_v' + (pluginData.version || '1.0') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('success', '✅ Плагин "' + pluginData.name + '" скачан', 3000);
}

function testPlugin() {
    showNotification('info', '🧪 Тестирование плагинов будет доступно в следующей версии', 3000);
}

function formatPluginCode() {
    showNotification('info', '🪄 Форматирование кода будет доступно в следующей версии', 2000);
}

// ========================================
// БИБЛИОТЕКА ТЕГОВ ПЛАГИНОВ
// ========================================

function loadTagLibrary() {
    var container = document.getElementById('library_content');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < appState.pluginTagLibrary.length; i++) {
        var category = appState.pluginTagLibrary[i];
        var categoryDiv = document.createElement('div');
        categoryDiv.className = 'tag-category';
        categoryDiv.innerHTML = '<h4 style="color: var(--primary); margin-bottom: 15px;"><i class="fas fa-folder"></i> ' + category.category + '</h4>';
        var tagsGrid = document.createElement('div');
        tagsGrid.className = 'tags-grid';
        for (var j = 0; j < category.tags.length; j++) {
            var tag = category.tags[j];
            var tagCard = document.createElement('div');
            tagCard.className = 'tag-item';
            tagCard.innerHTML =
                '<h4>' + escapeHtml(tag.name) + '</h4>' +
                '<p>' + escapeHtml(tag.description) + '</p>' +
                '<button class="neo-button outline tiny" onclick="copyTagCode(\'' + escapeHtml(tag.code).replace(/'/g, "\\'") + '\')">' +
                '<i class="fas fa-copy"></i> Копировать код' +
                '</button>';
            tagsGrid.appendChild(tagCard);
        }
        categoryDiv.appendChild(tagsGrid);
        container.appendChild(categoryDiv);
    }
    console.log('📚 Загружено ' + appState.pluginTagLibrary.length + ' категорий тегов');
}

function copyTagCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
            showNotification('success', '✅ Код тега скопирован в буфер обмена', 2000);
        }).catch(function(error) {
            console.error('❌ Ошибка копирования:', error);
            showError('Не удалось скопировать код');
        });
    } else {
        var textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('success', '✅ Код тега скопирован в буфер обмена', 2000);
    }
}

// ========================================
// ЭКСПОРТ/ИМПОРТ ДАННЫХ
// ========================================

function exportAllData() {
    try {
        var exportData = {
            version: APP_CONFIG.VERSION,
            exportDate: new Date().toISOString(),
            exportType: 'full_backup',
            appVersion: APP_CONFIG.VERSION,
            developer: APP_CONFIG.DEVELOPER,
            bots: {},
            chats: {},
            plugins: {},
            images: appState.imagesLibrary,
            settings: appState.settings,
            tags: appState.tagLibrary,
            statistics: {
                totalBots: appState.botList.length,
                totalPlugins: appState.pluginList.length,
                totalImages: appState.imagesLibrary.length,
                apiRequests: appState.apiStats.totalRequests,
                exportTimestamp: Date.now()
            }
        };
        appState.botList.forEach(function(botId) {
            var botData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + botId, null);
            if (botData) exportData.bots[botId] = botData;
        });
        appState.botList.forEach(function(botId) {
            var chatData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + botId, []);
            if (chatData.length > 0) exportData.chats[botId] = chatData;
        });
        appState.pluginList.forEach(function(pluginId) {
            var pluginData = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + pluginId, null);
            if (pluginData) exportData.plugins[pluginId] = pluginData;
        });
        var blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'neo-bot-studio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        appState.lastExportTime = new Date();
        showNotification('success', '✅ Резервная копия создана (' + Object.keys(exportData.bots).length + ' ботов, ' + Object.keys(exportData.plugins).length + ' плагинов)', 5000);
        console.log('✅ Полный экспорт данных завершён');
    } catch (error) {
        console.error('❌ Ошибка экспорта данных:', error);
        showError('Не удалось экспортировать данные: ' + error.message);
    }
}

function importAllData(file) {
    if (!file || !file.type || !file.type.includes('json')) {
        showError('Выберите JSON файл с резервной копией');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (!data.exportType || !['full_backup', 'chat_export'].includes(data.exportType)) {
                throw new Error('Неверный формат файла резервной копии');
            }
            var importType = data.exportType === 'full_backup' ? 'полную резервную копию' : 'чат';
            if (!confirm('Импортировать ' + importType + ' от ' + new Date(data.exportDate).toLocaleString() + '?\n⚠️ Текущие данные будут объединены (без потерь).')) {
                return;
            }
            var importedCount = 0;
            var pluginCount = 0;
            if (data.exportType === 'full_backup' && data.settings) {
                appState.settings = Object.assign({}, appState.settings, data.settings);
                saveSettings();
            }
            if (data.exportType === 'full_backup' && Array.isArray(data.images)) {
                appState.imagesLibrary = [].concat(appState.imagesLibrary, data.images).slice(-100);
                safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'images_library', appState.imagesLibrary);
            }
            if (data.exportType === 'full_backup' && Array.isArray(data.tags)) {
                var uniqueTags = [];
                var seen = new Set();
                [].concat(appState.tagLibrary, data.tags).forEach(function(tag) {
                    if (!seen.has(tag.name)) {
                        seen.add(tag.name);
                        uniqueTags.push(tag);
                    }
                });
                appState.tagLibrary = uniqueTags.slice(0, 50);
            }
            if (data.exportType === 'full_backup' && typeof data.bots === 'object') {
                for (var botId in data.bots) {
                    if (data.bots.hasOwnProperty(botId)) {
                        var botData = data.bots[botId];
                        var newBotId = appState.botList.includes(botId)
                            ? botId + '_imported_' + Date.now()
                            : botId;
                        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'bot_' + newBotId, botData);
                        if (!appState.botList.includes(newBotId)) {
                            appState.botList.push(newBotId);
                            importedCount++;
                        }
                    }
                }
                safeSetJSON(APP_CONFIG.BOT_FILES_KEY, appState.botList);
            }
            if ((data.exportType === 'full_backup' && typeof data.chats === 'object') ||
                (data.exportType === 'chat_export' && Array.isArray(data.chatHistory))) {
                var targetBotId = null;
                if (data.exportType === 'chat_export' && appState.currentBot && appState.currentBot.id) {
                    targetBotId = appState.currentBot.id;
                } else if (data.exportType === 'full_backup') {
                    for (var chatBotId in data.chats) {
                        if (data.chats.hasOwnProperty(chatBotId)) {
                            if (appState.botList.includes(chatBotId)) {
                                var existingChat = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + chatBotId, []);
                                var mergedChat = [].concat(existingChat, data.chats[chatBotId]).slice(-APP_CONFIG.CHAT_HISTORY_LIMIT);
                                safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + chatBotId, mergedChat);
                            }
                        }
                    }
                }
                if (targetBotId && data.exportType === 'chat_export') {
                    var existingChat = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + targetBotId, []);
                    var mergedChat = [].concat(existingChat, data.chatHistory).slice(-APP_CONFIG.CHAT_HISTORY_LIMIT);
                    safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'chat_' + targetBotId, mergedChat);
                    appState.chatHistory = mergedChat;
                    renderChat();
                    importedCount++;
                }
            }
            if (data.exportType === 'full_backup' && typeof data.plugins === 'object') {
                pluginCount = 0;
                for (var pluginId in data.plugins) {
                    if (data.plugins.hasOwnProperty(pluginId)) {
                        var pluginData = data.plugins[pluginId];
                        var newPluginId = appState.pluginList.includes(pluginId)
                            ? pluginId + '_imported_' + Date.now()
                            : pluginId;
                        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugin_' + newPluginId, pluginData);
                        if (!appState.pluginList.includes(newPluginId)) {
                            appState.pluginList.push(newPluginId);
                            pluginCount++;
                        }
                    }
                }
                safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'plugins_list', appState.pluginList);
                importedCount += pluginCount;
            }
            loadBotList();
            loadPlugins();
            loadImagesLibrary();
            updateMenuStats(); // Обновляем счётчики после импорта
            var message = data.exportType === 'full_backup'
                ? '✅ Импортировано: ' + importedCount + ' ботов, ' + pluginCount + ' плагинов'
                : '✅ Чат импортирован (' + (data.chatHistory ? data.chatHistory.length : 0) + ' сообщений)';
            showNotification('success', message, 5000);
            showScreen('menu');
            console.log('✅ Импорт завершён: ' + importedCount + ' элементов');
        } catch (error) {
            console.error('❌ Ошибка импорта данных:', error);
            showError('Не удалось импортировать данные: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ========================================
// АВТОСОХРАНЕНИЕ
// ========================================

function startAutoSave() {
    stopAutoSave();
    if (appState.settings.autoSave) {
        appState.autoSaveTimer = setInterval(function() {
            if (appState.currentBot && appState.currentBot.id && appState.chatHistory && appState.chatHistory.length > 0) {
                saveCurrentChat();
                console.log('[💾 Авто] Чат "' + appState.currentBot.name + '" сохранён');
            }
        }, APP_CONFIG.AUTO_SAVE_INTERVAL);
        console.log('✅ Автосохранение запущено (каждые ' + (APP_CONFIG.AUTO_SAVE_INTERVAL / 1000) + ' сек)');
    }
}

function stopAutoSave() {
    if (appState.autoSaveTimer) {
        clearInterval(appState.autoSaveTimer);
        appState.autoSaveTimer = null;
        console.log('⏹️ Автосохранение остановлено');
    }
}

// ========================================
// НАСТРОЙКИ ФУНКЦИЙ (ОБРАБОТЧИКИ UI)
// ========================================

function updateTempValue() {
    var slider = document.getElementById('ai_temperature');
    var display = document.getElementById('temp_value');
    if (!slider || !display) return;
    display.textContent = slider.value;
    appState.settings.temperature = parseFloat(slider.value);
    saveSettings();
}

function updateMaxTokens() {
    var select = document.getElementById('max_response_length');
    if (!select) return;
    appState.settings.maxTokens = parseInt(select.value);
    saveSettings();
    showNotification('success', 'Макс. длина ответа: ' + select.value + ' токенов', 2000);
}

function toggleAutoSave() {
    var checkbox = document.getElementById('auto_save');
    if (!checkbox) return;
    appState.settings.autoSave = checkbox.checked;
    saveSettings();
    if (checkbox.checked) {
        startAutoSave();
        showNotification('success', '✅ Автосохранение включено', 2500);
    } else {
        stopAutoSave();
        showNotification('info', '⏹️ Автосохранение отключено', 2500);
    }
}

function toggleSendImages() {
    var checkbox = document.getElementById('send_images');
    if (!checkbox) return;
    appState.settings.sendImages = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Отправка изображений по тегам включена' : '⏹️ Отправка изображений отключена',
        2500
    );
}

function toggleTypingIndicator() {
    var checkbox = document.getElementById('show_typing');
    if (!checkbox) return;
    appState.settings.showTypingIndicator = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Индикатор набора включён' : '⏹️ Индикатор набора отключён',
        2500
    );
}

function toggleTTS() {
    var checkbox = document.getElementById('enable_tts');
    if (!checkbox) return;
    appState.settings.ttsEnabled = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Озвучка ответов включена' : '⏹️ Озвучка ответов отключена',
        2500
    );
}

function toggleVoiceInput() {
    var checkbox = document.getElementById('voice_input');
    if (!checkbox) return;
    appState.settings.voiceInput = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Голосовой ввод включён' : '⏹️ Голосовой ввод отключён',
        2500
    );
}

function toggleSoundEffects() {
    var checkbox = document.getElementById('sound_effects');
    if (!checkbox) return;
    appState.settings.soundEffects = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Звуковые эффекты включены' : '⏹️ Звуковые эффекты отключены',
        2500
    );
}

function toggleCompactMode() {
    var checkbox = document.getElementById('compact_mode');
    if (!checkbox) return;
    appState.settings.compactMode = checkbox.checked;
    saveSettings();
    applyChatTheme();
    showNotification('success',
        checkbox.checked ? '✅ Компактный режим включён' : '⏹️ Компактный режим отключён',
        2500
    );
}

function toggleRetryOnError() {
    var checkbox = document.getElementById('retry_on_error');
    if (!checkbox) return;
    appState.settings.retryOnError = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Повтор запросов при ошибке включён' : '⏹️ Повтор запросов отключён',
        2500
    );
}

function toggleAnimations() {
    var checkbox = document.getElementById('enable_animations');
    if (!checkbox) return;
    appState.settings.enableAnimations = checkbox.checked;
    saveSettings();
    if (checkbox.checked) {
        document.documentElement.style.setProperty('--transition-fast', '0.2s ease');
        document.documentElement.style.setProperty('--transition-normal', '0.3s ease');
    } else {
        document.documentElement.style.setProperty('--transition-fast', '0.01s');
        document.documentElement.style.setProperty('--transition-normal', '0.01s');
    }
    showNotification('success',
        checkbox.checked ? '✅ Анимации включены' : '⏹️ Анимации отключены',
        2500
    );
}

function toggleAPIProxy() {
    var checkbox = document.getElementById('use_api_proxy');
    if (!checkbox) return;
    appState.settings.useAPIProxy = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ API прокси включён' : '⏹️ API прокси отключён',
        2500
    );
}

function toggleAPICache() {
    var checkbox = document.getElementById('cache_api_responses');
    if (!checkbox) return;
    appState.settings.cacheAPIResponses = checkbox.checked;
    saveSettings();
    showNotification('success',
        checkbox.checked ? '✅ Кэширование ответов API включено' : '⏹️ Кэширование отключено',
        2500
    );
}

function toggleLocalModel() {
    var checkbox = document.getElementById('use_local_model');
    if (!checkbox) return;
    if (checkbox.checked && !appState.apiConfig.localModelLoaded) {
        if (confirm('Включить локальную модель Qwen?\nМодель (~512 МБ) будет загружена один раз и работать полностью офлайн.\nВсе диалоги станут 100% приватными.\nПодтвердить загрузку?')) {
            showScreen('splash');
            updateSplashProgress(10, 'Подготовка к загрузке...');
            setTimeout(async function() {
                var success = await initializeQwenModel();
                if (success) {
                    appState.settings.useLocalModel = true;
                    appState.apiConfig.useLocalModel = true;
                    saveSettings();
                    showScreen('menu');
                    showNotification('success', '✅ Локальная модель Qwen активирована!', 4000);
                } else {
                    checkbox.checked = false;
                    appState.settings.useLocalModel = false;
                    appState.apiConfig.useLocalModel = false;
                    saveSettings();
                    showScreen('menu');
                    showNotification('warning', '⚠️ Не удалось загрузить локальную модель. Используется онлайн-API.', 4000);
                }
                updateGlobalAPIStatus();
            }, 1000);
        } else {
            checkbox.checked = false;
        }
    } else {
        appState.settings.useLocalModel = checkbox.checked;
        appState.apiConfig.useLocalModel = checkbox.checked;
        saveSettings();
        if (checkbox.checked) {
            showNotification('success', '✅ Локальная модель Qwen активирована', 3000);
        } else {
            showNotification('info', '🔄 Переключено на онлайн-режим', 3000);
            checkWorkingMirrors();
        }
        updateGlobalAPIStatus();
    }
}

function setPerformanceMode() {
    var select = document.getElementById('performance_mode');
    if (!select) return;
    appState.settings.performanceMode = select.value;
    appState.settings.contextWindow = APP_CONFIG.CONTEXT_SIZES[select.value] || 10;
    var contextSelect = document.getElementById('context_window');
    if (contextSelect) {
        contextSelect.value = appState.settings.contextWindow;
    }
    saveSettings();
    var modeLabels = {
        'performance': '⚡ Высокая производительность',
        'balanced': '⚖️ Сбалансированный',
        'quality': '✨ Максимальное качество'
    };
    showNotification('success', '✅ Режим "' + modeLabels[select.value] + '" установлен', 3000);
}

function setContextWindow() {
    var select = document.getElementById('context_window');
    if (!select) return;
    appState.settings.contextWindow = parseInt(select.value);
    saveSettings();
    showNotification('success', '✅ Контекстное окно: ' + select.value + ' сообщений', 2500);
}

function setAPITimeout() {
    var select = document.getElementById('api_timeout');
    if (!select) return;
    appState.settings.apiTimeout = parseInt(select.value);
    saveSettings();
    showNotification('success', '✅ Таймаут запроса: ' + (parseInt(select.value) / 1000) + ' сек', 2500);
}

function changeTheme(themeName) {
    if (!['dark', 'light'].includes(themeName)) {
        console.warn('⚠️ Неизвестная тема: ' + themeName);
        return;
    }
    document.documentElement.setAttribute('data-theme', themeName);
    if (document.body) {
        document.body.className = themeName + '-theme';
    }
    appState.theme = themeName;
    appState.settings.theme = themeName;
    saveSettings();
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
        if (toggles[i].type === 'checkbox') {
            toggles[i].checked = (themeName === 'dark');
        }
    }
    applyChatTheme();
    var themeLabel = themeName === 'dark' ? 'Тёмная (Neon)' : 'Светлая (Glass)';
    showNotification('success', '🎨 Тема изменена на ' + themeLabel, 2500);
    console.log('🎨 Тема изменена: ' + themeName);
}

function checkForUpdates() {
    showNotification('info', '✅ Вы используете последнюю версию Neo-Bot Studio ' + APP_CONFIG.VERSION, 3500);
    console.log('ℹ️ Текущая версия: ' + APP_CONFIG.VERSION + ', сборка от ' + APP_CONFIG.BUILD_DATE);
}

function clearAllData() {
    if (!confirm('⚠️ ВНИМАНИЕ!\nЭто действие удалит ВСЕ ваши данные:\n• Все боты и их настройки\n• Вся история чатов\n• Все плагины и изображения\n• Все настройки приложения\nДействие нельзя отменить. Продолжить?')) {
        return;
    }
    try {
        var currentTheme = appState.settings.theme || 'dark';
        localStorage.clear();
        appState.settings = {
            theme: currentTheme,
            autoSave: true,
            sendImages: true,
            showTypingIndicator: true,
            contextWindow: 10,
            apiTimeout: 15000,
            useLocalModel: false
        };
        saveSettings();
        appState.botList = [];
        appState.pluginList = [];
        appState.imagesLibrary = [];
        appState.chatHistory = [];
        appState.currentBot = null;
        loadBotList();
        loadPlugins();
        loadImagesLibrary();
        updateMenuStats(); // Обновляем счётчики после очистки
        showNotification('success', '✅ Все данные успешно удалены. Приложение сброшено до начального состояния.', 5000);
        showScreen('menu');
        console.log('🗑️ Полная очистка данных выполнена');
    } catch (error) {
        console.error('❌ Ошибка очистки данных:', error);
        showError('Не удалось полностью очистить данные: ' + error.message);
    }
}

function exitApp() {
    if (confirm('Выйти из приложения?\nВсе несохранённые данные в текущем чате будут потеряны.')) {
        if (appState.currentBot && appState.currentBot.id && appState.chatHistory && appState.chatHistory.length > 0) {
            saveCurrentChat();
        }
        stopAutoSave();
        appState.currentBot = null;
        appState.chatHistory = [];
        showScreen('privacy_screen');
        localStorage.removeItem('neo_bot_app_session');
        showNotification('info', '🚪 Выход выполнен. Все сохранённые данные остаются в браузере.', 3500);
        console.log('🚪 Пользователь вышел из приложения');
    }
}

// ========================================
// API ФУНКЦИИ И ПРОВЕРКА СОЕДИНЕНИЯ
// ========================================

async function checkWorkingMirrors() {
    var workingMirrors = [];
    for (var i = 0; i < APP_CONFIG.API_MIRRORS.length; i++) {
        try {
            var controller = new AbortController();
            var timer = setTimeout(function() { controller.abort(); }, 5000);
            var response = await fetch(APP_CONFIG.API_MIRRORS[i] + APP_CONFIG.DEFAULT_API_MODEL, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timer);
            if (response.ok || response.status === 400 || response.status === 503) {
                workingMirrors.push(i);
            }
        } catch (error) {
            console.warn('⚠️ Зеркало ' + i + ' недоступно:', error.message);
        }
    }
    appState.apiStats.workingMirrors = workingMirrors;
    safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'api_stats', appState.apiStats);
    console.log('✅ Найдено рабочих зеркал: ' + workingMirrors.length);
    return workingMirrors;
}

function useCommonAPI() {
    var options = document.querySelectorAll('.api-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }
    var commonOption = document.getElementById('common-api-option');
    if (commonOption) {
        commonOption.classList.add('active');
    }
    appState.apiConfig.useCustomKey = false;
    appState.apiConfig.apiKey = null;
    var keyDisplay = document.getElementById('api_key_display');
    if (keyDisplay) keyDisplay.value = 'Общий ключ (скрыт)';
    showNotification('success', '✅ Выбран общий API (Hugging Face)', 2500);
}

function setCustomAPI() {
    var options = document.querySelectorAll('.api-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }
    var customOption = document.getElementById('custom-api-option');
    if (customOption) {
        customOption.classList.add('active');
    }
    var apiKey = prompt('🔑 Введите ваш API-ключ Hugging Face или OpenAI:\n(Ключ будет сохранён только в вашем браузере и никогда не будет отправлен на серверы разработчика)');
    if (apiKey && apiKey.trim().length > 0) {
        appState.apiConfig.useCustomKey = true;
        appState.apiConfig.apiKey = apiKey.trim();
        var keyDisplay = document.getElementById('api_key_display');
        if (keyDisplay) keyDisplay.value = '●●●●●●●● (скрыт)';
        showNotification('success', '✅ Ваш API-ключ сохранён локально', 3500);
    } else {
        useCommonAPI();
        showNotification('info', 'ℹ️ Используется общий API', 2000);
    }
}

function testAPIConnection() {
    var testBtn = document.getElementById('test-api-btn');
    var resultSpan = document.getElementById('api_test_result');
    if (!testBtn || !resultSpan) return;
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Тестирование...';
    resultSpan.innerHTML = '';
    setTimeout(async function() {
        try {
            if (appState.settings.useLocalModel && appState.apiConfig.localModelLoaded) {
                resultSpan.innerHTML = '<span style="color: var(--success);"><i class="fas fa-check-circle"></i> Локальная модель готова</span>';
                showNotification('success', '✅ Локальная модель Qwen работает корректно', 3500);
            } else if (appState.apiStats.workingMirrors.length > 0) {
                var mirrorIndex = appState.apiStats.workingMirrors[0];
                var endpoint = APP_CONFIG.API_MIRRORS[mirrorIndex] + APP_CONFIG.DEFAULT_API_MODEL;
                var controller = new AbortController();
                var timer = setTimeout(function() { controller.abort(); }, 5000);
                var start = Date.now();
                var response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: 'test',
                        parameters: { max_new_tokens: 5 }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timer);
                var latency = Date.now() - start;
                if (response.ok || response.status === 400 || response.status === 503) {
                    resultSpan.innerHTML = '<span style="color: var(--success);"><i class="fas fa-check-circle"></i> Сервер отвечает (' + latency + 'мс)</span>';
                    showNotification('success', '✅ API подключено (' + latency + 'мс)', 3500);
                } else {
                    throw new Error('Статус ' + response.status);
                }
            } else {
                throw new Error('Нет рабочих серверов');
            }
        } catch (error) {
            resultSpan.innerHTML = '<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Ошибка: ' + error.message + '</span>';
            showNotification('warning', '⚠️ ' + (error.message || 'Серверы недоступны'), 4000);
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-plug"></i> Проверить подключение';
        }
    }, 800);
}

function updateApiStatusUI() {
    var statusElement = document.getElementById('api_stats_display');
    if (!statusElement) return;
    statusElement.innerHTML =
        '<div class="info-row">' +
        '<span>Рабочих зеркал:</span>' +
        '<span class="info-value">' + appState.apiStats.workingMirrors.length + '/' + APP_CONFIG.API_MIRRORS.length + '</span>' +
        '</div>' +
        '<div class="info-row">' +
        '<span>Запросов сегодня:</span>' +
        '<span class="info-value">' + appState.apiStats.requestsToday + '</span>' +
        '</div>' +
        '<div class="info-row">' +
        '<span>Всего запросов:</span>' +
        '<span class="info-value">' + appState.apiStats.totalRequests + '</span>' +
        '</div>';
}

function updateGlobalAPIStatus() {
    var localModelStatus = document.getElementById('local_model_status');
    var localModelInfo = document.getElementById('local_model_info');
    if (localModelStatus) {
        localModelStatus.textContent = appState.apiConfig.localModelLoaded ? 'Загружена' : 'Не загружена';
        localModelStatus.className = 'status-badge ' + (appState.apiConfig.localModelLoaded ? 'success' : 'warning');
    }
    if (localModelInfo) {
        localModelInfo.textContent = appState.apiConfig.localModelLoaded ? 'Загружена (офлайн)' : 'Не загружена';
    }
    updateApiStatusUI();
}

function logModelStatus(type, model, status) {
    console.log('🤖 Модель: ' + model + ' | Тип: ' + type + ' | Статус: ' + status);
}

function attachFile() {
    showNotification('info', '📎 Функция прикрепления файлов будет доступна в следующей версии', 3000);
}

// ========================================
// ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
// ========================================

function setupGlobalEventListeners() {
    if (appState.eventListenersInitialized) return;
    appState.eventListenersInitialized = true;
    console.log('🔧 Neo-Bot Studio: Настройка глобальных обработчиков событий...');
    document.querySelectorAll('[onclick]').forEach(function(el) {
        el.onclick = null;
        el.removeAttribute('onclick');
    });
    var buttonHandlers = {
        'create-bot-card': function() { showScreen('create_bot'); },
        'bot-list-card': function() { showScreen('bot_list'); loadBotList(); },
        'mods-card': function() { showScreen('mods'); loadPlugins(); loadTagLibrary(); },
        'settings-card': function() { showScreen('settings'); },
        'exit-app-btn': exitApp,
        'back-to-menu-from-create': backToMenu,
        'back-to-menu-create': backToMenu,
        'validate-proceed-btn': validateAndProceed,
        'preview-bot-btn': previewBot,
        'save-editor-btn': saveEditor,
        'cancel-editor-btn': function() { showScreen('bot_list'); },
        'back-to-bot-list-from-editor': function() { showScreen('bot_list'); },
        'finish-editing-btn': finishEditing,
        'common-api-option': useCommonAPI,
        'custom-api-option': setCustomAPI,
        'test-api-btn': testAPIConnection,
        'create-plugin-btn': showCreatePluginScreen,
        'load-plugin-btn': function() {
            var input = document.getElementById('plugin_file_input');
            if (input) input.click();
        },
        'go-to-plugin-editor': goToPluginEditor,
        'save-plugin-btn': savePlugin,
        'back-to-create-plugin': function() { showScreen('mods'); },
        'back-to-create-plugin-editor': function() { showScreen('create_plugin'); },
        'download-plugin-btn': downloadCurrentPlugin,
        'back-to-bot-list-from-chat': function() {
            if (appState.currentBot && appState.currentBot.id) saveCurrentChat();
            showScreen('bot_list');
        },
        'back-to-chat-from-settings': function() { showScreen('chat'); },
        'clear-chat-btn': clearChatHistory,
        'export-chat-btn': exportChat,
        'open-chat-settings-btn': function() { showScreen('chat_settings'); },
        'back-to-chat': function() { showScreen('chat'); },
        'attach-file-btn': attachFile,
        'send-chat-btn': sendChatMessage,
        'back-to-menu-from-list': backToMenu,
        'create-bot-from-list': function() { showScreen('create_bot'); },
        'create-bot-from-empty': function() { showScreen('create_bot'); },
        'back-to-menu-settings': backToMenu,
        'clear-all-data-btn': clearAllData,
        'export-all-data-btn': exportAllData,
        'check-updates-link': checkForUpdates,
        'accept-permissions-btn': acceptPermissions,
        'show-policy-btn': showFullPolicy,
        'close-policy-btn': closePolicy,
        'close-policy-final-btn': closePolicy,
        'export-data-link': exportAllData,
        'decline-qwen-btn': declineQwenModel,
        'decline-qwen-model-btn': declineQwenModel,
        'accept-qwen-model-btn': acceptQwenModel,
        'voice-input-btn': startVoiceInput,
        'enable-multi-select-btn': enableMultiSelectMode,
        'cancel-multi-select': disableMultiSelectMode,
        'multi-edit-btn': multiEditBots,
        'multi-delete-btn': multiDeleteBots,
        'multi-export-btn': multiExportBots,
        'open-gallery-btn': function() { openImageGallery(); },
        'clear-background-btn': function() {
            var preview = document.getElementById('bot_background_preview');
            if (preview) {
                preview.style.backgroundImage = 'none';
            }
            if (appState.currentBot) {
                appState.currentBot.backgroundImage = null;
            }
            showNotification('info', '🗑️ Фон удалён', 2000);
        },
        'back-to-menu-from-mods': function() { showScreen('menu'); }
    };
    for (var id in buttonHandlers) {
        if (buttonHandlers.hasOwnProperty(id)) {
            var el = document.getElementById(id);
            if (el && !el._neoHandler) {
                el.addEventListener('click', buttonHandlers[id]);
                el._neoHandler = true;
            }
        }
    }
    var checkboxHandlers = {
        'auto_save': toggleAutoSave,
        'send_images': toggleSendImages,
        'show_typing': toggleTypingIndicator,
        'enable_tts': toggleTTS,
        'voice_input': toggleVoiceInput,
        'sound_effects': toggleSoundEffects,
        'compact_mode': toggleCompactMode,
        'retry_on_error': toggleRetryOnError,
        'enable_animations': toggleAnimations,
        'use_api_proxy': toggleAPIProxy,
        'cache_api_responses': toggleAPICache,
        'use_local_model': toggleLocalModel
    };
    for (var chkId in checkboxHandlers) {
        if (checkboxHandlers.hasOwnProperty(chkId)) {
            var chkEl = document.getElementById(chkId);
            if (chkEl && !chkEl._neoHandler) {
                chkEl.addEventListener('change', checkboxHandlers[chkId]);
                chkEl._neoHandler = true;
            }
        }
    }
    var selectHandlers = {
        'theme_selector': function(e) { changeTheme(e.target.value); },
        'app_theme_selector': function(e) { changeTheme(e.target.value); },
        'performance_mode': setPerformanceMode,
        'context_window': setContextWindow,
        'api_timeout': setAPITimeout,
        'ai_temperature': updateTempValue,
        'max_response_length': updateMaxTokens,
        'chat_temperature': function(e) { appState.settings.temperature = parseFloat(e.target.value); saveSettings(); },
        'chat_max_tokens': function(e) { appState.settings.maxTokens = parseInt(e.target.value); saveSettings(); },
        'chat_context_size': function(e) { appState.settings.contextWindow = parseInt(e.target.value); saveSettings(); },
        'chat_bg_color': function(e) { appState.settings.bgColor = e.target.value; saveSettings(); applyChatTheme(); },
        'bot_text_color': function(e) { appState.settings.botTextColor = e.target.value; saveSettings(); applyChatTheme(); },
        'user_text_color': function(e) { appState.settings.userTextColor = e.target.value; saveSettings(); applyChatTheme(); },
        'font_size': function(e) { appState.settings.fontSize = e.target.value; saveSettings(); applyChatTheme(); }
    };
    for (var selId in selectHandlers) {
        if (selectHandlers.hasOwnProperty(selId)) {
            var selEl = document.getElementById(selId);
            if (selEl && !selEl._neoHandler) {
                selEl.addEventListener('change', selectHandlers[selId]);
                selEl._neoHandler = true;
            }
        }
    }
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            btn.classList.add('active');
            var targetId = 'tab-' + btn.dataset.tab;
            var targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
        });
    });
    var chatInput = document.getElementById('chat_input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        chatInput.addEventListener('input', function() {
            adjustTextareaHeight(chatInput);
        });
    }
    // ИСПРАВЛЕНЫ СЧЁТЧИКИ СИМВОЛОВ
    var counters = {
        'bot_name': 'name_counter',
        'edit_desc': 'desc_counter',
        'plugin_name': 'plugin_name_counter',
        'plugin_desc': 'plugin_desc_counter'
    };
    for (var inputId in counters) {
        if (counters.hasOwnProperty(inputId)) {
            var input = document.getElementById(inputId);
            var counter = document.getElementById(counters[inputId]);
            if (input && counter) {
                input.addEventListener('input', function() {
                    var maxLength = parseInt(this.getAttribute('maxlength')) || 500;
                    var currentLength = this.value.length;
                    counter.textContent = currentLength + '/' + maxLength;
                    if (currentLength > maxLength * 0.9) {
                        counter.style.color = currentLength > maxLength ? 'var(--danger)' : 'var(--warning)';
                    } else {
                        counter.style.color = '';
                    }
                });
            }
        }
    }
    var pluginFileInput = document.getElementById('plugin_file_input');
    if (pluginFileInput) {
        pluginFileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length) {
                loadPluginFile(e.target);
            }
        });
    }
    var imageUploadInput = document.getElementById('image_upload_input');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length) {
                Array.from(e.target.files).forEach(function(file) {
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        addImageToLibrary({
                            dataUrl: event.target.result,
                            tags: ['загружено'],
                            name: file.name
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }
    var backgroundUploadInput = document.getElementById('background_upload');
    if (backgroundUploadInput) {
        backgroundUploadInput.addEventListener('change', function(e) {
            handleBackgroundUpload(e.target);
        });
    }
    window.addEventListener('online', function() {
        appState.systemInfo.online = true;
        showNotification('success', '🌐 Интернет-соединение восстановлено', 3000);
        checkWorkingMirrors();
    });
    window.addEventListener('offline', function() {
        appState.systemInfo.online = false;
        showNotification('warning', '⚠️ Нет интернет-соединения. Доступна только локальная модель.', 4000);
    });
    window.addEventListener('beforeunload', function() {
        if (appState.currentBot && appState.currentBot.id && appState.chatHistory && appState.chatHistory.length > 0) {
            saveCurrentChat();
        }
        stopAutoSave();
    });
    var uploadAreas = document.querySelectorAll('.upload-area, .upload-box');
    uploadAreas.forEach(function(area) {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            area.classList.add('drag-over');
        });
        area.addEventListener('dragleave', function() {
            area.classList.remove('drag-over');
        });
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                importAllData(e.dataTransfer.files[0]);
            }
        });
    });
    console.log('✅ Все глобальные обработчики событий зарегистрированы');
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ========================================

function initAPIStats() {
    var storedStats = safeParseJSON(APP_CONFIG.STORAGE_PREFIX + 'api_stats', null);
    if (storedStats && typeof storedStats === 'object') {
        appState.apiStats = {
            requestsToday: storedStats.requestsToday || 0,
            lastReset: storedStats.lastReset || new Date().toDateString(),
            averageLatency: storedStats.averageLatency || 0,
            totalRequests: storedStats.totalRequests || 0,
            currentMirror: storedStats.currentMirror || 0,
            workingMirrors: Array.isArray(storedStats.workingMirrors) ? storedStats.workingMirrors : []
        };
    }
    var today = new Date().toDateString();
    if (appState.apiStats.lastReset !== today) {
        appState.apiStats.requestsToday = 0;
        appState.apiStats.lastReset = today;
        safeSetJSON(APP_CONFIG.STORAGE_PREFIX + 'api_stats', appState.apiStats);
    }
    console.log('✅ Статистика API инициализирована');
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 ' + APP_CONFIG.NAME + ' v' + APP_CONFIG.VERSION + ' запускается...');
    console.log('👨‍💻 Разработчик: ' + APP_CONFIG.DEVELOPER);
    console.log('✈️ Telegram: ' + APP_CONFIG.TELEGRAM_LINK);
    try {
        applySystemTheme();
        appState.settings = loadSettings();
        loadSettingsIntoUI();
        setupGlobalEventListeners();
        Promise.allSettled([
            loadBotList(),
            loadPlugins(),
            loadTagLibrary(),
            loadImagesLibrary()
        ]).catch(function(error) {
            console.error('⚠️ Ошибка при параллельной загрузке:', error);
        });
        initTTS();
        initVoiceInput();
        initAPIStats();
        var privacyAccepted = localStorage.getItem(APP_CONFIG.PRIVACY_ACCEPTED);
        var qwenAccepted = localStorage.getItem(APP_CONFIG.QWEN_MODEL_ACCEPTED);
        if (privacyAccepted === 'true' && (qwenAccepted === 'true' || qwenAccepted === 'false')) {
            console.log('✅ Все согласия получены, переход в меню');
            setTimeout(function() {
                showScreen('menu');
                updateMenuStats();
                showNotification('success', 'Добро пожаловать в Neo-Bot Studio v' + APP_CONFIG.VERSION + '!', 3000);
            }, 100);
        } else {
            showPrivacyScreen();
        }
        startAutoSave();
        console.log('✅ Приложение Neo-Bot Studio полностью инициализировано');
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showScreen('menu');
        showError('Ошибка запуска приложения. Попробуйте обновить страницу.');
    }
});

// ========================================
// ЗАГРУЗКА АВАТАРА И ФОНА (ГЛОБАЛЬНЫЕ ФУНКЦИИ)
// ========================================

function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            showError('Файл слишком большой (макс. 5 МБ)');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('bot_avatar_preview');
            if (preview) {
                preview.innerHTML = '<img src="' + e.target.result + '" alt="Аватар">';
                if (preview.dataset) {
                    preview.dataset.avatarData = e.target.result;
                }
            }
            showNotification('success', '✅ Аватар загружен', 2000);
        };
        reader.readAsDataURL(file);
    }
}

function handleEditorAvatarUpload(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            showError('Файл слишком большой (макс. 5 МБ)');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('editor_avatar_preview');
            if (preview) {
                preview.innerHTML = '<img src="' + e.target.result + '" alt="Аватар">';
            }
            if (appState.currentBot) {
                appState.currentBot.avatarImage = e.target.result;
            }
            showNotification('success', '✅ Аватар обновлён', 2000);
        };
        reader.readAsDataURL(file);
    }
}

// ========================================
// ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ ДЛЯ HTML
// ========================================

window.handleAvatarUpload = handleAvatarUpload;
window.handleEditorAvatarUpload = handleEditorAvatarUpload;
window.handleBackgroundUpload = handleBackgroundUpload;
window.openImageGallery = openImageGallery;
window.closeImageGallery = closeImageGallery;
window.selectImageFromGallery = selectImageFromGallery;
window.openBackgroundGallery = openBackgroundGallery;
window.copyMessage = copyMessage;
window.editMessage = editMessage;
window.deleteMessage = deleteMessage;
window.closeNotification = closeNotification;
window.closePolicy = closePolicy;
window.declineQwenModel = declineQwenModel;
window.acceptQwenModel = acceptQwenModel;
window.insertPromptVariable = insertPromptVariable;
window.loadDefaultPrompt = loadDefaultPrompt;
window.loadDialogPrompt = loadDialogPrompt;
window.formatPluginCode = formatPluginCode;
window.copyTagCode = copyTagCode;
window.testPlugin = testPlugin;

// ✅ Файл app.js v1.0.1 полностью готов!
