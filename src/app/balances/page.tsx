'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navigation from '@/components/layout/Navigation';
import { AutocompleteInput, Button, Card } from '@/components/ui';
import { useDashboardUrl } from '@/hooks/useDashboardUrl';
import { supabase } from '@/lib/database';
import {
  computeUserMonthlyBalance,
  computeWorkerUsersMonthlyBalances,
  type UserMonthlyBalance,
  type WorkerUserMonthlyBalanceRow,
} from '@/lib/user-calculations';
import { logger } from '@/utils/logger';

export default function BalancesPage() {
  const dashboardUrl = useDashboardUrl();
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(
    today.getMonth() + 1
  ); // 1-12 - Mes actual por defecto
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [workerSuggestions, setWorkerSuggestions] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [balance, setBalance] = useState<UserMonthlyBalance | null>(null);
  const [workerRows, setWorkerRows] = useState<WorkerUserMonthlyBalanceRow[]>(
    []
  );
  // Eliminado loading no usado por ahora (se puede reintroducir con un spinner)
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

  // Función para limpiar filtros
  const clearFilters = (): void => {
    setSelectedWorker('');
    setSelectedUser('');
  };

  // Cargar listas de trabajadoras y usuarios para autocompletado
  useMemo(() => {
    const load = async () => {
      try {
        // Cargar trabajadoras
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('name, surname')
          .eq('is_active', true);

        if (workersError) {
          logger.error('Error cargando trabajadoras:', workersError);
        } else {
          const workers = (workersData ?? [])
            .map(w => `${w.name} ${w.surname}`.trim())
            .filter(name => name !== '');
          setWorkerSuggestions(workers);
        }

        // Cargar usuarios
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('name, surname')
          .eq('is_active', true);

        if (usersError) {
          logger.error('Error cargando usuarios:', usersError);
        } else {
          const users = (usersData ?? [])
            .map(u => `${u.name} ${u.surname}`.trim())
            .filter(name => name !== '');
          setUserSuggestions(users);
        }
      } catch (error) {
        logger.error('Error cargando sugerencias:', error);
      }
    };

    load();
  }, []);

  // Recalcular balance al seleccionar usuario o cambiar mes/año
  useEffect(() => {
    if (selectedUser === '') return;
    setError(null);
    setBalance(null);

    // Buscar el usuario por nombre completo
    const findUserByName = async () => {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true);

      if (error || !userData) return null;

      // Buscar usuario que coincida con el nombre completo
      for (const user of userData) {
        const { data: fullUserData } = await supabase
          .from('users')
          .select('name, surname')
          .eq('id', user.id)
          .single();

        if (fullUserData) {
          const fullName =
            `${fullUserData.name} ${fullUserData.surname}`.trim();
          if (fullName === selectedUser) {
            return user.id;
          }
        }
      }
      return null;
    };

    findUserByName().then(userId => {
      if (userId) {
        computeUserMonthlyBalance(userId, currentYear, currentMonth)
          .then(res => {
            if (res === null)
              setError('No se encontró el usuario o no hay datos para el mes.');
            else setBalance(res);
          })
          .catch(() => setError('Error calculando el balance.'));
      }
    });
  }, [selectedUser, currentYear, currentMonth]);

  // Recalcular tabla por trabajadora cuando cambia selección o mes/año
  useEffect(() => {
    if (selectedWorker === '') {
      setWorkerRows([]);
      return;
    }
    setError(null);
    setWorkerRows([]);

    // Buscar la trabajadora por nombre completo
    const findWorkerByName = async () => {
      const { data: workerData, error } = await supabase
        .from('workers')
        .select('id')
        .eq('is_active', true);

      if (error || !workerData) return null;

      // Buscar trabajadora que coincida con el nombre completo
      for (const worker of workerData) {
        const { data: fullWorkerData } = await supabase
          .from('workers')
          .select('name, surname')
          .eq('id', worker.id)
          .single();

        if (fullWorkerData) {
          const fullName =
            `${fullWorkerData.name} ${fullWorkerData.surname}`.trim();
          if (fullName === selectedWorker) {
            return worker.id;
          }
        }
      }
      return null;
    };

    findWorkerByName().then(workerId => {
      if (workerId) {
        computeWorkerUsersMonthlyBalances(workerId, currentYear, currentMonth)
          .then(rows => setWorkerRows(rows))
          .catch(() => setError('Error calculando balances por trabajadora.'));
      }
    });
  }, [selectedWorker, currentYear, currentMonth]);

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

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen flex flex-col'>
        {/* Header superior con navegación */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                <span className='text-xl'>⏰</span>
              </div>
              <span className='text-lg font-bold text-gray-900'>SAD</span>
            </div>
            <Link
              href={dashboardUrl}
              className='flex items-center text-gray-600 hover:text-gray-900 transition-colors space-x-2'
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
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
              <span className='text-sm font-medium'>Volver al Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Contenido principal */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 flex-1'>
          {/* Títulos */}
          <div className='hidden lg:block mb-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                  ⏰ Balances de Horas
                </h1>
                <p className='text-gray-600 text-lg'>
                  Consolida y revisa los balances mensuales
                </p>
              </div>
            </div>
          </div>

          <div className='lg:hidden mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-1'>
              ⏰ Balances de Horas
            </h1>
            <p className='text-gray-600 text-sm'>
              Consolida y revisa los balances mensuales
            </p>
          </div>

          {/* Selector de mes y filtros */}
          <div className='mb-6'>
            <Card className='p-4'>
              <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
                <div className='flex items-center justify-center lg:justify-start space-x-3 h-12 flex-none'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={goPrevMonth}
                    className='flex items-center space-x-1 px-3 py-2 h-10 text-sm font-medium'
                  >
                    <svg
                      className='w-4 h-4'
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
                    <span className='hidden sm:inline'>Anterior</span>
                  </Button>

                  <h2 className='text-lg lg:text-xl font-bold text-gray-900 text-center'>
                    {monthName} {currentYear}
                  </h2>

                  <Button
                    variant='outline'
                    size='sm'
                    onClick={goNextMonth}
                    className='flex items-center space-x-1 px-3 py-2 h-10 text-sm font-medium'
                  >
                    <span className='hidden sm:inline'>Siguiente</span>
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5l7 7-7 7'
                      />
                    </svg>
                  </Button>
                </div>
                <div className='flex flex-col sm:flex-row gap-2 w-full lg:w-auto'>
                  <div className='flex-1 min-w-[260px]'>
                    <AutocompleteInput
                      id='filter-worker-balances'
                      aria-label='Buscar trabajadora'
                      placeholder='🔍 Buscar trabajadora'
                      value={selectedWorker}
                      onChange={setSelectedWorker}
                      suggestions={workerSuggestions}
                    />
                  </div>
                  <div className='flex-1 min-w-[260px]'>
                    <AutocompleteInput
                      id='filter-user-balances'
                      aria-label='Buscar usuario'
                      placeholder='👤 Buscar usuario'
                      value={selectedUser}
                      onChange={setSelectedUser}
                      suggestions={userSuggestions}
                    />
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='text-xs h-11'
                    onClick={clearFilters}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Resumen */}
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            <Card className='p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
              <div className='flex items-center'>
                <div className='text-2xl mr-3'>⏰</div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Total horas
                  </p>
                  <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                    {balance ? balance.theoreticalMonthlyHours.toFixed(1) : '—'}
                  </p>
                </div>
              </div>
            </Card>
            <Card className='p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
              <div className='flex items-center'>
                <div className='text-2xl mr-3'>✅</div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Horas laborables
                  </p>
                  <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                    {balance?.laborablesMonthlyHours !== undefined
                      ? balance.laborablesMonthlyHours.toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>
            </Card>
            <Card className='p-4 lg:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'>
              <div className='flex items-center'>
                <div className='text-2xl mr-3'>🎯</div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Horas festivos
                  </p>
                  <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                    {balance?.holidaysMonthlyHours !== undefined
                      ? balance.holidaysMonthlyHours.toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>
            </Card>
            <Card className='p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
              <div className='flex items-center'>
                <div className='text-2xl mr-3'>📈</div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Exceso/Defecto
                  </p>
                  <p
                    className={`text-xl lg:text-2xl font-bold ${balance?.difference !== undefined && balance.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {balance ? formatDifference(balance.difference) : '—'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabla y lista responsive */}
          <Card className='overflow-hidden'>
            <div className='px-4 lg:px-6 py-4 border-b border-gray-200'>
              <h3 className='text-lg font-medium text-gray-900'>
                Balances por trabajadora
              </h3>
            </div>
            <div className='overflow-x-auto'>
              {error !== null && (
                <div className='px-4 lg:px-6 py-3 text-red-700 bg-red-50 border-b border-red-200'>
                  {error}
                </div>
              )}
              {balance !== null && (
                <div className='px-4 lg:px-6 py-4 space-y-2'>
                  <p className='text-sm text-gray-700'>
                    Usuario:{' '}
                    <span className='font-semibold'>
                      {selectedUser || 'No seleccionado'}
                    </span>
                  </p>
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                    <Card className='p-4'>
                      <p className='text-xs text-gray-500'>
                        Horas asignadas (perfil)
                      </p>
                      <p className='text-lg font-semibold text-gray-900'>
                        {balance.assignedMonthlyHours.toFixed(1)} h
                      </p>
                    </Card>
                    <Card className='p-4'>
                      <p className='text-xs text-gray-500'>
                        Horas totales (cálculo)
                      </p>
                      <p className='text-lg font-semibold text-gray-900'>
                        {balance.theoreticalMonthlyHours.toFixed(1)} h
                      </p>
                    </Card>
                    <Card className='p-4'>
                      <p className='text-xs text-gray-500'>Diferencia</p>
                      <p
                        className={`text-lg font-semibold ${balance.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {(() => {
                          const totalMinutes = Math.round(
                            Math.abs(balance.difference) * 60
                          );
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          const suffix =
                            balance.difference > 0
                              ? 'de exceso'
                              : balance.difference < 0
                                ? 'de defecto'
                                : '';
                          if (totalMinutes === 0) return 'Sin diferencia';
                          if (h > 0 && m > 0)
                            return `${h} h ${m} min ${suffix}`;
                          if (h > 0) return `${h} h ${suffix}`;
                          return `${m} minutos ${suffix}`;
                        })()}
                      </p>
                    </Card>
                    <Card className='p-4'>
                      <p className='text-xs text-gray-500'>Periodo</p>
                      <p className='text-lg font-semibold text-gray-900 capitalize'>
                        {monthName} {currentYear}
                      </p>
                    </Card>
                  </div>
                </div>
              )}
              {/* Lista móvil (mostrar sólo en < md) */}
              {selectedWorker !== '' && workerRows.length > 0 && (
                <div className='md:hidden px-4 lg:px-6 py-4 space-y-3'>
                  {workerRows.map(row => (
                    <div
                      key={row.userId}
                      className='border border-gray-200 rounded-lg p-3'
                    >
                      <div className='flex items-center justify-between mb-1'>
                        <p className='font-semibold text-gray-900'>
                          {row.userName} {row.userSurname}
                        </p>
                        <span
                          className={`text-sm font-semibold ${row.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}
                        >
                          {formatDifference(row.difference)}
                        </span>
                      </div>
                      <div className='grid grid-cols-2 gap-2 text-sm'>
                        <div className='bg-green-50 border border-green-100 rounded-md px-2 py-1'>
                          <p className='text-[11px] text-gray-600'>
                            Laborables
                          </p>
                          <p className='font-medium text-gray-900'>
                            {row.laborablesHours.toFixed(1)} h
                          </p>
                        </div>
                        <div className='bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1'>
                          <p className='text-[11px] text-gray-600'>Festivos</p>
                          <p className='font-medium text-gray-900'>
                            {row.holidaysHours.toFixed(1)} h
                          </p>
                        </div>
                        <div className='col-span-2 bg-blue-50 border border-blue-100 rounded-md px-2 py-1'>
                          <p className='text-[11px] text-gray-600'>Total</p>
                          <p className='font-semibold text-gray-900'>
                            {row.totalHours.toFixed(1)} h
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabla de escritorio/tablet */}
              <table className='hidden md:table min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Usuario
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Horas laborables
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Horas festivos
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Total
                    </th>
                    <th className='px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {selectedWorker === '' ? (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-4 lg:px-6 py-6 text-center text-sm text-gray-600'
                      >
                        Selecciona una trabajadora para ver el balance por
                        usuario.
                      </td>
                    </tr>
                  ) : workerRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-4 lg:px-6 py-6 text-center text-sm text-gray-600'
                      >
                        No hay usuarios con asignaciones para este mes.
                      </td>
                    </tr>
                  ) : (
                    workerRows.map(row => (
                      <tr key={row.userId}>
                        <td className='px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-900'>
                          {row.userName} {row.userSurname}
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-700'>
                          {row.laborablesHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-700'>
                          {row.holidaysHours.toFixed(1)} h
                        </td>
                        <td className='px-4 lg:px-6 py-3 text-sm text-gray-900 font-medium'>
                          {row.totalHours.toFixed(1)} h
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
          </Card>
        </div>

        {/* Footer y navegación móvil */}
        <footer className='border-t border-gray-200 bg-white py-8 mt-auto mb-20'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <p className='text-sm text-gray-600 mb-2 font-medium'>
                © 2025 SAD - Sistema de Gestión de Servicios Asistenciales
                Domiciliarios
              </p>
              <p className='text-xs text-gray-500'>
                Hecho con mucho ❤️ por{' '}
                <span className='font-bold text-gray-700'>Gusi</span>
              </p>
            </div>
          </div>
        </footer>

        <Navigation variant='mobile' />
      </div>
    </ProtectedRoute>
  );
}
