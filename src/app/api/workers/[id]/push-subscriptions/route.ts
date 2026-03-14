import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/supabase-admin';

const db = supabaseAdmin as {
  from: (t: string) => ReturnType<typeof supabaseAdmin.from>;
};

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  user_agent: z.string().optional(),
});

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

// POST /api/workers/[id]/push-subscriptions — guardar suscripción push
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const parsed = subscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, keys, user_agent } = parsed.data;
    const { error } = await db.from('worker_push_subscriptions').upsert(
      {
        worker_id: workerId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: user_agent ?? null,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return NextResponse.json(
        { error: 'Error guardando suscripción push' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/workers/[id]/push-subscriptions — eliminar suscripción push
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'endpoint requerido' },
        { status: 400 }
      );
    }

    const { error } = await db
      .from('worker_push_subscriptions')
      .delete()
      .eq('worker_id', workerId)
      .eq('endpoint', parsed.data.endpoint);

    if (error) {
      return NextResponse.json(
        { error: 'Error eliminando suscripción push' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
