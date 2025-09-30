import { NextResponse } from 'next/server';
import { getWorkerFromToken } from '@/lib/auth-helpers';
import { supabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const worker = await getWorkerFromToken(request);
    const { id } = await params;

    const { data: assignment, error } = await supabase
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
      .eq('id', id)
      .eq('worker_id', worker.id)
      .single();

    if (error || !assignment) {
      return NextResponse.json(
        {
          data: null,
          error: 'Asignación no encontrada',
          status: 404,
        },
        { status: 404 }
      );
    }

    // Transformar datos
    const transformedAssignment = {
      id: assignment.id,
      title: `Asignación - ${assignment.users?.name || 'Usuario'}`,
      description: `Servicio del ${assignment.date} de ${assignment.start_time} a ${assignment.end_time}`,
      status: assignment.status,
      priority: 'medium',
      worker_id: assignment.worker_id,
      assigned_by: assignment.worker_id,
      assigned_at: assignment.created_at,
      due_date: `${assignment.date}T${assignment.end_time}:00.000Z`,
      address: assignment.users?.name || 'Dirección no disponible',
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
    };

    return NextResponse.json({
      data: transformedAssignment,
      error: null,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'Error obteniendo asignación',
        status: 401,
      },
      { status: 401 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const worker = await getWorkerFromToken(request);
    const { id } = await params;
    const { status } = await request.json();

    const { data: assignment, error } = await supabase
      .from('assignments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('worker_id', worker.id)
      .select()
      .single();

    if (error) {
      throw new Error('Error actualizando asignación');
    }

    return NextResponse.json({
      data: assignment,
      error: null,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'Error actualizando asignación',
        status: 400,
      },
      { status: 400 }
    );
  }
}
