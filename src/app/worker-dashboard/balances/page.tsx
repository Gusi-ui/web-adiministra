'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import {
  type UserMonthlyBalance,
  computeUserMonthlyBalance,
} from '@/lib/user-calculations';

type WorkerUserBalanceRow = {
  userId: string;
  userName: string;
  userSurname: string;
  assignedMonthlyHours: number;
  theoreticalMonthlyHours: number;
  laborablesMonthlyHours: number;
  holidaysMonthlyHours: number;
  difference: number;
};

export default function WorkerBalancesPage(): React.JSX.Element {
  const { user } = useAuth();
  const currentUser = user;
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(
    today.getMonth() + 1
  ); // 1-12

  const [rows, setRows] = useState<WorkerUserBalanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long' });
  }, [currentMonth, currentYear]);

  const goPrevMonth = (): void => {
    const d = new Date(currentYear, currentMonth - 2, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };
  const goNextMonth = (): void => {
    const d = new Date(currentYear, currentMonth, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  const formatDifference = (diff: number): string => {
    const totalMinutes = Math.round(Math.abs(diff) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const suffix = diff > 0 ? 'de exceso' : diff < 0 ? 'de defecto' : '';
    if (totalMinutes === 0) return 'Sin diferencia';
    if (h > 0 && m > 0) return `${h} h ${m} min ${suffix}`;
    if (h > 0) return `${h} h ${suffix}`;
    return `${m} minutos ${suffix}`;
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (currentUser?.email === undefined) return;
      setLoading(true);
      setError(null);
      try {
        // 1) Obtener workerId por email
        const { data: wdata, error: werr } = await supabase
          .from('workers')
          .select('id')
          .ilike('email', currentUser?.email)
          .maybeSingle();
        if (werr !== null || wdata === null) {
          setRows([]);
          setLoading(false);
          return;
        }
        const workerId =
          typeof wdata.id === 'string' ? wdata.id : String(wdata.id);

        // 2) Obtener usuarios asignados a esta trabajadora en el mes (para listarlos)
        const start = new Date(currentYear, currentMonth - 1, 1)
          .toISOString()
          .split('T')[0];
        const end = new Date(currentYear, currentMonth, 0)
          .toISOString()
          .split('T')[0];
        const { data: arows, error: aerr } = await supabase
          .from('assignments')
          .select('user_id')
          .eq('worker_id', workerId)
          .eq('status', 'active')
          .lte('start_date', end)
          .or(`end_date.is.null,end_date.gte.${start}`);
        if (aerr !== null || arows === null) {
          setRows([]);
          setLoading(false);
          return;
        }
        const userIds = Array.from(
          new Set(
            (arows as Array<{ user_id: string | null }>)
              .map(r => r.user_id)
              .filter((v): v is string => typeof v === 'string' && v.length > 0)
          )
        );

        if (userIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // 3) Cargar nombres de usuarios
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, surname')
          .in('id', userIds);
        const userInfo = new Map<string, { name: string; surname: string }>();
        for (const u of usersData ?? []) {
          const id = (u as { id: string }).id;
          const name = (u as { name: string | null }).name ?? '';
          const surname = (u as { surname: string | null }).surname ?? '';
          userInfo.set(id, { name, surname });
        }

        // 4) Para cada usuario, calcular balance mensual global (no por trabajadora)
        const balances: Array<{ id: string; bal: UserMonthlyBalance | null }> =
          [];
        const computed = await Promise.all(
          userIds.map(uid =>
            computeUserMonthlyBalance(uid, currentYear, currentMonth).then(
              bal => ({ id: uid, bal })
            )
          )
        );
        balances.push(...computed);

        const outRows: WorkerUserBalanceRow[] = balances
          .map(({ id, bal }) => {
            const info = userInfo.get(id) ?? { name: '', surname: '' };
            if (bal === null) {
              return {
                userId: id,
                userName: info.name,
                userSurname: info.surname,
                assignedMonthlyHours: 0,
                theoreticalMonthlyHours: 0,
                laborablesMonthlyHours: 0,
                holidaysMonthlyHours: 0,
                difference: 0,
              };
            }
            return {
              userId: id,
              userName: info.name,
              userSurname: info.surname,
              assignedMonthlyHours: bal.assignedMonthlyHours,
              theoreticalMonthlyHours: bal.theoreticalMonthlyHours,
              laborablesMonthlyHours: bal.laborablesMonthlyHours ?? 0,
              holidaysMonthlyHours: bal.holidaysMonthlyHours ?? 0,
              difference: bal.difference,
            };
          })
          .sort((a, b) =>
            `${a.userName} ${a.userSurname}`.localeCompare(
              `${b.userName} ${b.userSurname}`,
              'es'
            )
          );

        setRows(outRows);
      } catch {
        setError('Error cargando balances');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser?.email, currentYear, currentMonth]);

  const totals = useMemo(() => {
    const assigned = rows.reduce((a, r) => a + r.assignedMonthlyHours, 0);
    const total = rows.reduce((a, r) => a + r.theoreticalMonthlyHours, 0);
    const diff = total - assigned;
    return { assigned, total, diff };
  }, [rows]);

  return (
    <ProtectedRoute requiredRole='worker'>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-16'>
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <Link
                  href='/worker-dashboard'
                  className='text-gray-600 hover:text-gray-900'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                </Link>
                <div>
                  <h1 className='text-xl font-bold text-gray-900'>
                    ⏱️ Balance de horas
                  </h1>
                  <p className='text-gray-600'>
                    {monthName} {currentYear}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className='w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8'>
          <div className='mb-4 relative flex items-center'>
            {/* Botón anterior - posicionamiento absoluto en móvil */}
            <Button
              variant='outline'
              onClick={goPrevMonth}
              className='absolute left-0 z-10 px-3 py-2 sm:px-4 sm:py-2 sm:static'
            >
              <span className='hidden sm:inline'>← Mes anterior</span>
              <span className='sm:hidden'>⬅️</span>
            </Button>

            {/* Título centrado */}
            <h2 className='flex-1 text-center text-lg sm:text-xl font-bold text-gray-900 capitalize whitespace-nowrap sm:flex-none sm:mx-2'>
              {monthName} {currentYear}
            </h2>

            {/* Botón siguiente - posicionamiento absoluto en móvil */}
            <Button
              variant='outline'
              onClick={goNextMonth}
              className='absolute right-0 z-10 px-3 py-2 sm:px-4 sm:py-2 sm:static'
            >
              <span className='hidden sm:inline'>Mes siguiente →</span>
              <span className='sm:hidden'>➡️</span>
            </Button>
          </div>

          {/* Resumen agregado */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6'>
            <Card className='p-4 bg-blue-50 border-blue-200'>
              <p className='text-xs text-gray-600'>Usuarios asignados</p>
              <p className='text-xl font-bold text-gray-900'>{rows.length}</p>
            </Card>
            <Card className='p-4 bg-green-50 border-green-200'>
              <p className='text-xs text-gray-600'>Horas totales (teóricas)</p>
              <p className='text-xl font-bold text-gray-900'>
                {totals.total.toFixed(1)} h
              </p>
            </Card>
            <Card className='p-4 bg-purple-50 border-purple-200'>
              <p className='text-xs text-gray-600'>Exceso/Defecto</p>
              <p
                className={`text-xl font-bold ${totals.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}
              >
                {formatDifference(totals.diff)}
              </p>
            </Card>
          </div>

          {error !== null && (
            <div className='mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm'>
              {error}
            </div>
          )}

          {/* Lista móvil */}
          <div className='md:hidden space-y-3'>
            {loading ? (
              <Card className='p-4'>Cargando…</Card>
            ) : rows.length === 0 ? (
              <Card className='p-4'>No hay usuarios asignados este mes.</Card>
            ) : (
              rows.map(row => (
                <Card key={row.userId} className='p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <p className='font-semibold text-gray-900'>
                      {row.userName} {row.userSurname}
                    </p>
                    <span
                      className={`text-sm font-semibold ${row.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {formatDifference(row.difference)}
                    </span>
                  </div>
                  {/* Layout diferente para móviles y desktop */}
                  <div className='hidden sm:grid sm:grid-cols-2 gap-2 text-sm'>
                    <div className='bg-green-50 border border-green-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Laborables</p>
                      <p className='font-medium text-gray-900'>
                        {row.laborablesMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                    <div className='bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Festivos</p>
                      <p className='font-medium text-gray-900'>
                        {row.holidaysMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                    <div className='col-span-2 bg-blue-50 border border-blue-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Teóricas</p>
                      <p className='font-semibold text-gray-900'>
                        {row.theoreticalMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                  </div>

                  {/* Layout para móviles con información completa */}
                  <div className='sm:hidden grid grid-cols-2 gap-2 text-sm'>
                    <div className='bg-green-50 border border-green-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Laborables</p>
                      <p className='font-medium text-gray-900'>
                        {row.laborablesMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                    <div className='bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Festivos</p>
                      <p className='font-medium text-gray-900'>
                        {row.holidaysMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                    <div className='bg-blue-50 border border-blue-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Teóricas</p>
                      <p className='font-semibold text-gray-900'>
                        {row.theoreticalMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                    <div className='bg-purple-50 border border-purple-100 rounded-md px-2 py-1'>
                      <p className='text-[11px] text-gray-600'>Asignadas</p>
                      <p className='font-medium text-gray-900'>
                        {row.assignedMonthlyHours.toFixed(1)} h
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Tabla md+ */}
          <div className='hidden md:block'>
            <div className='overflow-x-auto border border-gray-200 rounded-lg bg-white'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Usuario
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Laborables
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Festivos
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Teóricas
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Asignadas
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Exceso/Defecto
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className='px-4 lg:px-6 py-6 text-center text-sm text-gray-600'
                      >
                        Cargando…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className='px-4 lg:px-6 py-6 text-center text-sm text-gray-600'
                      >
                        No hay usuarios asignados este mes.
                      </td>
                    </tr>
                  ) : (
                    rows.map(row => (
                      <tr key={row.userId}>
                        <td className='px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-900'>
                          {row.userName} {row.userSurname}
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-700'>
                          {row.laborablesMonthlyHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-700'>
                          {row.holidaysMonthlyHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-900 font-medium'>
                          {row.theoreticalMonthlyHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-700'>
                          {row.assignedMonthlyHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm font-semibold'>
                          <span
                            className={
                              row.difference >= 0
                                ? 'text-green-700'
                                : 'text-red-700'
                            }
                          >
                            {formatDifference(row.difference)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
