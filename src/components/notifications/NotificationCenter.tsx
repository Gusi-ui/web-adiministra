'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import type { NotificationType, WorkerNotification } from '@/types';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({
  className = '',
}: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(true);

  // Reproducir sonido de notificación
  const playNotificationSound = async (type: NotificationType) => {
    // Mapear tipos de notificación a archivos de sonido disponibles
    const soundFileMap: Record<NotificationType, string> = {
      new_user: 'notification-user_added_new.wav',
      user_removed: 'notification-user_removed_new.wav',
      schedule_change: 'notification-schedule_changed_new.wav',
      assignment_change: 'notification-assignment_changed_new.wav',
      route_update: 'notification-route_update_new.wav',
      service_start: 'notification-service_start_new.wav',
      service_end: 'notification-service_end_new.wav',
      system_message: 'notification-system_new.wav',
      reminder: 'notification-reminder_new.wav',
      urgent: 'notification-urgent_new.wav',
      holiday_update: 'notification-holiday_update_new.wav',
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
        // Silenciar errores de autoplay - son comunes en navegadores modernos
        // Las notificaciones visuales seguirán funcionando
      }
    };

    try {
      await playAudio(`/sounds/${soundFile}`);
    } catch {
      // Intentar con sonido por defecto si el principal falla
      try {
        await playAudio('/sounds/notification-default.mp3');
      } catch {
        // Silenciar completamente si no hay sonido disponible
        // Las notificaciones visuales seguirán funcionando
      }
    }
  };

  // Mostrar notificación del navegador con mejor presentación
  const showBrowserNotification = useCallback(
    (notification: WorkerNotification) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
          silent: false,
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
          browserNotification.close();
        };
      }
    },
    []
  );

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (user?.id == null) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/workers/${user.id}/notifications?limit=20`
      );
      if (response.ok) {
        const data = (await response.json()) as {
          notifications?: WorkerNotification[];
        };
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // Error loading notifications - silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Cargar conteo de no leídas
  const loadUnreadCount = useCallback(async () => {
    if (user?.id == null) return;

    try {
      const response = await fetch(
        `/api/workers/${user.id}/notifications/unread-count`
      );
      if (response.ok) {
        const data = (await response.json()) as { unread_count?: number };
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // Error loading unread count - silently handle
    }
  }, [user?.id]);

  // Marcar notificación como leída
  const markAsRead = async (notificationId: string) => {
    if (user?.id == null) return;

    try {
      const response = await fetch(`/api/workers/${user.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.filter(notif => notif.id !== notificationId)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // Error marking notification as read - silently handle
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (user?.id == null) return;

    const unreadNotificationIds = notifications
      .filter(notif => notif.read_at === null)
      .map(notif => notif.id);

    if (unreadNotificationIds.length === 0) return;

    try {
      const response = await fetch(`/api/workers/${user.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: unreadNotificationIds }),
      });

      if (response.ok) {
        // Si estamos mostrando solo no leídas, eliminar todas las notificaciones
        // Si estamos mostrando todas, marcar como leídas pero mantenerlas visibles
        setNotifications(prev => {
          if (showOnlyUnread) {
            return prev.filter(notif => notif.read_at !== null);
          }
          return prev.map(notif => ({
            ...notif,
            read_at: new Date().toISOString(),
          }));
        });
        setUnreadCount(0);
      }
    } catch {
      // Error marking all notifications as read - silently handle
    }
  };

  // Eliminar notificación completamente
  const deleteNotification = async (notificationId: string) => {
    if (user?.id == null) return;

    try {
      const response = await fetch(
        `/api/workers/${user.id}/notifications/${notificationId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.filter(notif => notif.id !== notificationId)
        );
        // Si era no leída, reducir el contador
        const wasUnread =
          notifications.find(n => n.id === notificationId)?.read_at === null;
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch {
      // Error deleting notification - silently handle
    }
  };

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (user?.id == null) return;

    const channel = supabase
      .channel(`worker-${user.id}`)
      .on('broadcast', { event: 'notification' }, payload => {
        const newNotification = payload['payload'] as WorkerNotification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Reproducir sonido de notificación
        if (newNotification.type) {
          void playNotificationSound(newNotification.type);
        }

        // Mostrar notificación del navegador si está permitido
        showBrowserNotification(newNotification);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, showBrowserNotification]);

  // Cargar datos iniciales
  useEffect(() => {
    void loadNotifications();
    void loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Solicitar permisos de notificación
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Obtener icono según el tipo de notificación
  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, string> = {
      new_user: '👤',
      user_removed: '❌',
      schedule_change: '⏰',
      assignment_change: '📋',
      route_update: '🗺️',
      system_message: '💬',
      reminder: '🔔',
      urgent: '🚨',
      holiday_update: '📅',
      service_start: '▶️',
      service_end: '⏹️',
    };
    return iconMap[type] || '🔔';
  };

  // Obtener color según la prioridad
  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colorMap[priority] ?? 'text-blue-500';
  };

  // Formatear tiempo relativo
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Filtrar notificaciones según la configuración
  const filteredNotifications = showOnlyUnread
    ? notifications.filter(notif => notif.read_at === null)
    : notifications;

  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors'
        aria-label='Notificaciones'
      >
        <svg
          className='w-6 h-6'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
          />
        </svg>
        {/* Badge de conteo */}
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className='absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50'>
          {/* Header */}
          <div className='p-4 border-b border-gray-200'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllAsRead()}
                  className='text-sm text-blue-600 hover:text-blue-800'
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Filtro */}
            <div className='flex items-center justify-between text-sm'>
              <button
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className={`px-3 py-1 rounded-full ${
                  showOnlyUnread
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {showOnlyUnread ? 'Solo no leídas' : 'Todas las notificaciones'}
              </button>
              <span className='text-gray-500'>
                {filteredNotifications.length}{' '}
                {filteredNotifications.length === 1
                  ? 'notificación'
                  : 'notificaciones'}
              </span>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='p-4 text-center text-gray-500'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto'></div>
                <p className='mt-2'>Cargando notificaciones...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className='p-4 text-center text-gray-500'>
                <svg
                  className='w-12 h-12 mx-auto mb-2 text-gray-300'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                  />
                </svg>
                <p>
                  {showOnlyUnread
                    ? 'No tienes notificaciones sin leer'
                    : 'No tienes notificaciones'}
                </p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    notification.read_at === null ? 'bg-blue-50' : ''
                  }`}
                  onClick={() =>
                    notification.read_at === null &&
                    void markAsRead(notification.id)
                  }
                >
                  <div className='flex items-start space-x-3'>
                    <span className='text-2xl'>
                      {getNotificationIcon(
                        notification.type ?? 'system_message'
                      )}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <p
                          className={`text-sm font-medium ${
                            notification.read_at === null
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <div className='flex items-center space-x-2'>
                          <span
                            className={`text-xs ${getPriorityColor(notification.priority ?? 'normal')}`}
                          >
                            {formatTimeAgo(
                              notification.sent_at ?? notification.created_at
                            )}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              void deleteNotification(notification.id);
                            }}
                            className='text-gray-400 hover:text-red-500 transition-colors'
                            title='Eliminar notificación'
                          >
                            <svg
                              className='w-4 h-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M6 18L18 6M6 6l12 12'
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          notification.read_at === null
                            ? 'text-gray-700'
                            : 'text-gray-500'
                        }`}
                      >
                        {notification.body}
                      </p>
                      {notification.read_at === null && (
                        <div className='flex items-center mt-2'>
                          <div className='w-2 h-2 bg-blue-500 rounded-full mr-2'></div>
                          <span className='text-xs text-blue-600'>Nueva</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className='p-3 border-t border-gray-200'>
            <div className='flex justify-between items-center'>
              {filteredNotifications.length > 0 && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navegar a página completa de notificaciones
                  }}
                  className='text-sm text-blue-600 hover:text-blue-800'
                >
                  Ver todas las notificaciones
                </button>
              )}
              {filteredNotifications.length === 0 && (
                <span className='text-sm text-gray-500'>
                  No hay notificaciones
                </span>
              )}
              <Link
                href='/worker-dashboard/notifications'
                onClick={() => setIsOpen(false)}
                className='text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                </svg>
                Configurar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
