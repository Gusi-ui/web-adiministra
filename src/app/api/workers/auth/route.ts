import { NextResponse } from 'next/server';

import { ensureWorkerAuthAccount } from '@/lib/worker-auth';

const POST = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // Validación más robusta de entrada
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Formato de datos inválido' },
        { status: 400 }
      );
    }

    const email = String(body?.['email'] ?? '').trim();
    const name = String(body?.['name'] ?? '').trim();
    const password = String(body?.['password'] ?? '');

    // Validación de email con regex básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      );
    }

    if (name === '' || name.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contraseña debe tener al menos 6 caracteres',
        },
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
