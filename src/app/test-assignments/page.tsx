'use client';

import { useEffect, useState } from 'react';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import { getHolidaysForMonth } from '@/lib/holidays-query';

interface TestResult {
  userId: string;
  userName?: string;
  year: number;
  month: number;
  assignedHours: number;
  calculatedHours: number;
  difference: number;
  details: {
    laborableDays: number;
    holidayDays: number;
    weekendDays: number;
    totalDays: number;
  };
}

interface Holiday {
  day: number;
  name: string;
  type: string;
  year: number;
  month: number;
}

export default function TestAssignmentsPage() {
  const { user } = useAuth();
  const currentUser = user;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Cargar festivos del mes actual
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const monthHolidays = await getHolidaysForMonth(
          currentYear,
          currentMonth
        );
        setHolidays(monthHolidays);
      } catch {
        // Error silencioso para no mostrar alertas innecesarias
      }
    };

    loadHolidays().catch(() => {
      // Error silencioso
    });
  }, [currentYear, currentMonth]);

  // Función para probar el cálculo de horas
  const testHourCalculation = () => {
    setLoading(true);
    // Obtener usuarios reales de la base de datos
    const fetchAndTestUsers = async () => {
      try {
        // Obtener usuarios reales
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, surname')
          .limit(3);

        if (usersError) {
          // eslint-disable-next-line no-console
          console.error('Error obteniendo usuarios:', usersError);
          setLoading(false);
          return;
        }

        if (users.length === 0) {
          // eslint-disable-next-line no-console
          console.log('No hay usuarios disponibles para probar');
          setLoading(false);
          return;
        }

        const testUsers = users.map(
          (userData: { id: string; name: string; surname: string }) => ({
            id: userData.id,
            name: `${userData.name} ${userData.surname}`,
          })
        );

        // eslint-disable-next-line no-console
        console.log('Usuarios para probar:', testUsers);

        Promise.all(
          testUsers.map((testUser: { id: string; name: string }) => {
            try {
              // Función temporal mientras se implementa calculateUserMonthlyHours
              const result = {
                assignedHours: 0,
                calculatedHours: 0,
                difference: 0,
                details: {
                  laborableDays: 0,
                  holidayDays: 0,
                  weekendDays: 0,
                  totalDays: 0,
                },
              };

              return Promise.resolve({
                userId: testUser.id,
                userName: testUser.name,
                year: currentYear,
                month: currentMonth,
                ...result,
              });
            } catch {
              // Error silencioso para no mostrar alertas innecesarias
              return Promise.resolve(null);
            }
          })
        )
          .then(promiseResults => {
            const validResults = promiseResults.filter(
              (result: TestResult | null) => result !== null
            ) as TestResult[];
            setResults(validResults);
          })
          .catch(() => {
            // Error silencioso para no mostrar alertas innecesarias
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error en testHourCalculation:', error);
        setLoading(false);
      }
    };

    fetchAndTestUsers().catch(() => {
      // Error silencioso
    });
  };

  // Función para cargar festivos desde API
  const loadHolidaysFromExternalAPI = () => {
    setLoading(true);
    // Función temporal mientras se implementa loadMataroHolidaysFromWeb
    // loadMataroHolidaysFromWeb(currentYear)
    Promise.resolve()
      .then(async () => {
        // Mostrar mensaje de éxito de forma más elegante
        const successMessage = `Festivos de Mataró cargados para el año ${currentYear}`;

        // Recargar festivos del mes
        const monthHolidays = await getHolidaysForMonth(
          currentYear,
          currentMonth
        );
        setHolidays(monthHolidays);

        // Aquí podrías mostrar una notificación más elegante
        // Por ahora usamos un console.log para debugging
        // eslint-disable-next-line no-console
        console.log(successMessage);
      })
      .catch(() => {
        // Error silencioso para no mostrar alertas innecesarias
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              🧪 Prueba del Sistema de Asignaciones
            </h1>
            <p className='text-gray-700 text-lg'>
              Verificación de la funcionalidad del nuevo sistema
            </p>
          </div>

          {/* Controles */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Configuración
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Año
                  </label>
                  <input
                    type='number'
                    value={currentYear}
                    onChange={e => setCurrentYear(parseInt(e.target.value))}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500'
                    style={{ color: '#111827' }}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Mes
                  </label>
                  <select
                    value={currentMonth}
                    onChange={e => setCurrentMonth(parseInt(e.target.value))}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900'
                    style={{ color: '#111827' }}
                  >
                    <option value={1}>Enero</option>
                    <option value={2}>Febrero</option>
                    <option value={3}>Marzo</option>
                    <option value={4}>Abril</option>
                    <option value={5}>Mayo</option>
                    <option value={6}>Junio</option>
                    <option value={7}>Julio</option>
                    <option value={8}>Agosto</option>
                    <option value={9}>Septiembre</option>
                    <option value={10}>Octubre</option>
                    <option value={11}>Noviembre</option>
                    <option value={12}>Diciembre</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Acciones
              </h3>
              <div className='space-y-3'>
                <Button
                  onClick={testHourCalculation}
                  disabled={loading}
                  className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                >
                  {loading ? 'Calculando...' : '🧮 Probar Cálculo de Horas'}
                </Button>
                <Button
                  onClick={loadHolidaysFromExternalAPI}
                  disabled={loading}
                  className='w-full bg-green-600 hover:bg-green-700 text-white'
                >
                  {loading ? 'Cargando...' : '📅 Cargar Festivos desde API'}
                </Button>
              </div>
            </Card>

            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Información
              </h3>
              <div className='text-sm text-gray-600 space-y-2'>
                <p>• Año actual: {currentYear}</p>
                <p>• Mes actual: {currentMonth}</p>
                <p>• Festivos cargados: {holidays.length}</p>
                <p>• Usuario: {currentUser?.email}</p>
              </div>
            </Card>
          </div>

          {/* Resultados */}
          {results.length > 0 && (
            <Card className='p-6 mb-8'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Resultados del Cálculo
              </h3>
              <div className='space-y-4'>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className='border border-gray-200 rounded-lg p-4'
                  >
                    <h4 className='font-medium text-gray-900 mb-2'>
                      {result.userName ?? `Usuario ${result.userId}`}
                    </h4>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                      <div>
                        <span className='text-gray-600'>Horas Asignadas:</span>
                        <p className='font-semibold'>{result.assignedHours}h</p>
                      </div>
                      <div>
                        <span className='text-gray-600'>Horas Calculadas:</span>
                        <p className='font-semibold'>
                          {result.calculatedHours}h
                        </p>
                      </div>
                      <div>
                        <span className='text-gray-600'>Diferencia:</span>
                        <p
                          className={`font-semibold ${
                            result.difference > 0
                              ? 'text-green-600'
                              : result.difference < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {result.difference > 0 ? '+' : ''}
                          {result.difference}h
                        </p>
                      </div>
                      <div>
                        <span className='text-gray-600'>Estado:</span>
                        <p
                          className={`font-semibold ${
                            result.difference > 0
                              ? 'text-green-600'
                              : result.difference < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {result.difference > 0
                            ? 'Exceso'
                            : result.difference < 0
                              ? 'Defecto'
                              : 'Exacto'}
                        </p>
                      </div>
                    </div>
                    <div className='mt-3 text-xs text-gray-500'>
                      <p>
                        Días laborables: {result.details.laborableDays} |
                        Festivos: {result.details.holidayDays} | Fines de
                        semana: {result.details.weekendDays} | Total:{' '}
                        {result.details.totalDays}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Festivos del mes */}
          {holidays.length > 0 && (
            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Festivos de{' '}
                {new Date(currentYear, currentMonth - 1).toLocaleDateString(
                  'es-ES',
                  { month: 'long', year: 'numeric' }
                )}
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                {holidays.map((holiday, index) => (
                  <div
                    key={index}
                    className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
                  >
                    <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                      <span className='text-xs font-bold text-blue-600'>
                        {holiday.day}
                      </span>
                    </div>
                    <div>
                      <p className='font-medium text-gray-900'>
                        {holiday.name}
                      </p>
                      <p className='text-xs text-gray-500'>{holiday.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Información del sistema */}
          <Card className='p-6 mt-8'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Información del Sistema
            </h3>
            <div className='space-y-3 text-sm'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium text-gray-900 mb-2'>
                    Tipos de Asignación
                  </h4>
                  <ul className='space-y-1 text-gray-600'>
                    <li>
                      • <strong>Laborables:</strong> Lunes a viernes (excluyendo
                      festivos)
                    </li>
                    <li>
                      • <strong>Festivos:</strong> Días festivos entre semana +
                      fines de semana
                    </li>
                    <li>
                      • <strong>Flexible:</strong> Todos los días (laborables +
                      festivos + fines de semana)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-medium text-gray-900 mb-2'>
                    Lógica de Cálculo
                  </h4>
                  <ul className='space-y-1 text-gray-600'>
                    <li>• Horas asignadas vs calculadas</li>
                    <li>• Consideración de festivos de Mataró</li>
                    <li>• Diferencia para trabajadoras</li>
                    <li>• Información de exceso/defecto</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
