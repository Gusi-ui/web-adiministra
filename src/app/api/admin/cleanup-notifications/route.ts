import { type NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/admin/cleanup-notifications
 *
 * Deletes all expired worker_notifications rows.
 * Intended as a fallback trigger when pg_cron is unavailable
 * (e.g. Supabase free tier). Can be called from a Vercel cron
 * job or GitHub Actions scheduled workflow.
 *
 * Requires Authorization: Bearer <CLEANUP_SECRET> header.
 * Set CLEANUP_SECRET in environment variables.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CLEANUP_SECRET no configurado' },
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
