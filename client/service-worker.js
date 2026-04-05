// Service Worker - PWA support for offline functionality
// Enable: install -> activate -> fetch -> message

const CACHE_NAME = 'omnius-v1';
const RUNTIME_CACHE = 'omnius-runtime-v1';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/ai-team.js',
  '/voice-automation.js',
  '/icon.svg',
  '/favicon.svg'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Install complete');
      self.skipWaiting(); // Skip waiting, activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      self.clients.claim(); // Claim all clients
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external origins
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then(cached => {
            if (cached) {
              console.log('[SW] Serving from cache:', url.pathname);
              return cached;
            }
            // No cache available, return offline response
            return new Response(
              JSON.stringify({
                offline: true,
                message: 'You are offline. Some features are limited.'
              }),
              { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // Update cache in background
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          
          return cached;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Cache successful responses
            if (response.ok) {
              const cache = caches.open(CACHE_NAME);
              cache.then(c => c.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => {
            // Return offline fallback
            return new Response('Offline - this resource is not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      caches.delete(RUNTIME_CACHE).then(() => {
        console.log('[SW] Cache cleared');
        event.ports[0].postMessage({ cleared: true });
      });
      break;

    case 'GET_CACHE_SIZE':
      caches.open(CACHE_NAME).then(cache => {
        cache.keys().then(requests => {
          event.ports[0].postMessage({ cacheSize: requests.length });
        });
      });
      break;

    default:
      console.log('[SW] Unknown message:', type);
  }
});

// Push notifications (ready for implementation)
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'OMNIUS Notification',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'omnius',
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'OMNIUS', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker loaded');
