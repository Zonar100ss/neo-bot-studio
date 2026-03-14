/**
 * 🤖 Neo-Bot Studio — Service Worker v1.0.1
 * Оптимизирован для: офлайн-работы, приватности, кэширования модели Qwen
 * Автор: Zonar100 | Лицензия: MIT
 */

// ==================== КОНФИГУРАЦИЯ ====================
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `neo-bot-studio-${CACHE_VERSION}`;
const MODEL_CACHE_NAME = `neo-bot-model-${CACHE_VERSION}`;

// Критические статики для мгновенной загрузки
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/sw.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/icon-1024x1024.png',
  '/assets/icons/icon-maskable-512.png',
  // CSS/JS — раскомментируйте при наличии отдельных файлов
  // '/css/main.css',
  // '/js/app.js',
  // '/js/bot-manager.js',
  // '/js/plugin-system.js',
];

// Шаблоны URL для модели Qwen (адаптируйте под ваш хостинг)
const MODEL_PATTERNS = [
  /\/models\/qwen2\.5-0\.5b/,
  /\/qwen.*\.bin/,
  /\/onnx\/.*\.onnx/,
  /\/transformers\/.*\.js/,
  /cdn\.huggingface\.co/,
  /cdn\.jsdelivr\.net\/npm\/@xenova\/transformers/,
];

// API-эндпоинты, которые должны идти только в сеть
const API_ENDPOINTS = [
  '/api/',
  '/webhook/',
  'huggingface.co',
  'api.openai.com',
];

// Домены для кэширования внешних ресурсов (опционально)
const EXTERNAL_CACHE_DOMAINS = [
  'cdn.jsdelivr.net',
  'cdn.huggingface.co',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ==================== УТИЛИТЫ ====================

/**
 * Логирование с префиксом и уровнем
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[NeoBot-SW:${level}]`;
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
}

/**
 * Проверка, является ли запрос навигацией (для SPA)
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' && request.method === 'GET';
}

/**
 * Проверка, относится ли запрос к модели ИИ
 */
function isModelRequest(url) {
  return MODEL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Проверка, является ли запрос к внешнему API
 */
function isApiRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Проверка, можно ли кэшировать внешний ресурс
 */
function isCacheableExternal(url) {
  return EXTERNAL_CACHE_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Безопасное извлечение с таймаутом
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      log('warn', `Таймаут запроса: ${url}`);
      throw new Error(`Request timeout: ${url}`);
    }
    throw error;
  }
}

// ==================== INSTALL ====================

self.addEventListener('install', (event) => {
  log('info', '🔧 Установка Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // 1. Кэширование ядра приложения
        const coreCache = await caches.open(CACHE_NAME);
        await coreCache.addAll(CORE_ASSETS);
        log('info', '✅ Ядро приложения закэшировано', `Файлов: ${CORE_ASSETS.length}`);
        
        // 2. Предварительное кэширование пустого хранилища для модели
        await caches.open(MODEL_CACHE_NAME);
        log('info', '✅ Хранилище модели инициализировано');
        
        // 3. Пропуск ожидания — активация сразу
        await self.skipWaiting();
        log('info', '🚀 Service Worker готов к активации');
        
      } catch (error) {
        log('error', '❌ Ошибка при установке:', error);
        // Не блокируем установку при ошибке кэширования
      }
    })()
  );
});

// ==================== ACTIVATE ====================

self.addEventListener('activate', (event) => {
  log('info', '⚡ Активация Service Worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // 1. Очистка старых кэшей
        const cacheNames = await caches.keys();
        const currentCaches = [CACHE_NAME, MODEL_CACHE_NAME];
        
        const deleted = await Promise.all(
          cacheNames
            .filter(name => !currentCaches.includes(name))
            .map(name => {
              log('info', '🗑️ Удаление устаревшего кэша:', name);
              return caches.delete(name);
            })
        );
        
        log('info', '✅ Очистка завершена', `Удалено кэшей: ${deleted.filter(Boolean).length}`);
        
        // 2. Claim clients — мгновенный контроль над страницами
        await self.clients.claim();
        log('info', '🎯 Все клиенты переданы под контроль SW');
        
        // 3. Уведомление клиентов об обновлении
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
        });
        
      } catch (error) {
        log('error', '❌ Ошибка при активации:', error);
      }
    })()
  );
});

// ==================== FETCH ====================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Игнорируем не-GET запросы для кэширования (но пропускаем для сети)
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }
  
  // ==================== СТРАТЕГИИ ПО ТИПАМ ЗАПРОСОВ ====================
  
  // 1. 🔐 API-запросы — только сеть, без кэша (приватность + актуальность)
  if (isApiRequest(url.href)) {
    event.respondWith(
      fetch(request).catch(error => {
        log('warn', '❌ API запрос не удался:', url.href);
        return new Response(
          JSON.stringify({ error: 'Offline: API недоступен' }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // 2. 🤖 Запросы модели ИИ — Cache First с обновлением в фоне
  if (isModelRequest(url.href)) {
    event.respondWith(handleModelRequest(request));
    return;
  }
  
  // 3. 🌐 Внешние ресурсы (CDN) — Stale-While-Revalidate
  if (isCacheableExternal(url.href)) {
    event.respondWith(handleExternalResource(request));
    return;
  }
  
  // 4. 🧭 Навигация (SPA) — Network First с офлайн-фоллбэком
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // 5. 📦 Остальные статики — Cache First
  event.respondWith(handleStaticResource(request));
});

// ==================== ОБРАБОТЧИКИ СТРАТЕГИЙ ====================

/**
 * 🤖 Обработка запросов модели: Cache First + Background Update
 */
async function handleModelRequest(request) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  
  // 1. Пробуем вернуть из кэша
  const cached = await cache.match(request);
  if (cached) {
    log('info', '📦 Модель из кэша:', new URL(request.url).pathname);
    
    // 2. Параллельно обновляем кэш в фоне
    event.waitUntil(
      fetchWithTimeout(request.url, { cache: 'no-store' })
        .then(async (response) => {
          if (response.ok) {
            await cache.put(request, response.clone());
            log('info', '🔄 Модель обновлена в кэше');
            
            // Уведомляем о завершении загрузки
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'MODEL_UPDATED',
                url: request.url
              });
            });
          }
        })
        .catch(err => log('warn', '⚠️ Не удалось обновить модель:', err.message))
    );
    
    return cached;
  }
  
  // 3. Если нет в кэше — загружаем из сети
  try {
    log('info', '🌐 Загрузка модели:', new URL(request.url).pathname);
    
    const response = await fetchWithTimeout(request.url, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    }, 120000); // 2 минуты таймаут для больших файлов
    
    if (response.ok) {
      // Клонируем ответ: один для возврата, один для кэша
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      log('info', '✅ Модель закэширована');
    }
    
    return response;
    
  } catch (error) {
    log('error', '❌ Ошибка загрузки модели:', error.message);
    
    // Фоллбэк: если модель критична, возвращаем ошибку с инструкцией
    return new Response(
      JSON.stringify({ 
        error: 'Model offline', 
        message: 'Модель Qwen не найдена в кэше. Проверьте подключение.' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * 🌐 Обработка внешних ресурсов: Stale-While-Revalidate
 */
async function handleExternalResource(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // 1. Пробуем кэш
  const cached = await cache.match(request);
  
  // 2. Параллельно обновляем
  const networkPromise = fetchWithTimeout(request.url, {}, 15000)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        log('info', '🔄 CDN обновлён:', new URL(request.url).hostname);
      }
      return response;
    })
    .catch(err => {
      log('warn', '⚠️ CDN недоступен:', err.message);
      return cached; // Возвращаем кэш при ошибке сети
    });
  
  // 3. Возвращаем кэш сразу, сеть — в фоне
  return cached || networkPromise;
}

/**
 * 🧭 Обработка навигации: Network First для SPA
 */
async function handleNavigationRequest(request) {
  // 1. Пробуем сеть (для актуального контента)
  try {
    const response = await fetchWithTimeout(request.url, { 
      cache: 'no-store',
      headers: { 'Accept': 'text/html' }
    }, 10000);
    
    // Проверяем, что это действительно HTML
    if (response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
      // Кэшируем для офлайн-доступа
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }
    
    return response;
    
  } catch (error) {
    log('warn', '⚠️ Навигация офлайн, используем кэш');
    
    // 2. Фоллбэк на кэш
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // 3. Финальный фоллбэк на offline.html
    const offline = await cache.match('/offline.html');
    if (offline) return offline;
    
    // 4. Если ничего не помогло — базовая заглушка
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Neo-Bot Offline</title>
      <style>body{font-family:system-ui;background:#0f0f13;color:#fff;display:flex;
      align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
      .card{padding:30px;background:#1a1a25;border-radius:16px;border:1px solid #7c3aed33}
      </style></head><body><div class="card"><h1>📴 Офлайн</h1>
      <p>Neo-Bot Studio работает локально. Проверьте загрузку модели Qwen.</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * 📦 Обработка статики: Cache First
 */
async function handleStaticResource(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // 1. Пробуем кэш
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  
  // 2. Загружаем из сети и кэшируем
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Не кэшируем большие файлы (>50MB) без явного паттерна модели
      const contentLength = response.headers.get('Content-Length');
      if (!contentLength || parseInt(contentLength) < 50 * 1024 * 1024) {
        await cache.put(request, response.clone());
        log('info', '💾 Статика закэширована:', new URL(request.url).pathname);
      }
    }
    return response;
  } catch (error) {
    log('warn', '❌ Статика недоступна:', error.message);
    
    // Для изображений/шрифтов — прозрачный плейсхолдер
    if (request.destination === 'image') {
      return new Response('', { 
        status: 404, 
        headers: { 'Content-Type': 'image/png' } 
      });
    }
    
    throw error;
  }
}

// ==================== BACKGROUND SYNC ====================

self.addEventListener('sync', (event) => {
  log('info', '🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-bot-data') {
    event.waitUntil(syncBotData());
  } else if (event.tag === 'sync-plugin-updates') {
    event.waitUntil(syncPluginUpdates());
  }
});

/**
 * Синхронизация данных ботов (при появлении сети)
 */
async function syncBotData() {
  try {
    // Получаем всех клиентов для отправки статуса
    const clients = await self.clients.matchAll();
    
    // Здесь можно добавить логику экспорта/импорта при появлении сети
    // Например: отправка зашифрованного бэкапа на доверенное хранилище
    // Но по умолчанию — ничего не делаем (приватность)
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        status: 'success',
        message: 'Данные синхронизированы (локально)'
      });
    });
    
    log('info', '✅ Sync bots completed (local-only)');
  } catch (error) {
    log('error', '❌ Sync error:', error);
  }
}

/**
 * Проверка обновлений плагинов
 */
async function syncPluginUpdates() {
  try {
    // Запрос версии плагинов с вашего репозитория (опционально)
    // const response = await fetch('https://api.github.com/repos/Zonar100ss/neo-bot-studio/releases/latest');
    // const release = await response.json();
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PLUGIN_UPDATE_CHECK',
        // available: release.tag_name !== CACHE_VERSION,
        // releaseNotes: release.body
      });
    });
    
    log('info', '✅ Plugin update check completed');
  } catch (error) {
    log('warn', '⚠️ Plugin update check failed:', error.message);
  }
}

// ==================== PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Neo-Bot Studio', {
        body: data.body || '',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-96x96.png',
        tag: data.tag || 'neo-bot-notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: {
          url: data.url || '/',
          timestamp: Date.now()
        }
      })
    );
    
    log('info', '🔔 Push notification:', data.title);
  } catch (error) {
    log('error', '❌ Push error:', error);
  }
});

// ==================== NOTIFICATION CLICK ====================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    (async () => {
      const url = event.notification.data?.url || '/';
      
      // Фокус на существующем окне или открытие нового
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const targetClient = clients.find(c => c.url.includes(url.split('/')[2] || ''));
      
      if (targetClient && 'focus' in targetClient) {
        await targetClient.focus();
        targetClient.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
      } else {
        await self.clients.openWindow(url);
      }
    })()
  );
  
  log('info', '🖱️ Notification clicked:', event.notification.title);
});

// ==================== MESSAGE HANDLING ====================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  log('info', '💬 Message from client:', type);
  
  switch (type) {
    case 'SKIP_WAITING':
      // Принудительная активация новой версии
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      // Динамическое кэширование по запросу приложения
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          (async () => {
            const cache = await caches.open(CACHE_NAME);
            for (const url of payload.urls) {
              try {
                const response = await fetch(url);
                if (response.ok) await cache.put(url, response.clone());
              } catch (e) {
                log('warn', `Не удалось закэшировать: ${url}`);
              }
            }
            event.ports[0]?.postMessage({ status: 'complete' });
          })()
        );
      }
      break;
      
    case 'CLEAR_MODEL_CACHE':
      // Очистка кэша модели по запросу пользователя
      event.waitUntil(
        caches.delete(MODEL_CACHE_NAME).then(() => {
          caches.open(MODEL_CACHE_NAME); // Пересоздаём пустой
          event.ports[0]?.postMessage({ status: 'cleared' });
          log('info', '🗑️ Model cache cleared by user');
        })
      );
      break;
      
    case 'GET_CACHE_STATUS':
      // Запрос статуса кэша для UI
      event.waitUntil(
        (async () => {
          const [coreCache, modelCache] = await Promise.all([
            caches.open(CACHE_NAME),
            caches.open(MODEL_CACHE_NAME)
          ]);
          
          const [coreKeys, modelKeys] = await Promise.all([
            coreCache.keys(),
            modelCache.keys()
          ]);
          
          event.ports[0]?.postMessage({
            core: { count: coreKeys.length, size: 'unknown' },
            model: { count: modelKeys.length, size: 'unknown' },
            version: CACHE_VERSION
          });
        })()
      );
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      // Регистрация background sync из приложения
      if ('sync' in self.registration) {
        event.waitUntil(
          self.registration.sync.register(payload?.tag || 'sync-bot-data')
            .then(() => {
              event.ports[0]?.postMessage({ status: 'registered' });
            })
            .catch(err => {
              log('warn', 'Sync registration failed:', err.message);
              event.ports[0]?.postMessage({ status: 'failed', error: err.message });
            })
        );
      } else {
        event.ports[0]?.postMessage({ status: 'unsupported' });
      }
      break;
      
    default:
      log('warn', '⚠️ Unknown message type:', type);
  }
});

// ==================== ERROR HANDLING ====================

self.addEventListener('error', (event) => {
  log('error', '💥 Global SW error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

self.addEventListener('unhandledrejection', (event) => {
  log('error', '🔻 Unhandled promise rejection:', event.reason);
});

// ==================== PERIODIC BACKGROUND SYNC (Experimental) ====================

if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-app-updates') {
      event.waitUntil(checkAppUpdates());
    }
  });
}

/**
 * Периодическая проверка обновлений приложения
 */
async function checkAppUpdates() {
  try {
    // Запрос manifest.json для проверки версии
    const response = await fetch('/manifest.json', { cache: 'no-cache' });
    const manifest = await response.json();
    
    // Сравнение версий (если добавите version поле в manifest)
    // if (manifest.version !== CACHE_VERSION) { ... }
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        // version: manifest.version,
        // changelog: manifest.changelog
      });
    });
    
    log('info', '🔄 Periodic update check completed');
  } catch (error) {
    log('warn', '⚠️ Periodic update check failed:', error.message);
  }
}

// ==================== INITIALIZATION LOG ====================

log('info', '🎬 Neo-Bot Studio Service Worker loaded', {
  version: CACHE_VERSION,
  caches: [CACHE_NAME, MODEL_CACHE_NAME],
  features: {
    backgroundSync: 'sync' in self.registration,
    periodicSync: 'periodicSync' in self.registration,
    push: 'PushManager' in self,
    notifications: 'Notification' in self
  }
});
