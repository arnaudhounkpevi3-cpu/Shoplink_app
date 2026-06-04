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
