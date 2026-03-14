import { supabase } from '@/lib/database';
import type { NotificationType } from '@/types';
import type {
  WorkerNotification,
  WorkerNotificationInsert,
} from '@/types/database-types';

/**
 * Servicio para manejar notificaciones push y en tiempo real
 */
export class NotificationService {
  private static instance: NotificationService;
  // Eliminado webSocketConnections no usado
  // private readonly webSocketConnections: Map<string, WebSocket> = new Map();

  static getInstance(): NotificationService {
    NotificationService.instance ??= new NotificationService();
    return NotificationService.instance;
  }

  /**
   * Crear y enviar una notificación a un trabajador
   */
  async createAndSendNotification(
    workerId: string,
    notification: Omit<WorkerNotificationInsert, 'worker_id'>
  ): Promise<WorkerNotification | null> {
    try {
      const { data: createdNotification, error } = await supabase
        .from('worker_notifications')
        .insert({
          worker_id: workerId,
          ...notification,
        } as WorkerNotificationInsert)
        .select()
        .single();

      if (error) {
        throw new Error(`Error creating notification: ${error.message}`);
      }

      // Enviar notificación push y en tiempo real en paralelo
      await Promise.allSettled([
        this.sendPushNotification(createdNotification),
        this.sendRealtimeNotification(workerId, createdNotification),
      ]);

      return createdNotification;
    } catch (error) {
      // Registrar el error sin bloquear el flujo del caller
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(
        '[NotificationService] createAndSendNotification:',
        message
      );
      return null;
    }
  }

  /**
   * Enviar Web Push a todas las suscripciones VAPID del trabajador.
   * Delega en el endpoint /api/workers/[id]/push-notify para mantener
   * la clave privada VAPID exclusivamente en el servidor.
   */
  private async sendPushNotification(
    notification: WorkerNotification
  ): Promise<void> {
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? ''
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001');

      const response = await fetch(
        `${baseUrl}/api/workers/${notification.worker_id}/push-notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notification.title,
            body: notification.body,
            type: notification.type,
            priority: notification.priority,
            notificationId: notification.id,
            vibrate: this.getVibrationPattern(notification.priority),
            actions: this.getNotificationActions(notification.type),
            data: notification.data,
          }),
        }
      );

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(
          '[NotificationService] sendPushNotification: API returned',
          response.status
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error('[NotificationService] sendPushNotification:', msg);
    }
  }

  /**
   * Enviar notificación en tiempo real via WebSocket
   */
  private async sendRealtimeNotification(
    workerId: string,
    notification: WorkerNotification
  ): Promise<void> {
    try {
      // Crear canal temporal para broadcasting
      const channel = supabase.channel(`worker-${workerId}`, {
        config: {
          broadcast: { self: false },
        },
      });

      // Suscribirse al canal para poder enviar
      await new Promise<void>((resolve, reject) => {
        const subscription = channel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            // Una vez suscrito, enviar la notificación
            void channel.send({
              type: 'broadcast',
              event: 'notification',
              payload: notification,
            });

            // Pequeña pausa para asegurar que se envíe
            setTimeout(() => {
              resolve();
            }, 100);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Channel subscription failed: ${status}`));
          }
        });

        // Timeout de seguridad (5 segundos)
        setTimeout(() => {
          void subscription.unsubscribe();
          reject(new Error('Channel subscription timeout'));
        }, 5000);
      });

      // Limpiar el canal después de enviar
      void supabase.removeChannel(channel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending realtime notification:', error);
    }
  }

  /**
   * Obtener patrón de vibración según la prioridad
   */
  private getVibrationPattern(priority: string): number[] {
    const vibrationMap: Record<string, number[]> = {
      low: [100],
      normal: [200, 100, 200],
      high: [300, 100, 300, 100, 300],
      urgent: [500, 200, 500, 200, 500, 200, 500],
    };

    return vibrationMap[priority] ?? [200, 100, 200];
  }

  /**
   * Obtener acciones de notificación según el tipo
   */
  private getNotificationActions(type: NotificationType) {
    const baseActions = [
      { action: 'view', title: 'Ver', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Descartar', icon: '/icons/dismiss.png' },
    ];

    const typeSpecificActions: Record<NotificationType, typeof baseActions> = {
      new_user: [
        { action: 'view_user', title: 'Ver Usuario', icon: '/icons/user.png' },
        {
          action: 'view_schedule',
          title: 'Ver Horario',
          icon: '/icons/schedule.png',
        },
        ...baseActions,
      ],
      schedule_change: [
        {
          action: 'view_schedule',
          title: 'Ver Horario',
          icon: '/icons/schedule.png',
        },
        { action: 'acknowledge', title: 'Confirmar', icon: '/icons/check.png' },
        ...baseActions,
      ],
      assignment_change: [
        {
          action: 'view_assignment',
          title: 'Ver Asignación',
          icon: '/icons/assignment.png',
        },
        ...baseActions,
      ],
      route_update: [
        { action: 'view_route', title: 'Ver Ruta', icon: '/icons/route.png' },
        ...baseActions,
      ],
      urgent: [
        { action: 'call', title: 'Llamar', icon: '/icons/phone.png' },
        { action: 'respond', title: 'Responder', icon: '/icons/message.png' },
        ...baseActions,
      ],
      user_removed: baseActions,
      system_message: baseActions,
      reminder: baseActions,
      holiday_update: baseActions,
      service_start: [
        {
          action: 'view_service',
          title: 'Ver Servicio',
          icon: '/icons/service.png',
        },
        {
          action: 'start_navigation',
          title: 'Iniciar Ruta',
          icon: '/icons/navigation.png',
        },
        ...baseActions,
      ],
      service_end: [
        {
          action: 'view_service',
          title: 'Ver Servicio',
          icon: '/icons/service.png',
        },
        {
          action: 'complete_service',
          title: 'Marcar Completado',
          icon: '/icons/check.png',
        },
        {
          action: 'next_service',
          title: 'Siguiente Servicio',
          icon: '/icons/next.png',
        },
        ...baseActions,
      ],
    };

    return typeSpecificActions[type] ?? baseActions;
  }

  /**
   * Factorías de notificaciones para eventos del sistema.
   * Cada función devuelve la notificación creada o null si falla.
   */
  readonly systemNotifications = {
    newUser: (workerId: string, userName: string, userAddress: string) =>
      this.createAndSendNotification(workerId, {
        title: 'Nuevo usuario asignado',
        body: `Se te ha asignado un nuevo usuario: ${userName} en ${userAddress}`,
        type: 'new_user',
        priority: 'high',
        data: { userName, userAddress },
      }),

    userRemoved: (workerId: string, userName: string) =>
      this.createAndSendNotification(workerId, {
        title: 'Usuario eliminado',
        body: `El usuario ${userName} ha sido eliminado de tus asignaciones`,
        type: 'user_removed',
        priority: 'normal',
        data: { userName },
      }),

    scheduleChange: (
      workerId: string,
      userName: string,
      oldTime: string,
      newTime: string
    ) =>
      this.createAndSendNotification(workerId, {
        title: 'Cambio de horario',
        body: `Horario de ${userName} cambiado de ${oldTime} a ${newTime}`,
        type: 'schedule_change',
        priority: 'high',
        data: { userName, oldTime, newTime },
      }),

    serviceStart: (
      workerId: string,
      userName: string,
      serviceTime: string,
      serviceAddress: string
    ) =>
      this.createAndSendNotification(workerId, {
        title: 'Servicio iniciado',
        body: `Servicio con ${userName} a las ${serviceTime} en ${serviceAddress} ha comenzado`,
        type: 'service_start',
        priority: 'high',
        data: { userName, serviceTime, serviceAddress },
      }),

    serviceEnd: (
      workerId: string,
      userName: string,
      serviceTime: string,
      nextServiceInfo?: string
    ) =>
      this.createAndSendNotification(workerId, {
        title: 'Servicio finalizado',
        body: `Servicio con ${userName} a las ${serviceTime} ha terminado${
          nextServiceInfo ? `. ${nextServiceInfo}` : ''
        }`,
        type: 'service_end',
        priority: 'normal',
        data: { userName, serviceTime, nextServiceInfo },
      }),
  };
}

// Exportar instancia singleton
export const notificationService = NotificationService.getInstance();
