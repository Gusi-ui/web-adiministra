import { NextResponse } from 'next/server';
import { getWorkerFromToken } from '@/lib/auth-helpers';
import { supabase } from '@/lib/database';

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

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Por ahora, crear datos mock de balances basados en asignaciones
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('worker_id', worker.id)
      .eq('status', 'completed')
      .order('date', { ascending: false });

    if (error) {
      throw new Error('Error obteniendo datos para balances');
    }

    // Agrupar asignaciones por mes para crear balances
    const balancesByMonth = new Map();

    assignments?.forEach(assignment => {
      const date = new Date(assignment.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!balancesByMonth.has(monthKey)) {
        balancesByMonth.set(monthKey, {
          assignments: [],
          totalHours: 0,
        });
      }

      const monthData = balancesByMonth.get(monthKey);
      monthData.assignments.push(assignment);

      // Calcular horas (simplificado)
      const startTime = new Date(`2000-01-01T${assignment.start_time}`);
      const endTime = new Date(`2000-01-01T${assignment.end_time}`);
      const hours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      monthData.totalHours += hours;
    });

    // Convertir a formato de balances
    const balances = Array.from(balancesByMonth.entries()).map(
      ([monthKey, data], index) => {
        const [year, month] = monthKey.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0)
          .toISOString()
          .split('T')[0];
        const baseRate = 15; // €15 por hora base
        const totalAmount = data.totalHours * baseRate;

        return {
          id: `balance-${monthKey}-${worker.id}`,
          worker_id: worker.id,
          period_start: startDate,
          period_end: endDate,
          base_salary: totalAmount,
          overtime_hours: 0,
          overtime_rate: 0,
          bonuses: 0,
          deductions: 0,
          total_amount: totalAmount,
          status: index === 0 ? 'pending' : 'paid',
          assignments_completed: data.assignments.length,
          routes_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          paid_at: index === 0 ? null : new Date().toISOString(),
        };
      }
    );

    const paginatedBalances = balances.slice(offset, offset + limit);

    return NextResponse.json(
      {
        data: {
          data: paginatedBalances,
          pagination: {
            current_page: page,
            per_page: limit,
            total: balances.length,
            total_pages: Math.ceil(balances.length / limit),
            has_next: balances.length > offset + limit,
            has_prev: page > 1,
          },
        },
        error: null,
        status: 200,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Balances error:', error);
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error ? error.message : 'Error obteniendo balances',
        status: 401,
      },
      { status: 401, headers: corsHeaders }
    );
  }
}
