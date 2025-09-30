import { NextResponse } from 'next/server';
import { getWorkerFromToken } from '@/lib/auth-helpers';
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

export async function GET(request: Request) {
  try {
    const worker = await getWorkerFromToken(request);
    const { searchParams } = new URL(request.url);

    // Filtros opcionales
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('assignments')
      .select(
        `
        *,
        users:user_id (
          id,
          name,
          email
        )
      `
      )
      .eq('worker_id', worker.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: assignments, error, count } = await query;

    if (error) {
      throw new Error(`Error obteniendo asignaciones: ${error.message}`);
    }

    // Transformar datos para coincidir con el formato esperado por la app móvil
    const transformedAssignments =
      assignments?.map(assignment => ({
        id: assignment.id,
        title: `Asignación - ${assignment.users?.name || 'Usuario'}`,
        description: `Servicio del ${assignment.date} de ${assignment.start_time} a ${assignment.end_time}`,
        status: assignment.status,
        priority: 'medium', // Valor por defecto
        worker_id: assignment.worker_id,
        assigned_by: assignment.worker_id, // Temporal
        assigned_at: assignment.created_at,
        due_date: `${assignment.date}T${assignment.end_time}:00.000Z`,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at,
      })) || [];

    return NextResponse.json(
      {
        data: {
          data: transformedAssignments,
          pagination: {
            current_page: page,
            per_page: limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
            has_next: (count || 0) > offset + limit,
            has_prev: page > 1,
          },
        },
        error: null,
        status: 200,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Assignments error:', error);
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'Error obteniendo asignaciones',
        status: 401,
      },
      { status: 401, headers: corsHeaders }
    );
  }
}
