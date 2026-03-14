'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import {
  DEFAULT_NOTIFICATION_SOUND,
  FALLBACK_NOTIFICATION_SOUND,
  getNotificationSound,
} from '@/lib/notification-sounds';
import type { WorkerNotification } from '@/types';

interface UseNotificationsOptions {
  limit?: number;
  autoRefresh?: boolean;
  enableSound?: boolean;
  enableBrowserNotifications?: boolean;
}

interface UseNotificationsReturn {
  notifications: WorkerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    limit = 50,
    autoRefresh = true,
    enableSound = true,
    enableBrowserNotifications = true,
  } = options;

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (user?.id === null || user?.id === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workers/${user.id}/notifications?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar notificaciones');
      }

      const data = (await response.json()) as {
        notifications?: WorkerNotification[];
      };
      setNotifications(data.notifications ?? []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      // Error loading notifications - silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  // Cargar conteo de no leídas
  const loadUnreadCount = useCallback(async () => {
    if (user?.id === null || user?.id === undefined) return;

    try {
      const response = await fetch(
        `/api/workers/${user.id}/notifications/unread-count`
      );

      if (!response.ok) {
        throw new Error('Error al cargar conteo de notificaciones');
      }

      const data = (await response.json()) as { unread_count?: number };
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Error loading unread count - silently handle
    }
  }, [user?.id]);

  // Marcar notificación como leída
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (user?.id === null || user?.id === undefined) return;

      try {
        const response = await fetch(`/api/workers/${user.id}/notifications`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: [notificationId] }),
        });

        if (!response.ok) {
          throw new Error('Error al marcar notificación como leída');
        }

        // Actualizar estado local
        setNotifications(prev =>
          prev.map(notif => {
            if (notif.id === notificationId) {
              return { ...notif, read_at: new Date().toISOString() };
            }
            return notif;
          })
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        // Error marking notification as read - silently handle
      }
    },
    [user?.id]
  );

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (user?.id === null || user?.id === undefined) return;

    // Obtener solo los IDs de las no leídas
    const unreadIds = notifications
      .filter(n => n.read_at === null)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    try {
      const response = await fetch(`/api/workers/${user.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: unreadIds }),
      });

      if (!response.ok) {
        throw new Error('Error al marcar todas las notificaciones como leídas');
      }

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    }
  }, [user?.id, notifications]);

  // Refrescar datos
  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  }, [loadNotifications, loadUnreadCount]);

  // Reproducir sonido de notificación
  const playNotificationSound = useCallback(
    (type: string) => {
      if (!enableSound) return;

      const soundFile = getNotificationSound(type);

      const playAudio = async (audioSrc: string) => {
        const audio = new Audio();
        audio.volume = 0.8;
        audio.src = audioSrc;
        await new Promise((resolve, reject) => {
          audio.oncanplaythrough = resolve;
          audio.onerror = () => reject(new Error('Audio load failed'));
          audio.load();
        });
        await audio.play();
      };

      void playAudio(`/sounds/${soundFile}`).catch(() => {
        void playAudio(`/sounds/${DEFAULT_NOTIFICATION_SOUND}`).catch(() => {
          void playAudio(`/sounds/${FALLBACK_NOTIFICATION_SOUND}`).catch(
            () => {}
          );
        });
      });
    },
    [enableSound]
  );

  // Mostrar notificación del navegador con mejor presentación
  const showBrowserNotification = useCallback(
    (notification: WorkerNotification) => {
      if (!enableBrowserNotifications) return;

      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
          silent: !enableSound,
          data: {
            notificationId: notification.id,
            type: notification.type,
            url: `${window.location.origin}/worker-dashboard`,
          },
        });

        // Auto-cerrar notificación después de tiempo según prioridad
        if (notification.priority !== 'urgent') {
          const timeout = notification.priority === 'high' ? 8000 : 6000;
          setTimeout(() => {
            browserNotification.close();
          }, timeout);
        }

        // Manejar click en la notificación
        browserNotification.onclick = () => {
          window.focus();
          void markAsRead(notification.id);
          browserNotification.close();
        };
      }
    },
    [enableBrowserNotifications, enableSound, markAsRead]
  );

  // Solicitar permisos de notificación
  const requestNotificationPermission = useCallback(async () => {
    if (!enableBrowserNotifications) return;

    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return Notification.permission === 'granted';
  }, [enableBrowserNotifications]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (user?.id === null || user?.id === undefined || autoRefresh === false) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      '🔌 Configurando suscripción en tiempo real para trabajador:',
      user.id
    );

    const channel = supabase
      .channel(`worker-${user.id}`)
      .on('broadcast', { event: 'notification' }, payload => {
        // eslint-disable-next-line no-console
        console.log(
          '📨 Notificación en tiempo real recibida:',
          payload['payload']
        );
        const newNotification = payload['payload'] as WorkerNotification;

        // Agregar nueva notificación al estado
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Reproducir sonido
        if (newNotification.type) {
          playNotificationSound(newNotification.type);
        }

        // Mostrar notificación del navegador
        showBrowserNotification(newNotification);

        // eslint-disable-next-line no-console
        console.log('✅ Notificación procesada en cliente');
      })
      .subscribe();

    return () => {
      // eslint-disable-next-line no-console
      console.log('🔌 Limpiando suscripción en tiempo real');
      void supabase.removeChannel(channel);
    };
  }, [user?.id, autoRefresh, playNotificationSound, showBrowserNotification]);

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.id !== null && user?.id !== undefined) {
      void refresh();
      void requestNotificationPermission();
    }
  }, [user?.id, refresh, requestNotificationPermission]);

  // Auto-refresh cada 10 segundos como respaldo para tiempo real
  useEffect(() => {
    if (autoRefresh === false || user?.id === null || user?.id === undefined) {
      return;
    }

    const interval = setInterval(() => {
      void loadUnreadCount();
    }, 30000); // Polling de respaldo cada 30s (Supabase realtime es el canal principal)

    return () => clearInterval(interval);
  }, [autoRefresh, user?.id, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
