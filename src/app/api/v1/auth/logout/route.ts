import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
    }

    return NextResponse.json({
      data: { message: 'Sesión cerrada exitosamente' },
      error: null,
      status: 200,
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      {
        data: null,
        error: 'Error cerrando sesión',
        status: 500,
      },
      { status: 500 }
    );
  }
}
