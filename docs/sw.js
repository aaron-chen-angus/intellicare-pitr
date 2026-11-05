// App caches are isolated by Pages subpath; never remove another site's caches.
const PREFIX = `rainandme:${new URL(self.registration.scope).pathname}:`
const CACHE = `${PREFIX}2026.11.05-restyle-integrated-1`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => (key.startsWith(PREFIX) && key !== CACHE) || ['rainandme-v1', 'rainandme-v3'].includes(key)).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  // Fonts/models/CDNs own their cache policies. Never substitute HTML for them.
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    try {
      const response = await fetch(request, { cache: request.mode === 'navigate' ? 'no-cache' : 'default' })
      if (response.ok && (request.mode === 'navigate' || /\.(js|css|svg|webmanifest)$/.test(url.pathname))) {
        event.waitUntil(cache.put(request, response.clone()).catch(() => undefined))
      }
      return response
    } catch {
      const cached = await cache.match(request)
      if (cached) return cached
      if (request.mode === 'navigate') {
        const shell = await cache.match(self.registration.scope)
        if (shell) return shell
      }
      return Response.error()
    }
  })())
})
