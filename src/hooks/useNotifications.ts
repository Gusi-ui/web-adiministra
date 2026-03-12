'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import type { NotificationType, WorkerNotification } from '@/types';

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

    try {
      const response = await fetch(`/api/workers/${user.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });

      if (!response.ok) {
        throw new Error('Error al marcar todas las notificaciones como leídas');
      }

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read_at: new Date().toISOString() }))
      );

      setUnreadCount(0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      // Error marking all notifications as read - silently handle
    }
  }, [user?.id]);

  // Refrescar datos
  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  }, [loadNotifications, loadUnreadCount]);

  // Reproducir sonido de notificación
  const playNotificationSound = useCallback(
    (type: NotificationType) => {
      if (!enableSound) return;

      // Mapear tipos de notificación a archivos de sonido disponibles
      const soundFileMap: Record<NotificationType, string> = {
        new_user: 'notification-user_added_new.wav',
        user_removed: 'notification-user_removed_new.wav',
        schedule_change: 'notification-schedule_changed_new.wav',
        assignment_change: 'notification-assignment_changed_new.wav',
        route_update: 'notification-route_update_new.wav',
        system_message: 'notification-system_new.wav',
        reminder: 'notification-reminder_new.wav',
        urgent: 'notification-urgent_new.wav',
        holiday_update: 'notification-holiday_update_new.wav',
        service_start: 'notification-service_start_new.wav',
        service_end: 'notification-service_end_new.wav',
      };

      const soundFile = soundFileMap[type] || 'notification-default_new.wav';

      const playAudio = async (audioSrc: string) => {
        try {
          const audio = new Audio();
          audio.volume = 0.8;
          audio.src = audioSrc;

          // Esperar a que el audio esté listo
          await new Promise((resolve, reject) => {
            audio.oncanplaythrough = resolve;
            audio.onerror = () => reject(new Error('Audio load failed'));
            audio.load();
          });

          // Intentar reproducir
          await audio.play();
        } catch {
          // Silenciar errores de autoplay y otros problemas comunes
          // El usuario verá las notificaciones visuales aunque no haya sonido
        }
      };

      void playAudio(`/sounds/${soundFile}`).catch(() => {
        // Intentar con sonido por defecto si el principal falla
        void playAudio('/sounds/notification-default.mp3').catch(() => {
          // Silenciar completamente si no hay sonido disponible
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
