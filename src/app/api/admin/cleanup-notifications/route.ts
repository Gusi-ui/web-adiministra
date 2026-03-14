import { type NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET  /api/admin/cleanup-notifications  ← invocado por Vercel Cron Job
 * POST /api/admin/cleanup-notifications  ← invocación manual
 *
 * Elimina todas las filas de worker_notifications con expires_at en el pasado.
 * Alternativa a pg_cron para entornos con Supabase Free.
 *
 * Autenticación: Authorization: Bearer <CRON_SECRET>
 * Vercel inyecta CRON_SECRET automáticamente en las Cron Jobs.
 */

async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = supabaseAdmin as {
    from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
  };

  const { error, count } = await db
    .from('worker_notifications')
    .delete({ count: 'exact' })
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString());

  if (error) {
    return NextResponse.json(
      { error: 'Error al limpiar notificaciones expiradas' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Limpieza completada',
    deleted_count: count ?? 0,
  });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
