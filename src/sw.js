// LifeOS Companion — Custom Service Worker
// self.__WB_MANIFEST is injected by vite-plugin-pwa (injectManifest strategy)

// eslint-disable-next-line no-undef
const _precacheManifest = self.__WB_MANIFEST;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Notification scheduling ───────────────────────────────────────────────────

const timers = new Map();

self.addEventListener('message', (event) => {
  const { type, items } = event.data || {};

  if (type === 'SCHEDULE_NOTIFICATIONS') {
    timers.forEach(id => clearTimeout(id));
    timers.clear();

    const now = Date.now();
    for (const item of items || []) {
      const delay = item.fireAt - now;
      if (delay > 0 && delay < 86_400_000) {
        const id = setTimeout(() => {
          self.registration.showNotification(item.title, {
            body: item.body,
            icon: '/icon-192.png',
            tag: item.tag || 'life-os',
            data: { url: '/' },
          });
        }, delay);
        timers.set(item.tag || String(item.fireAt), id);
      }
    }
  }

  if (type === 'CANCEL_NOTIFICATIONS') {
    timers.forEach(id => clearTimeout(id));
    timers.clear();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
