/**
 * Service Worker - Site Professor Yago
 * 
 * Service Worker básico para cache e atualizações
 * 
 * Funcionalidades:
 * - Cache de recursos estáticos
 * - Interceptação de requisições
 * - Atualizações controladas
 * - Mensagens para o cliente
 */

const CACHE_NAME = 'site-professor-yago-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service Worker instalado');
        // Forçar ativação imediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro na instalação:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker ativado');
        // Tomar controle de todas as páginas
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Erro na ativação:', error);
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Apenas para requisições GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache First para recursos estáticos
  if (isStaticResource(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('[SW] Servindo do cache:', event.request.url);
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Verificar se a resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar a resposta para o cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
  }
  
  // Estratégia: Network First para requisições de API
  else if (isAPIRequest(event.request.url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Verificar se a resposta é válida
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clonar a resposta para o cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        })
        .catch(() => {
          // Fallback para cache em caso de erro de rede
          return caches.match(event.request);
        })
    );
  }
});

// Interceptação de mensagens
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting solicitado');
    self.skipWaiting();
  }
});

// Interceptação de push notifications (futuro)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification recebida:', event.data);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Site Professor Yago', options)
  );
});

// Interceptação de cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clique em notificação:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Funções auxiliares
function isStaticResource(url) {
  return url.includes('/static/') || 
         url.includes('.js') || 
         url.includes('.css') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.jpeg') || 
         url.includes('.gif') || 
         url.includes('.svg') || 
         url.includes('.ico');
}

function isAPIRequest(url) {
  return url.includes('/api/') || 
         url.includes('localhost:3000') || 
         url.includes('vercel.app');
}

// Log de status
console.log('[SW] Service Worker carregado');
