'use strict';

/**
 * Service Worker para SAD Web Push Notifications.
 * Registrado en /sw.js (scope: raíz de la app).
 * Maneja eventos push en segundo plano y clicks en notificaciones del SO.
 */

self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nueva notificación', body: event.data.text() };
  }

  const title = data.title ?? 'Notificación SAD';
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/favicon.ico',
    badge: data.badge ?? '/favicon.ico',
    tag: data.notificationId ?? data.type ?? 'notification',
    requireInteraction: data.priority === 'urgent',
    silent: false,
    vibrate: data.vibrate ?? [200, 100, 200],
    actions: data.actions ?? [],
    data: {
      url: data.url ?? '/worker-dashboard',
      notificationId: data.notificationId,
      type: data.type,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/worker-dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Enfocar ventana existente si hay una abierta en la misma URL
        const existing = windowClients.find(w =>
          w.url.startsWith(self.location.origin)
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
