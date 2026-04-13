/**
 * Service Worker para Lojinha do Zé
 * Implementa cache de assets e modo offline básico
 */

/// <reference lib="webworker" />

export {};

// SEC-REF: Explicitly cast self to ServiceWorkerGlobalScope for TS safety
const sw = (self as unknown) as ServiceWorkerGlobalScope;

const CACHE_NAME = 'lojinha-do-ze-v2';
const STATIC_CACHE = 'lojinha-static-v2';
const DYNAMIC_CACHE = 'lojinha-dynamic-v2';

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
];

/**
 * Evento de instalação do Service Worker
 */
sw.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return sw.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

/**
 * Evento de ativação do Service Worker
 */
sw.addEventListener('activate', (event: ExtendableEvent) => {
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
        return sw.clients.claim();
      })
  );
});

/**
 * Evento de fetch - intercepta todas as requisições
 */
sw.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para outros domínios
  if (url.origin !== sw.location.origin) {
    return;
  }
  
  const isHtml = request.headers.get('accept')?.includes('text/html');
  const isRsc = url.searchParams.has('_rsc');

  // Estratégia baseada no tipo de requisição
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(request) || isHtml || isRsc) {
    // Sempre tentar rede primeiro para HTML e requests da API ou RSC (App Router)
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
      return cachedResponse as Response;
    });
  
  return (cachedResponse || fetchPromise) as Promise<Response>;
}

/**
 * Evento de push para notificações
 */
sw.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');
  
  const options: NotificationOptions = {
    body: event.data ? event.data.text() : 'Nova notificação da Lojinha do Zé',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    // vibrate is not always available in NotificationOptions in all environments
    // @ts-ignore
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
      },
      {
        action: 'close',
        title: 'Fechar',
      },
    ],
  };
  
  event.waitUntil(
    sw.registration.showNotification('Lojinha do Zé', options)
  );
});

/**
 * Evento de clique na notificação
 */
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      sw.clients.openWindow('/')
    );
  }
});

/**
 * Evento de mensagem do cliente
 */
sw.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: CACHE_NAME });
    }
  }
});

console.log('[SW] Service Worker loaded');
