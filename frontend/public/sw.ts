/**
 * Service Worker para Lojinha do Zé
 * Implementa cache de assets e modo offline básico
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'lojinha-do-ze-v1';
const STATIC_CACHE = 'lojinha-static-v1';
const DYNAMIC_CACHE = 'lojinha-dynamic-v1';

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
];

// URLs da API que devem ser cacheadas
// const API_CACHE_PATTERNS = [
//   /\/api\/catalog/,
//   /\/api\/products/,
// ];

// URLs que sempre devem buscar da rede
// const NETWORK_FIRST_PATTERNS = [
//   /\/api\/auth/,
//   /\/api\/orders/,
//   /\/api\/payments/,
//   /\/api\/admin/,
// ];

/**
 * Evento de instalação do Service Worker
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

/**
 * Evento de ativação do Service Worker
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve(false);
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Evento de fetch - intercepta todas as requisições
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para outros domínios
  if (url.origin !== location.origin) {
    return;
  }
  
  // Estratégia baseada no tipo de requisição
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Verifica se é um asset estático
 */
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.startsWith('/_next/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2');
}

/**
 * Verifica se é uma requisição da API
 */
function isApiRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

/**
 * Estratégia Cache First
 * Tenta servir do cache primeiro, se não encontrar busca na rede
 */
async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    const offlineResponse = await caches.match('/offline');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

/**
 * Estratégia Network First
 * Tenta buscar da rede primeiro, se falhar usa o cache
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retorna resposta offline para requisições da API
    if (isApiRequest(request)) {
      return new Response(
        JSON.stringify({
          error: 'Sem conexão com a internet',
          offline: true,
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    const offlineResponse = await caches.match('/offline');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

/**
 * Estratégia Stale While Revalidate
 * Serve do cache enquanto atualiza em background
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Se a rede falhar, retorna o cache se disponível
      return cachedResponse as Response;
    });
  
  // Retorna imediatamente do cache se disponível, senão espera a rede
  return (cachedResponse || fetchPromise) as Promise<Response>;
}

/**
 * Evento de sync para background sync
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Executa sincronização em background
 */
async function doBackgroundSync() {
  try {
    // Implementar lógica de sincronização se necessário
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Evento de push para notificações
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');
  
  const options: NotificationOptions = {
    body: event.data ? event.data.text() : 'Nova notificação da Lojinha do Zé',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icon-explore.png',
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-close.png',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification('Lojinha do Zé', options)
  );
});

/**
 * Evento de clique na notificação
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

/**
 * Evento de mensagem do cliente
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: CACHE_NAME });
    }
  }
});

console.log('[SW] Service Worker loaded');
