'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import { isHoliday } from '@/lib/holidays-query';

interface UserDetail {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  client_code: string;
  medical_conditions: string[] | null;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  is_active: boolean;
}

interface AssignmentDetailRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  users: UserDetail | null;
}

export default function WorkerAssignmentDetail(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const currentUser = user;
  const [row, setRow] = useState<AssignmentDetailRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Obtener el tramo horario específico desde los parámetros de la URL
  const specificSlot = useMemo(() => {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (start !== null && end !== null && start !== '' && end !== '') {
      return { start, end };
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const id = params?.id;
        if (!id || typeof id !== 'string') return;
        const email = currentUser?.email ?? '';
        if (email.trim() === '') return;

        const { data: w, error: werr } = await supabase
          .from('workers')
          .select('id')
          .ilike('email', email)
          .maybeSingle();
        if (werr !== null || w === null) return;

        const { data, error } = await supabase
          .from('assignments')
          .select(
            `
            id,
            assignment_type,
            schedule,
            start_date,
            end_date,
            notes,
            users!inner(
              id,
              name,
              surname,
              email,
              phone,
              address,
              postal_code,
              city,
              client_code,
              medical_conditions,
              emergency_contact,
              is_active
            )
          `
          )
          .eq('id', id)
          .eq('worker_id', w.id)
          .single();
        if (error === null) setRow(data as unknown as AssignmentDetailRow);
      } finally {
        setLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [params?.id, currentUser?.email]);

  // Verificar si el servicio ya está completado
  useEffect(() => {
    const checkCompletionStatus = async (): Promise<void> => {
      if (
        row?.id === null ||
        row?.id === undefined ||
        currentUser?.id === null ||
        currentUser?.id === undefined
      )
        return;

      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: doneRows } = await supabase
          .from('system_activities')
          .select('id')
          .eq('activity_type', 'service_completed')
          .eq('entity_type', 'assignment')
          .eq('entity_id', row.id)
          .eq('user_id', currentUser.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .limit(1);

        setIsCompleted((doneRows?.length ?? 0) > 0);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error checking completion status:', error);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    checkCompletionStatus();
  }, [row?.id, currentUser?.id]);

  const dayKey = useMemo(() => {
    const d = new Date();
    const dow = d.getDay();
    return (
      [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][dow] ?? 'monday'
    );
  }, []);

  const [useHolidayDay, setUseHolidayDay] = useState<boolean>(false);
  useEffect(() => {
    const check = async (): Promise<void> => {
      const now = new Date();
      const dow = now.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const holiday = await isHoliday(
        now.getDate(),
        now.getMonth() + 1,
        now.getFullYear()
      );
      setUseHolidayDay(isWeekend || holiday);
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    check();
  }, []);

  const getFirstSlot = (
    schedule: unknown
  ): { start: string; end: string } | null => {
    try {
      const sc =
        typeof schedule === 'string'
          ? (JSON.parse(schedule) as Record<string, unknown>)
          : (schedule as Record<string, unknown>);
      const dayConfig = (sc?.[dayKey] as Record<string, unknown>) ?? {};
      const enabled = (dayConfig?.['enabled'] as boolean) ?? true;
      if (!enabled) return null;
      const slots = Array.isArray(dayConfig?.['timeSlots'])
        ? (dayConfig['timeSlots'] as unknown[])
        : [];
      const first = slots[0] as { start?: string; end?: string } | undefined;
      const startRaw = first?.start ?? '';
      const endRaw = first?.end ?? '';
      const timeOk = (t: string): boolean => /^\d{1,2}:\d{2}$/.test(t);
      if (timeOk(startRaw) && timeOk(endRaw)) {
        const pad = (t: string) =>
          t
            .split(':')
            .map((p, i) => (i === 0 ? p.padStart(2, '0') : p))
            .join(':');
        return { start: pad(startRaw), end: pad(endRaw) };
      }
    } catch {
      // noop
    }
    return null;
  };

  const getSlotForToday = (
    schedule: unknown
  ): { start: string; end: string } | null => {
    const primary = getFirstSlot(schedule);
    if (primary !== null) return primary;
    if (!useHolidayDay) return null;
    try {
      const sc =
        typeof schedule === 'string'
          ? (JSON.parse(schedule) as Record<string, unknown>)
          : (schedule as Record<string, unknown>);
      const hcfg = (sc?.['holiday_config'] as Record<string, unknown>) ?? {};
      const slots = (
        Array.isArray(hcfg?.['holiday_timeSlots'])
          ? (hcfg['holiday_timeSlots'] as unknown[])
          : []
      ) as Array<Record<string, unknown>>;
      const first = slots[0];
      const startRaw = (first?.['start'] as string | undefined) ?? '';
      const endRaw = (first?.['end'] as string | undefined) ?? '';
      const timeOk = (t: string): boolean => /^\d{1,2}:\d{2}$/.test(t);
      if (timeOk(startRaw) && timeOk(endRaw)) {
        const pad = (t: string) =>
          t
            .split(':')
            .map((p, i) => (i === 0 ? p.padStart(2, '0') : p))
            .join(':');
        return { start: pad(startRaw), end: pad(endRaw) };
      }
    } catch {
      // noop
    }
    return null;
  };

  const formatAssignmentType = (type: string): string => {
    switch (type) {
      case 'laborables':
        return 'Laborables';
      case 'festivos':
        return 'Festivos';
      case 'flexible':
        return 'Flexible';
      default:
        return type;
    }
  };

  const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // Función para obtener el tramo horario a mostrar
  const getDisplaySlot = (): { start: string; end: string } | null => {
    // Si tenemos un tramo específico desde la URL, usarlo
    if (specificSlot !== null) {
      return specificSlot;
    }

    // Si no, usar el primer tramo del día (fallback)
    if (row?.schedule !== null && row?.schedule !== undefined) {
      return getSlotForToday(row.schedule);
    }

    return null;
  };

  // Función para marcar el servicio como completado
  const handleCompleteService = async (): Promise<void> => {
    if (
      row?.id === null ||
      row?.id === undefined ||
      currentUser?.id === null ||
      currentUser?.id === undefined ||
      isCompleting
    )
      return;

    setIsCompleting(true);
    try {
      // Registrar la actividad en system_activities
      const { error: activityError } = await supabase
        .from('system_activities')
        .insert({
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: currentUser.name,
          activity_type: 'service_completed',
          entity_type: 'assignment',
          entity_id: row.id,
          entity_name:
            `${row.users?.name ?? ''} ${row.users?.surname ?? ''}`.trim() ??
            'Servicio',
          description: `Servicio completado por ${currentUser.name ?? currentUser.email}`,
          details: {
            assignment_type: row.assignment_type,
            user_name:
              `${row.users?.name ?? ''} ${row.users?.surname ?? ''}`.trim(),
            user_code: row.users?.client_code,
            completed_at: new Date().toISOString(),
            slot: getDisplaySlot(),
          },
        });

      if (activityError !== null) {
        throw new Error(
          `Error registrando actividad: ${activityError.message}`
        );
      }

      // Marcar como completado localmente
      setIsCompleted(true);

      // Mostrar mensaje de éxito
      // eslint-disable-next-line no-alert
      alert('✅ Servicio marcado como completado exitosamente');

      // Redirigir al dashboard después de un breve delay
      setTimeout(() => {
        router.push('/worker-dashboard');
      }, 1500);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error completando servicio:', error);
      // eslint-disable-next-line no-alert
      alert(
        '❌ Error al marcar el servicio como completado. Inténtalo de nuevo.'
      );
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole='worker'>
      <div className='min-h-screen bg-gray-50'>
        {/* Header */}
        <div className='bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-4xl mx-auto px-4 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <button
                  onClick={() => router.back()}
                  className='p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
                >
                  <svg
                    className='w-5 h-5'
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
                </button>
                <h1 className='text-xl font-bold text-gray-900'>
                  Detalle del Servicio
                </h1>
              </div>
              <div className='flex items-center space-x-2'>
                <span className='text-sm text-gray-500'>
                  {row?.users?.client_code ?? 'Sin código'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='max-w-4xl mx-auto px-4 py-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
                <p className='text-gray-600'>
                  Cargando detalles del servicio...
                </p>
              </div>
            </div>
          ) : row === null ? (
            <div className='text-center py-12'>
              <div className='text-gray-400 mb-4'>
                <svg
                  className='w-16 h-16 mx-auto'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1}
                    d='M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Servicio no encontrado
              </h3>
              <p className='text-gray-600 mb-4'>
                El servicio que buscas no existe o no tienes permisos para
                verlo.
              </p>
              <Button variant='outline' onClick={() => router.back()}>
                Volver al Dashboard
              </Button>
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Información del Usuario */}
              <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
                <div className='bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-6 h-6 text-white'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className='text-xl font-bold text-white'>
                        {`${row.users?.name ?? ''} ${row.users?.surname ?? ''}`.trim() ??
                          'Usuario'}
                      </h2>
                      <p className='text-blue-100 text-sm'>
                        Código: {row.users?.client_code ?? 'Sin código'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='p-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Información de Contacto */}
                    <div className='space-y-4'>
                      <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                        <svg
                          className='w-5 h-5 text-blue-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                          />
                        </svg>
                        <span>Información de Contacto</span>
                      </h3>

                      <div className='space-y-3'>
                        <div className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'>
                          <svg
                            className='w-5 h-5 text-gray-400'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                            />
                          </svg>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              {row.users?.phone ?? 'No disponible'}
                            </p>
                            <p className='text-xs text-gray-500'>Teléfono</p>
                          </div>
                        </div>

                        {row.users?.email !== null &&
                          row.users?.email !== '' &&
                          row.users?.email !== undefined && (
                            <div className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'>
                              <svg
                                className='w-5 h-5 text-gray-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                                />
                              </svg>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {row.users?.email}
                                </p>
                                <p className='text-xs text-gray-500'>Email</p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className='space-y-4'>
                      <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                        <svg
                          className='w-5 h-5 text-green-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                          />
                        </svg>
                        <span>Dirección</span>
                      </h3>

                      <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
                        <p className='text-sm font-medium text-gray-900 mb-1'>
                          {row.users?.address}
                        </p>
                        <p className='text-sm text-gray-600'>
                          {row.users?.postal_code} {row.users?.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del Servicio */}
              <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
                <div className='bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-6 h-6 text-white'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className='text-xl font-bold text-white'>
                        Detalles del Servicio
                      </h2>
                      <p className='text-purple-100 text-sm'>
                        {formatAssignmentType(row.assignment_type)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='p-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Horario de Hoy */}
                    <div className='space-y-4'>
                      <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                        <svg
                          className='w-5 h-5 text-amber-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        <span>Horario de Hoy</span>
                      </h3>

                      {(() => {
                        const slot = getDisplaySlot();
                        if (slot === null) {
                          return (
                            <div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
                              <p className='text-gray-500 text-center'>
                                No hay servicio programado para hoy
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className='p-4 bg-amber-50 border border-amber-200 rounded-lg'>
                            <div className='text-center'>
                              <p className='text-2xl font-bold text-amber-800'>
                                {slot.start} - {slot.end}
                              </p>
                              <p className='text-sm text-amber-600 mt-1'>
                                Horario del servicio
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Período del Servicio */}
                    <div className='space-y-4'>
                      <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                        <svg
                          className='w-5 h-5 text-blue-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                          />
                        </svg>
                        <span>Período del Servicio</span>
                      </h3>

                      <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                        <div className='space-y-2'>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              Inicio
                            </p>
                            <p className='text-sm text-blue-700'>
                              {formatDate(row.start_date)}
                            </p>
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              Fin
                            </p>
                            <p className='text-sm text-blue-700'>
                              {row.end_date !== null &&
                              row.end_date !== undefined
                                ? formatDate(row.end_date)
                                : 'Sin fecha de fin'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Médica y de Emergencia */}
              {((row.users?.medical_conditions !== null &&
                row.users?.medical_conditions !== undefined &&
                row.users.medical_conditions.length > 0) ||
                (row.users?.emergency_contact !== null &&
                  row.users?.emergency_contact !== undefined)) && (
                <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
                  <div className='bg-gradient-to-r from-red-600 to-red-700 px-6 py-4'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                        <svg
                          className='w-6 h-6 text-white'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className='text-xl font-bold text-white'>
                          Información Importante
                        </h2>
                        <p className='text-red-100 text-sm'>
                          Condiciones médicas y contacto de emergencia
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='p-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      {/* Condiciones Médicas */}
                      {row.users?.medical_conditions &&
                        row.users.medical_conditions.length > 0 && (
                          <div className='space-y-4'>
                            <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                              <svg
                                className='w-5 h-5 text-red-600'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                />
                              </svg>
                              <span>Condiciones Médicas</span>
                            </h3>

                            <div className='space-y-2'>
                              {row.users.medical_conditions?.map(
                                (condition, index) => (
                                  <div
                                    key={index}
                                    className='p-3 bg-red-50 border border-red-200 rounded-lg'
                                  >
                                    <p className='text-sm text-red-800'>
                                      {condition}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Contacto de Emergencia */}
                      {row.users?.emergency_contact && (
                        <div className='space-y-4'>
                          <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                            <svg
                              className='w-5 h-5 text-orange-600'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                              />
                            </svg>
                            <span>Contacto de Emergencia</span>
                          </h3>

                          <div className='p-4 bg-orange-50 border border-orange-200 rounded-lg'>
                            <div className='space-y-2'>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {row.users.emergency_contact.name ??
                                    'No especificado'}
                                </p>
                                <p className='text-xs text-gray-500'>Nombre</p>
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {row.users.emergency_contact.phone ??
                                    'No especificado'}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  Teléfono
                                </p>
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {row.users.emergency_contact.relationship ??
                                    'No especificado'}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  Relación
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notas del Servicio */}
              {row.notes !== null &&
                row.notes !== undefined &&
                row.notes !== '' && (
                  <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
                    <div className='bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4'>
                      <div className='flex items-center space-x-3'>
                        <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                          <svg
                            className='w-6 h-6 text-white'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className='text-xl font-bold text-white'>
                            Notas del Servicio
                          </h2>
                          <p className='text-gray-100 text-sm'>
                            Información adicional importante
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='p-6'>
                      <div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
                        <p className='text-gray-900 whitespace-pre-wrap'>
                          {row.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Botones de Acción */}
              <div className='flex flex-col sm:flex-row gap-3 pt-6'>
                <Button
                  onClick={() => router.back()}
                  variant='outline'
                  className='flex-1 sm:flex-none'
                >
                  <svg
                    className='w-4 h-4 mr-2'
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
                  Volver al Dashboard
                </Button>

                {isCompleted ? (
                  <Button
                    disabled
                    className='flex-1 sm:flex-none bg-green-600 text-white cursor-not-allowed'
                  >
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    ✅ Servicio Completado
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      handleCompleteService();
                    }}
                    disabled={isCompleting}
                    className='flex-1 sm:flex-none bg-green-600 hover:bg-green-700'
                  >
                    {isCompleting ? (
                      <>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                        Completando...
                      </>
                    ) : (
                      <>
                        <svg
                          className='w-4 h-4 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                        Marcar como Completado
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
