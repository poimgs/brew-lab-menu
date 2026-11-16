// Two jobs, and never touches page loads (no fetch handler), so the menu can't go stale.
//
// 1. This domain used to host an older Brew Lab PWA, whose service worker can outlive it in a visitor's
//    browser and keep answering with its own cache. Browsers re-check this URL, so this replaces it: any
//    cache it left is cleared and the page reloaded. Nobody else has caches here, so others aren't reloaded.
// 2. A friend who asks to hear about their order registers it, and it shows those notifications.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      if (!keys.length) return
      await Promise.all(keys.map((k) => caches.delete(k)))
      // Still nothing worth keeping a worker for unless this browser signed up for notifications.
      if (!(await self.registration.pushManager.getSubscription())) await self.registration.unregister()
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
    })(),
  )
})

self.addEventListener('push', (event) => {
  const { title, body, url } = event.data.json()
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url } }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    (async () => {
      const [open] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (!open) return self.clients.openWindow(url)
      return open.focus()
    })(),
  )
})
