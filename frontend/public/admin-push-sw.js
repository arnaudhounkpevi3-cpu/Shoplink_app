self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_error) {
    data = { title: 'ShopLink Admin', body: event.data ? event.data.text() : 'Nouvelle activité.' }
  }

  const title = data.title || 'ShopLink Admin'
  const options = {
    body: data.body || 'Nouvelle activité sur ShopLink.',
    icon: data.icon || 'https://cdn-icons-png.flaticon.com/512/2645/2645897.png',
    badge: data.icon || 'https://cdn-icons-png.flaticon.com/512/2645/2645897.png',
    image: data.image || undefined,
    tag: data.tag || 'shoplink-admin',
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    vibrate: [180, 90, 180, 90, 240],
    actions: [
      { action: 'open-admin', title: 'Ouvrir l’admin' },
      { action: 'dismiss', title: 'Fermer' },
    ],
    data: {
      url: data.url || '/admin/admin-dashboard.html',
      receivedAt: Date.now(),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/admin/admin-dashboard.html'
  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const targetUrl = new URL(url, self.location.origin).href

    for (const client of windowClients) {
      if (client.url.includes('/admin/admin-dashboard.html') && 'focus' in client) {
        await client.focus()
        if ('navigate' in client && client.url !== targetUrl) {
          return client.navigate(targetUrl)
        }
        return
      }
    }

    return clients.openWindow(url)
  })())
})

const PUBLIC_CACHE = 'shoplink-public-cache-v3-original-images'
const IMAGE_CACHE = 'shoplink-image-cache-v3-original-images'

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys
      .filter((key) => key.startsWith('shoplink-public-cache-') || key.startsWith('shoplink-image-cache-'))
      .filter((key) => key !== PUBLIC_CACHE && key !== IMAGE_CACHE)
      .map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

function isPublicApiRequest(request) {
  const url = new URL(request.url)
  return url.origin === self.location.origin && url.pathname.startsWith('/api/public/')
}

function isCacheableImageRequest(request) {
  const url = new URL(request.url)
  return request.destination === 'image' || /\/storage\/v1\/(object\/public|render\/image\/public)\//.test(url.pathname)
}

async function networkFirst(request) {
  const cache = await caches.open(PUBLIC_CACHE)
  try {
    const response = await fetch(request)
    if (response && (response.ok || response.status === 304)) {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch (_error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw _error
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone()).catch(() => {})
  }
  return response
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (isPublicApiRequest(event.request)) {
    event.respondWith(networkFirst(event.request))
    return
  }
  if (isCacheableImageRequest(event.request)) {
    event.respondWith(cacheFirst(event.request))
  }
})
