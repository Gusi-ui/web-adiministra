import { type NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { NotificationPriority, NotificationType } from '@/types';
import type { WorkerNotificationInsert } from '@/types/database-types';

interface CreateNotificationRequest {
  title?: string;
  body?: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
  expires_at?: string;
  priority?: NotificationPriority;
}

interface UpdateNotificationsRequest {
  notification_ids: string[];
}

// GET /api/workers/[id]/notifications - Obtener notificaciones del trabajador
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = (
      supabaseAdmin as {
        from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
      }
    )
      .from('worker_notifications')
      .select('*')
      .eq('worker_id', workerId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    // Filtrar notificaciones no expiradas
    query = query.or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
    );

    const { data: notifications, error } = await query;

    if (error !== null) {
      return NextResponse.json(
        { error: 'Error al obtener notificaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/workers/[id]/notifications - Crear nueva notificación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const body = (await request.json()) as CreateNotificationRequest;
    const {
      title,
      body: notificationBody,
      type,
      data,
      expires_at,
      priority = 'normal',
    } = body;

    if (
      typeof title !== 'string' ||
      typeof notificationBody !== 'string' ||
      typeof type !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, body, type' },
        { status: 400 }
      );
    }

    const notificationData: WorkerNotificationInsert = {
      worker_id: workerId,
      notification_type: type,
      message: notificationBody,
      title,
      body: notificationBody,
      type,
      data: data ?? undefined,
      expires_at: expires_at ?? null,
      priority,
    };

    // Logs de debug removidos por seguridad

    const { data: notification, error } = await (
      supabaseAdmin as {
        from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
      }
    )
      .from('worker_notifications')
      .insert(notificationData as unknown as Record<string, unknown>)
      .select()
      .single();

    if (error !== null) {
      // eslint-disable-next-line no-console
      console.error('Error al crear notificación:', error);
      return NextResponse.json(
        {
          error: 'Error al crear notificación',
          details: error,
        },
        { status: 500 }
      );
    }

    // Notificación creada exitosamente (log removido por seguridad)

    // Enviar notificación push en tiempo real aquí
    // await sendPushNotification(notification);

    return NextResponse.json(
      { notification: notification as Record<string, unknown> },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH /api/workers/[id]/notifications - Marcar notificaciones como leídas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const body = (await request.json()) as UpdateNotificationsRequest;
    const { notification_ids: notificationIds } = body;

    let query = (
      supabaseAdmin as {
        from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
      }
    )
      .from('worker_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('worker_id', workerId);

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notification_ids es requerido y debe ser un array no vacío' },
        { status: 400 }
      );
    }

    query = query.in('id', notificationIds);

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json(
        { error: 'Error al actualizar notificaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Notificaciones actualizadas correctamente',
      updated_count: data?.length ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
