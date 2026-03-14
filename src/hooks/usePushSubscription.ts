'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

interface UsePushSubscriptionReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Gestiona la suscripción Web Push del trabajador actual.
 * Registra el Service Worker (/sw.js), suscribe al PushManager con las
 * VAPID keys del servidor, y persiste la suscripción en la base de datos.
 */
export function usePushSubscription(): UsePushSubscriptionReturn {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  // Guardamos el registro para reutilizarlo en subscribe() sin depender
  // de navigator.serviceWorker.ready, que puede colgarse indefinidamente.
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Comprobar soporte y suscripción existente al montar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        registrationRef.current = reg;
        const existing = await reg.pushManager.getSubscription();
        setSubscription(existing);
        setIsSubscribed(existing !== null);
      } catch {
        // Silently handle — push support optional
      }
    };

    void check();
  }, []);

  const subscribe = useCallback(async () => {
    if (user?.id == null || !isSupported) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (
      !vapidPublicKey ||
      vapidPublicKey === 'undefined' ||
      vapidPublicKey.length < 80
    ) {
      setError(
        'Notificaciones push pendientes de configuración en el servidor'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Usar el registro guardado; si por algún motivo no está, registrar de nuevo.
      // register() es idempotente: devuelve el registro existente si ya está activo.
      const registration =
        registrationRef.current ??
        (await navigator.serviceWorker.register('/sw.js'));
      registrationRef.current = registration;

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
        .buffer as ArrayBuffer;

      const pushSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const p256dhKey = pushSub.getKey('p256dh');
      const authKey = pushSub.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('No se pudieron obtener las claves de la suscripción');
      }

      const response = await fetch(
        `/api/workers/${user.id}/push-subscriptions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: pushSub.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhKey),
              auth: arrayBufferToBase64(authKey),
            },
            user_agent: navigator.userAgent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error guardando suscripción en el servidor');
      }

      setSubscription(pushSub);
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (user?.id == null || subscription === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await subscription.unsubscribe();

      await fetch(`/api/workers/${user.id}/push-subscriptions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscription(null);
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, subscription]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

/** Convierte una clave VAPID pública en base64url a Uint8Array para PushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/** Convierte un ArrayBuffer a base64 estándar */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
