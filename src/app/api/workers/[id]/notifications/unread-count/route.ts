import { type NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/database';

// GET /api/workers/[id]/notifications/unread-count - Obtener conteo de notificaciones no leídas
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const { count, error } = await supabase
      .from('worker_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .is('read_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      // Error fetching unread count
      return NextResponse.json(
        { error: 'Error al obtener conteo de notificaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      unread_count: typeof count === 'number' ? count : 0,
    });
  } catch {
    // Unexpected error
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
