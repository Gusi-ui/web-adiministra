import { type NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

// DELETE /api/workers/[id]/notifications/[notificationId] - Eliminar notificación específica
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> }
) {
  try {
    const { id: workerId, notificationId } = await params;

    const { data, error } = await (supabaseAdmin as { from: (t: string) => ReturnType<typeof supabaseAdmin.from> })
      .from('worker_notifications')
      .delete()
      .eq('worker_id', workerId)
      .eq('id', notificationId)
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Error al eliminar notificación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Notificación eliminada correctamente',
      deleted_count: data?.length ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
