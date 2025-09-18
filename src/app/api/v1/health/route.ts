import { NextResponse } from 'next/server';

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

export async function GET() {
  return NextResponse.json(
    {
      data: {
        status: 'ok',
        message: 'API v1 funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      error: null,
      status: 200,
    },
    { headers: corsHeaders }
  );
}
