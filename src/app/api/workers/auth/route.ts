import { NextResponse } from 'next/server';

import { ensureWorkerAuthAccount } from '@/lib/worker-auth';

const POST = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body?.['email'] ?? '').trim();
    const name = String(body?.['name'] ?? '').trim();
    const password = String(body?.['password'] ?? '');

    if (email === '' || name === '' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const result = await ensureWorkerAuthAccount({ email, name, password });
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
};

export { POST };
