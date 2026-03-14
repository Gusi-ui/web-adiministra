import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/supabase-admin';

// Cast para tablas no incluidas en el tipo Database (worker_notification_settings)
const db = supabaseAdmin as {
  from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
};

const settingsSchema = z.object({
  settings: z.object({
    push_enabled: z.boolean().optional(),
    sound_enabled: z.boolean().optional(),
    vibration_enabled: z.boolean().optional(),
    new_user_notifications: z.boolean().optional(),
    schedule_change_notifications: z.boolean().optional(),
    assignment_change_notifications: z.boolean().optional(),
    route_update_notifications: z.boolean().optional(),
    service_start_notifications: z.boolean().optional(),
    service_end_notifications: z.boolean().optional(),
    reminder_notifications: z.boolean().optional(),
    urgent_notifications: z.boolean().optional(),
    holiday_update_notifications: z.boolean().optional(),
    system_notifications: z.boolean().optional(),
    quiet_hours_start: z.string().nullable().optional(),
    quiet_hours_end: z.string().nullable().optional(),
  }),
});

// GET - Obtener configuración de notificaciones del trabajador
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;

    if (!workerId) {
      return NextResponse.json(
        { error: 'ID de trabajador requerido' },
        { status: 400 }
      );
    }

    // Buscar configuración existente
    const { data: settings, error: fetchError } = (await db
      .from('worker_notification_settings')
      .select('*')
      .eq('worker_id', workerId)
      .single()) as { data: Record<string, unknown> | null; error: unknown };

    if (
      fetchError !== null &&
      (fetchError as { code?: string })?.code !== 'PGRST116'
    ) {
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      );
    }

    // Si no existe configuración, devolver valores por defecto
    if (settings === null || settings === undefined) {
      const defaultSettings = {
        worker_id: workerId,
        push_enabled: true,
        sound_enabled: true,
        vibration_enabled: true,
        new_user_notifications: true,
        schedule_change_notifications: true,
        assignment_change_notifications: true,
        route_update_notifications: true,
        service_start_notifications: true,
        service_end_notifications: true,
        reminder_notifications: true,
        urgent_notifications: true,
        holiday_update_notifications: true,
        system_notifications: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      };

      return NextResponse.json({ settings: defaultSettings });
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar configuración de notificaciones
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { settings } = parsed.data;

    // Verificar que el trabajador existe
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .single();

    if (workerError || worker === null) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos para insertar/actualizar
    const settingsData = {
      worker_id: workerId,
      push_enabled: Boolean(settings.push_enabled ?? true),
      sound_enabled: Boolean(settings.sound_enabled ?? true),
      vibration_enabled: Boolean(settings.vibration_enabled ?? true),
      new_user_notifications: Boolean(settings.new_user_notifications ?? true),
      schedule_change_notifications: Boolean(
        settings.schedule_change_notifications ?? true
      ),
      assignment_change_notifications: Boolean(
        settings.assignment_change_notifications ?? true
      ),
      route_update_notifications: Boolean(
        settings.route_update_notifications ?? true
      ),
      service_start_notifications: Boolean(
        settings.service_start_notifications ?? true
      ),
      service_end_notifications: Boolean(
        settings.service_end_notifications ?? true
      ),
      reminder_notifications: Boolean(settings.reminder_notifications ?? true),
      urgent_notifications: Boolean(settings.urgent_notifications ?? true),
      holiday_update_notifications: Boolean(
        settings.holiday_update_notifications ?? true
      ),
      system_notifications: Boolean(settings.system_notifications ?? true),
      quiet_hours_start:
        typeof settings.quiet_hours_start === 'string'
          ? settings.quiet_hours_start
          : null,
      quiet_hours_end:
        typeof settings.quiet_hours_end === 'string'
          ? settings.quiet_hours_end
          : null,
      updated_at: new Date().toISOString(),
    };

    // Intentar actualizar primero
    const { data: updatedSettings, error: updateError } = (await db
      .from('worker_notification_settings')
      .update(settingsData)
      .eq('worker_id', workerId)
      .select()
      .single()) as {
      data: Record<string, unknown> | null;
      error: { code?: string } | null;
    };

    if (updateError && updateError.code === 'PGRST116') {
      // No existe, crear nuevo registro
      const { data: newSettings, error: insertError } = (await db
        .from('worker_notification_settings')
        .insert({
          ...settingsData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()) as { data: Record<string, unknown> | null; error: unknown };

      if (insertError !== null) {
        return NextResponse.json(
          { error: 'Error al crear configuración' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        settings: newSettings as Record<string, unknown>,
        message: 'Configuración creada correctamente',
      });
    }

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: updatedSettings as Record<string, unknown>,
      message: 'Configuración actualizada correctamente',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar configuración de notificaciones (resetear a valores por defecto)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;

    if (!workerId) {
      return NextResponse.json(
        { error: 'ID de trabajador requerido' },
        { status: 400 }
      );
    }

    // Eliminar configuración personalizada
    const { error: deleteError } = await db
      .from('worker_notification_settings')
      .delete()
      .eq('worker_id', workerId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error al eliminar configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Configuración restablecida a valores por defecto',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
