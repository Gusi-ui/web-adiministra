import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { WorkerNotificationInsert } from '@/types/database-types';

const NOTIFICATION_TYPES = [
  'new_user',
  'user_removed',
  'schedule_change',
  'assignment_change',
  'route_update',
  'service_start',
  'service_end',
  'system_message',
  'reminder',
  'urgent',
  'holiday_update',
] as const;

const createNotificationSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  body: z.string().min(1, 'El cuerpo es requerido'),
  type: z.enum(NOTIFICATION_TYPES),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
});

const updateNotificationsSchema = z.union([
  z.object({ notification_ids: z.array(z.string().uuid()).min(1) }),
  z.object({ mark_all_read: z.literal(true) }),
]);

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

    if (!rateLimit(`post-notification:${workerId}`, 20, 60_000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const parsed = createNotificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      body,
      type,
      data,
      expires_at,
      priority = 'normal',
    } = parsed.data;

    const notificationData: WorkerNotificationInsert = {
      worker_id: workerId,
      title,
      body,
      type,
      data,
      expires_at: expires_at ?? null,
      priority,
    };

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
      return NextResponse.json(
        { error: 'Error al crear notificación' },
        { status: 500 }
      );
    }

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

    const parsed = updateNotificationsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = supabaseAdmin as {
      from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
    };

    const readAt = new Date().toISOString();
    let baseQuery = db
      .from('worker_notifications')
      .update({ read_at: readAt })
      .eq('worker_id', workerId)
      .is('read_at', null);

    if ('notification_ids' in parsed.data) {
      baseQuery = baseQuery.in('id', parsed.data.notification_ids);
    }

    const { data, error } = await baseQuery.select();

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
