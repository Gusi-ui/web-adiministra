import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { logger } from '@/utils/logger';

// Headers CORS para permitir peticiones desde la app móvil
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler para preflight requests (OPTIONS)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          data: null,
          error: 'Email y contraseña son requeridos',
          status: 400,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Autenticar con Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return NextResponse.json(
        {
          data: null,
          error: 'Credenciales inválidas',
          status: 401,
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Obtener datos del worker
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        {
          data: null,
          error: 'Worker no encontrado',
          status: 404,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        data: {
          token: authData.session?.access_token,
          refresh_token: authData.session?.refresh_token,
          worker: {
            id: worker.id,
            email: worker.email,
            name: worker.name,
            role: worker.role,
          },
        },
        error: null,
        status: 200,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      {
        data: null,
        error: 'Error interno del servidor',
        status: 500,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
