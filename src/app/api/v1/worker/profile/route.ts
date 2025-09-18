import { NextResponse } from 'next/server';
import { getWorkerFromToken } from '@/lib/auth-helpers';
import { supabase } from '@/lib/database';
import { logger } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const worker = await getWorkerFromToken(request);

    return NextResponse.json({
      data: {
        id: worker.id,
        email: worker.email,
        name: worker.name,
        role: worker.role,
        created_at: worker.created_at,
        updated_at: worker.updated_at,
      },
      error: null,
      status: 200,
    });
  } catch (error) {
    logger.error('Profile error:', error);
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error ? error.message : 'Error obteniendo perfil',
        status: 401,
      },
      { status: 401 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const worker = await getWorkerFromToken(request);
    const updates = await request.json();

    const { data: updatedWorker, error } = await supabase
      .from('workers')
      .update({
        name: updates.name || worker.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', worker.id)
      .select()
      .single();

    if (error) {
      throw new Error('Error actualizando perfil');
    }

    return NextResponse.json({
      data: updatedWorker,
      error: null,
      status: 200,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error ? error.message : 'Error actualizando perfil',
        status: 400,
      },
      { status: 400 }
    );
  }
}
