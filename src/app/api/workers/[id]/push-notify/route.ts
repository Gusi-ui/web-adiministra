import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { vapidConfigured, webPush } from '@/lib/web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';

const db = supabaseAdmin as {
  from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
};

const notifySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.string(),
  priority: z.string().optional(),
  notificationId: z.string().uuid().optional(),
  vibrate: z.array(z.number()).optional(),
  actions: z
    .array(
      z.object({ action: z.string(), title: z.string(), icon: z.string() })
    )
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/workers/[id]/push-notify — enviar Web Push a todas las suscripciones del trabajador
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!vapidConfigured) {
    return NextResponse.json({ skipped: true, reason: 'VAPID no configurado' });
  }

  try {
    const { id: workerId } = await params;
    const parsed = notifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: subscriptions, error } = await db
      .from('worker_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('worker_id', workerId);

    if (error || !subscriptions?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const payload = JSON.stringify({
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      priority: parsed.data.priority ?? 'normal',
      notificationId: parsed.data.notificationId,
      vibrate: parsed.data.vibrate,
      actions: parsed.data.actions,
      data: parsed.data.data,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      url: `${appUrl}/worker-dashboard`,
    });

    interface PushSub {
      endpoint: string;
      p256dh: string;
      auth: string;
    }

    const subs = subscriptions as unknown as PushSub[];

    const results = await Promise.allSettled(
      subs.map(sub =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // Limpiar suscripciones expiradas (HTTP 410 Gone)
    const expiredEndpoints = subs
      .filter((_, i) => {
        const result = results[i];
        return (
          result?.status === 'rejected' &&
          (result as PromiseRejectedResult).reason?.statusCode === 410
        );
      })
      .map(sub => sub.endpoint);

    if (expiredEndpoints.length > 0) {
      await db
        .from('worker_push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
