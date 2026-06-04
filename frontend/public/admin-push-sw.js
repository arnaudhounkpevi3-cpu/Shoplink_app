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
    tag: data.tag || 'shoplink-admin',
    data: { url: data.url || '/admin/admin-dashboard.html' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/admin/admin-dashboard.html'
  event.waitUntil(clients.openWindow(url))
})
