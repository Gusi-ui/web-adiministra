/**
 * Mapa centralizado de tipos de notificación a ficheros de audio.
 * Único punto de verdad — todos los componentes y servicios deben importar
 * desde aquí en lugar de definir su propio mapa local.
 */
import type { NotificationType } from '@/types';

export const NOTIFICATION_SOUND_MAP: Record<NotificationType, string> = {
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

export const DEFAULT_NOTIFICATION_SOUND = 'notification-default_new.wav';
export const FALLBACK_NOTIFICATION_SOUND = 'notification-default.mp3';

export function getNotificationSound(type: NotificationType | string): string {
  return (
    NOTIFICATION_SOUND_MAP[type as NotificationType] ??
    DEFAULT_NOTIFICATION_SOUND
  );
}
