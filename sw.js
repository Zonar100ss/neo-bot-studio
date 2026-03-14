// ==================== КОНФИГУРАЦИЯ ====================
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `neo-bot-studio-${CACHE_VERSION}`;
const MODEL_CACHE_NAME = `neo-bot-model-${CACHE_VERSION}`;

// Ядро приложения — кэшируется при установке
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/sw.js',
  
  // Скрипты
  '/scripts/core/app.js',
  '/scripts/core/security.js',
  '/scripts/modules/bot-manager.js',
  '/scripts/modules/chat-engine.js',
  '/scripts/modules/plugin-loader.js',
  '/scripts/modules/local-ai.js',
  '/scripts/modules/storage.js',
  '/scripts/modules/ui-controller.js',
  
  // Стили
  '/styles/neo-core.css',
  '/styles/neo-components.css',
  '/styles/neo-animations.css',
  '/styles/themes/dark-neon.css',
  '/styles/themes/light-glass.css',
  
  // Иконки (критические)
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/icon-1024x1024.png',
  '/assets/icons/icon-maskable-512.png',
  '/assets/icons/shortcut-create-bot.png',
  '/assets/icons/shortcut-bots.png',
  '/assets/icons/shortcut-plugins.png',
  '/assets/icons/shortcut-settings.png',
];

// Паттерны для модели Qwen / внешних AI-ресурсов
const MODEL_PATTERNS = [
  /\/models\/qwen/i,
  /\/qwen.*\.bin/i,
  /\/onnx\/.*\.onnx/i,
  /\/transformers\/.*\.js/i,
  /cdn\.huggingface\.co/i,
  /cdn\.jsdelivr\.net\/npm\/@xenova\/transformers/i,
];

// API, которые НЕ кэшируем (приватность)
const API_BYPASS = [
  '/api/',
  '/webhook/',
  'huggingface.co',
  'api.openai.com',
  'api-inference.huggingface.co',
];

// Внешние домены, которые можно кэшировать
const CACHEABLE_EXTERNAL = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ==================== УТИЛИТЫ ====================

const log = (level, msg, data = null) => {
  const ts = new Date().toISOString();
  const prefix = `[NeoBot-SW:${level.toUpperCase()}]`;
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
    prefix, ts, msg, data || ''
  );
};

const isNavigation = req => req.mode === 'navigate' && req.method === 'GET';
const isModel = url => MODEL_PATTERNS.some(p => p.test(url));
const isApi = url => API_BYPASS.some(p => url.includes(p));
const isExternalCacheable = url => CACHEABLE_EXTERNAL.some(d => url.includes(d));

const fetchTimeout = (url, opts = {}, ms = 30000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then(r => (clearTimeout(id), r))
    .catch(e => {
      clearTimeout(id);
      if (e.name === 'AbortError') throw new Error(`Timeout: ${url}`);
      throw e;
    });
};

// ==================== INSTALL ====================

self.addEventListener('install', event => {
  log('info', '🔧 Installing SW', CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS).catch(err => 
        log('warn', '⚠️ Не все файлы закэшированы', err.message)
      );
      await caches.open(MODEL_CACHE_NAME);
      await self.skipWaiting();
      log('info', '✅ Installation complete');
    })()
  );
});

// ==================== ACTIVATE ====================

self.addEventListener('activate', event => {
  log('info', '⚡ Activating SW');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => ![CACHE_NAME, MODEL_CACHE_NAME].includes(k))
            .map(k => caches.delete(k))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION }));
      log('info', '✅ Activation complete');
    })()
  );
});

// ==================== FETCH ====================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;
  
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }
  
  // 🔐 API — только сеть
  if (isApi(url)) {
    event.respondWith(
      fetch(request).catch(() => 
        new Response(JSON.stringify({ error: 'Offline' }), { 
          status: 503, headers: { 'Content-Type': 'application/json' } 
        })
      )
    );
    return;
  }
  
  // 🤖 Модель — Cache First + Background Update
  if (isModel(url)) {
    event.respondWith(handleModel(request));
    return;
  }
  
  // 🌐 Внешние ресурсы — Stale-While-Revalidate
  if (isExternalCacheable(url)) {
    event.respondWith(handleExternal(request));
    return;
  }
  
  // 🧭 Навигация (SPA) — Network First
  if (isNavigation(request)) {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // 📦 Статика — Cache First
  event.respondWith(handleStatic(request));
});

// ==================== СТРАТЕГИИ ====================

async function handleModel(request) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    event.waitUntil(
      fetchTimeout(request.url, { cache: 'no-store' }, 120000)
        .then(async res => {
          if (res.ok) {
            await cache.put(request, res.clone());
            notifyClients({ type: 'MODEL_UPDATED', url: request.url });
          }
        })
        .catch(e => log('warn', '⚠️ Model update failed', e.message))
    );
    return cached;
  }
  
  try {
    const res = await fetchTimeout(request.url, { cache: 'no-store' }, 120000);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch (e) {
    log('error', '❌ Model fetch failed', e.message);
    return new Response(JSON.stringify({ error: 'Model offline' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleExternal(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const network = fetchTimeout(request.url, {}, 15000)
    .then(async res => {
      if (res.ok) await cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  
  return cached || network;
}

async function handleNavigation(request) {
  try {
    const res = await fetchTimeout(request.url, { 
      cache: 'no-store', headers: { 'Accept': 'text/html' } 
    }, 10000);
    
    if (res.ok && res.headers.get('Content-Type')?.includes('text/html')) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request) || 
           await cache.match('/offline.html') ||
           new Response(offlineHTML(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const res = await fetch(request);
    if (res.ok) {
      const len = res.headers.get('Content-Length');
      if (!len || parseInt(len) < 50 * 1024 * 1024) {
        await cache.put(request, res.clone());
      }
    }
    return res;
  } catch (e) {
    log('warn', '❌ Static fetch failed', e.message);
    if (request.destination === 'image') {
      return new Response('', { status: 404, headers: { 'Content-Type': 'image/png' } });
    }
    throw e;
  }
}

// ==================== BACKGROUND SYNC ====================

self.addEventListener('sync', event => {
  if (event.tag === 'sync-bot-data') {
    event.waitUntil(syncBotData());
  }
});

async function syncBotData() {
  // Локальная синхронизация — приватность прежде всего
  notifyClients({ type: 'SYNC_COMPLETE', status: 'local-only' });
}

// ==================== PUSH & NOTIFICATIONS ====================

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Neo-Bot Studio', {
      body: data.body || '',
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      tag: data.tag || 'neo-bot',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = event.notification.data?.url || '/';
      const clients = await self.clients.matchAll({ type: 'window' });
      const target = clients.find(c => c.url.includes(url));
      if (target?.focus) {
        await target.focus();
      } else {
        await self.clients.openWindow(url);
      }
    })()
  );
});

// ==================== MESSAGE HANDLING ====================

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          (async () => {
            const cache = await caches.open(CACHE_NAME);
            for (const url of payload.urls) {
              try {
                const res = await fetch(url);
                if (res.ok) await cache.put(url, res.clone());
              } catch {}
            }
            event.ports[0]?.postMessage({ status: 'done' });
          })()
        );
      }
      break;
      
    case 'CLEAR_MODEL_CACHE':
      event.waitUntil(
        caches.delete(MODEL_CACHE_NAME).then(() => {
          caches.open(MODEL_CACHE_NAME);
          event.ports[0]?.postMessage({ status: 'cleared' });
        })
      );
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(
        (async () => {
          const [core, model] = await Promise.all([
            caches.open(CACHE_NAME), caches.open(MODEL_CACHE_NAME)
          ]);
          const [ck, mk] = await Promise.all([core.keys(), model.keys()]);
          event.ports[0]?.postMessage({
            core: ck.length, model: mk.length, version: CACHE_VERSION
          });
        })()
      );
      break;
  }
});

// ==================== УТИЛИТЫ ====================

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage(message));
}

function offlineHTML() {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Neo-Bot Studio — Офлайн</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0f0f13;color:#fff;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;text-align:center;padding:20px}
    .card{max-width:400px;padding:30px;background:#1a1a25;border-radius:16px;
    border:1px solid #7c3aed33}
    .icon{font-size:48px;margin-bottom:16px}
    h1{margin:0 0 12px;font-size:20px}
    p{margin:0 0 20px;color:#aaa}
    button{background:#7c3aed;color:#fff;border:none;padding:12px 24px;
    border-radius:8px;font-size:14px;cursor:pointer}
    button:hover{background:#6d28d9}
  </style></head><body>
  <div class="card">
    <div class="icon">📴</div>
    <h1>Нет соединения</h1>
    <p>Neo-Bot Studio работает офлайн. Убедитесь, что модель Qwen уже загружена.</p>
    <button onclick="location.reload()">🔄 Попробовать снова</button>
  </div>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        navigator.serviceWorker.controller?.postMessage({ type: 'OFFLINE_PAGE_LOADED' });
      });
    }
  </script>
  </body></html>`;
}

// ==================== INIT LOG ====================

log('info', '🎬 Neo-Bot Studio SW loaded', {
  version: CACHE_VERSION,
  caches: [CACHE_NAME, MODEL_CACHE_NAME],
  features: {
    backgroundSync: 'sync' in self.registration,
    push: 'PushManager' in self,
    notifications: 'Notification' in self
  }
});
