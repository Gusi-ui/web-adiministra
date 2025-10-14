'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RouteMap from '@/components/route/RouteMap';
import { Button } from '@/components/ui';
import { useDashboardUrl } from '@/hooks/useDashboardUrl';
import useSimpleRouteSegments from '@/hooks/useSimpleRouteSegments';
import { supabase } from '@/lib/database';
import { formatDistance, formatDuration } from '@/lib/real-travel-time';

// Función auxiliar para calcular duración
const calculateDuration = (start: string, end: string): string => {
  const startParts = start.split(':');
  const endParts = end.split(':');

  if (startParts.length < 2 || endParts.length < 2) {
    return 'Duración no disponible';
  }

  const startMinutes =
    parseInt(startParts[0] ?? '0') * 60 + parseInt(startParts[1] ?? '0');
  const endMinutes =
    parseInt(endParts[0] ?? '0') * 60 + parseInt(endParts[1] ?? '0');
  const duration = endMinutes - startMinutes;

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

interface Worker {
  id: string;
  name: string;
  surname: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users?: {
    name: string | null;
    surname: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
  } | null;
}

type RouteStop = {
  assignmentId: string;
  userLabel: string;
  start: string;
  end: string;
  startMinutes: number;
  order: number;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

export default function PlanningRoutesPage() {
  const dashboardUrl = useDashboardUrl();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<
    'DRIVING' | 'WALKING' | 'TRANSIT'
  >('DRIVING');

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  // Cargar lista de trabajadoras
  useEffect(() => {
    const loadWorkers = async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, surname, address, postal_code, city')
        .eq('is_active', true)
        .order('name');

      if (error === null && data !== null) {
        setWorkers(data as Worker[]);
      }
    };

    loadWorkers();
  }, []);

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  };

  const getRouteSlots = useCallback(
    (
      schedule: unknown,
      _assignmentType: string,
      useHoliday: boolean
    ): Array<{ start: string; end: string }> => {
      try {
        const sc =
          typeof schedule === 'string'
            ? (JSON.parse(schedule) as Record<string, unknown>)
            : (schedule as Record<string, unknown>);

        const parseSlots = (
          raw: unknown[]
        ): Array<{
          start: string;
          end: string;
        }> =>
          raw
            .map((s: unknown) => {
              const slot = s as Record<string, unknown>;
              const start = (slot?.['start'] as string | undefined) ?? '';
              const end = (slot?.['end'] as string | undefined) ?? '';
              const ok = (t: string): boolean => /^\d{1,2}:\d{2}$/.test(t);
              if (ok(start) && ok(end)) {
                const pad = (t: string) =>
                  t
                    .split(':')
                    .map((p, i) => (i === 0 ? p.padStart(2, '0') : p))
                    .join(':');
                return { start: pad(start), end: pad(end) };
              }
              return null;
            })
            .filter((v): v is { start: string; end: string } => v !== null);

        if (useHoliday) {
          const holidayDay = (sc?.['holiday'] as Record<string, unknown>) ?? {};
          const holidayEnabled = (holidayDay?.['enabled'] as boolean) ?? false;
          const holidaySlotsRaw = Array.isArray(holidayDay?.['timeSlots'])
            ? (holidayDay['timeSlots'] as unknown[])
            : [];
          return holidayEnabled ? parseSlots(holidaySlotsRaw) : [];
        }

        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay();
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[dayOfWeek] ?? 'monday';

        const dayConfig = (sc?.[dayName] as Record<string, unknown>) ?? {};
        const enabled = (dayConfig?.['enabled'] as boolean) ?? true;
        const daySlotsRaw = Array.isArray(dayConfig?.['timeSlots'])
          ? (dayConfig['timeSlots'] as unknown[])
          : [];
        return enabled ? parseSlots(daySlotsRaw) : [];
      } catch {
        return [];
      }
    },
    [selectedDate]
  );

  // Cargar asignaciones cuando cambia trabajadora o fecha
  useEffect(() => {
    if (selectedWorkerId === '' || selectedDate === '') return;

    const loadAssignments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select(
            `
            id,
            assignment_type,
            schedule,
            start_date,
            end_date,
            users!inner(name, surname, address, postal_code, city)
          `
          )
          .eq('worker_id', selectedWorkerId)
          .eq('status', 'active')
          .lte('start_date', selectedDate)
          .or(`end_date.is.null,end_date.gte.${selectedDate}`);

        if (error === null && data !== null) {
          // Verificar si hoy es festivo
          const date = new Date(selectedDate);
          const { data: holidayData } = await supabase
            .from('holidays')
            .select('id')
            .eq('day', date.getDate())
            .eq('month', date.getMonth() + 1)
            .eq('year', date.getFullYear())
            .maybeSingle();

          const useHoliday = holidayData !== null || date.getDay() === 0;

          const filtered = data.filter(a => {
            const slots = getRouteSlots(
              a.schedule,
              a.assignment_type,
              useHoliday
            );
            if (slots.length === 0) return false;
            const assignmentType =
              typeof a.assignment_type === 'string' ? a.assignment_type : '';
            const t = assignmentType.toLowerCase();
            if (useHoliday) return t === 'festivos' || t === 'flexible';
            return t === 'laborables' || t === 'flexible';
          });

          setAssignments(filtered as unknown as AssignmentRow[]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [selectedWorkerId, selectedDate, getRouteSlots]);

  const isHoliday = useMemo(() => {
    const date = new Date(selectedDate);
    return date.getDay() === 0;
  }, [selectedDate]);

  // Generar paradas de la ruta
  const allRouteStops: RouteStop[] = useMemo(() => {
    const stops = assignments.flatMap(a => {
      const slots = getRouteSlots(a.schedule, a.assignment_type, isHoliday);
      const label =
        `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';

      return slots.map((s, index) => {
        const sm = toMinutes(s.start);
        return {
          assignmentId: a.id,
          userLabel: label,
          start: s.start,
          end: s.end,
          startMinutes: sm,
          order: index + 1,
          address: a.users?.address ?? null,
          postalCode: a.users?.postal_code ?? null,
          city: a.users?.city ?? null,
        };
      });
    });

    stops.sort((a, b) => a.startMinutes - b.startMinutes);
    return stops;
  }, [assignments, getRouteSlots, isHoliday]);

  const workerInfo = useMemo(() => {
    if (!selectedWorker) return null;
    return {
      address: selectedWorker.address ?? null,
      postalCode: selectedWorker.postal_code ?? null,
      city: selectedWorker.city ?? null,
    };
  }, [selectedWorker]);

  // Usar el hook de tiempo real
  const {
    segments: realTimeSegments,
    isLoading: segmentsLoading,
    error: segmentsError,
  } = useSimpleRouteSegments({
    routeStops: allRouteStops,
    workerInfo,
    travelMode,
  });

  // Generar segmentos de viaje
  const travelSegments = useMemo(() => {
    const segments: Array<{
      from: RouteStop;
      to: RouteStop;
      travelTime: number;
      isZeroTravel: boolean;
    }> = [];

    for (let i = 0; i < allRouteStops.length - 1; i++) {
      const currentStop = allRouteStops[i];
      const nextStop = allRouteStops[i + 1];

      if (currentStop !== undefined && nextStop !== undefined) {
        const currentAddress = currentStop.address?.trim() ?? '';
        const nextAddress = nextStop.address?.trim() ?? '';

        const timeBetweenServices =
          nextStop.startMinutes - toMinutes(currentStop.end);
        const isZeroTravel =
          currentAddress === nextAddress && currentAddress !== '';

        segments.push({
          from: currentStop,
          to: nextStop,
          travelTime: isZeroTravel ? 0 : Math.max(0, timeBetweenServices),
          isZeroTravel,
        });
      }
    }

    return segments;
  }, [allRouteStops]);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0] ?? '');
  };

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        {/* Header */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <Link
                  href={dashboardUrl}
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
                    🗺️ Rutas de Trabajadoras
                  </h1>
                  <p className='text-gray-600'>
                    Consulta y planifica las rutas diarias
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {/* Selectores */}
          <div className='bg-white rounded-2xl shadow-sm p-6 mb-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Selector de Trabajadora */}
              <div>
                <label
                  htmlFor='worker-select'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  👥 Seleccionar Trabajadora
                </label>
                <select
                  id='worker-select'
                  value={selectedWorkerId}
                  onChange={e => setSelectedWorkerId(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value=''>-- Selecciona una trabajadora --</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name} {worker.surname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Fecha */}
              <div>
                <label
                  htmlFor='date-select'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  📅 Seleccionar Fecha
                </label>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDateChange(-1)}
                  >
                    ← Anterior
                  </Button>
                  <input
                    type='date'
                    id='date-select'
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDateChange(1)}
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Estado: Sin Selección */}
          {selectedWorkerId === '' && (
            <div className='bg-white rounded-2xl shadow-sm p-12 text-center'>
              <div className='text-6xl mb-4'>👥</div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Selecciona una trabajadora
              </h3>
              <p className='text-gray-600'>
                Elige una trabajadora del menú desplegable para ver su ruta
              </p>
            </div>
          )}

          {/* Estado: Cargando */}
          {selectedWorkerId !== '' && loading && (
            <div className='bg-white rounded-2xl shadow-sm p-12 text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
              <p className='text-gray-600'>Cargando ruta...</p>
            </div>
          )}

          {/* Estado: Sin Servicios */}
          {selectedWorkerId !== '' &&
            !loading &&
            allRouteStops.length === 0 && (
              <div className='bg-white rounded-2xl shadow-sm p-12 text-center'>
                <div className='text-6xl mb-4'>📅</div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Sin servicios programados
                </h3>
                <p className='text-gray-600'>
                  No hay servicios para esta trabajadora en la fecha
                  seleccionada
                </p>
              </div>
            )}

          {/* Ruta */}
          {selectedWorkerId !== '' && !loading && allRouteStops.length > 0 && (
            <div className='space-y-6'>
              {/* Lista de Paradas */}
              <div className='bg-white rounded-2xl shadow-sm p-6'>
                <h2 className='text-lg font-bold text-gray-900 mb-4'>
                  📍 Servicios del Día
                </h2>
                <div className='space-y-4'>
                  {allRouteStops.map((stop, index) => (
                    <div key={`${stop.assignmentId}-${index}`}>
                      {index > 0 && (
                        <div className='flex justify-center mb-4'>
                          <div className='w-0.5 h-8 bg-blue-200'></div>
                        </div>
                      )}

                      <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
                        <div className='flex items-start space-x-4'>
                          <div className='flex-shrink-0'>
                            <div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold'>
                              {index + 1}
                            </div>
                          </div>

                          <div className='flex-1'>
                            <div className='flex items-center justify-between mb-2'>
                              <h3 className='text-lg font-semibold text-gray-900'>
                                {stop.userLabel}
                              </h3>
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                {stop.start} - {stop.end}
                              </span>
                            </div>

                            <div className='flex items-center space-x-4 text-sm text-gray-600'>
                              <div className='flex items-center space-x-1'>
                                <span>🕐</span>
                                <span>
                                  Duración:{' '}
                                  {calculateDuration(stop.start, stop.end)}
                                </span>
                              </div>

                              {index < allRouteStops.length - 1 && (
                                <div className='flex items-center space-x-1'>
                                  <span>🚗</span>
                                  <span>
                                    Viaje:{' '}
                                    {(() => {
                                      const realSegment =
                                        realTimeSegments?.[index];
                                      if (
                                        realSegment &&
                                        realSegment.duration > 0
                                      ) {
                                        return formatDuration(
                                          realSegment.duration
                                        );
                                      }
                                      const segment = travelSegments[index];
                                      if (!segment) return '';
                                      if (segment.isZeroTravel) {
                                        return '0min (mismo domicilio)';
                                      }
                                      return `${segment.travelTime}min`;
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segmentos de Viaje */}
              {travelSegments.length > 0 && (
                <div className='bg-white rounded-2xl shadow-sm p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-lg font-bold text-gray-900'>
                      🗺️ Segmentos de Viaje
                    </h2>
                  </div>

                  {/* Selector de modo de transporte */}
                  <div className='mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200'>
                    <div className='flex flex-wrap gap-3'>
                      {(
                        [
                          { key: 'DRIVING', icon: '🚗', label: 'Coche' },
                          { key: 'WALKING', icon: '🚶', label: 'Andando' },
                          {
                            key: 'TRANSIT',
                            icon: '🚌',
                            label: 'Transporte público',
                          },
                        ] as const
                      ).map(({ key, icon, label }) => (
                        <button
                          key={key}
                          onClick={() => setTravelMode(key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            travelMode === key
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className='mr-2'>{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    {travelSegments.map((segment, index) => {
                      const realSegment = realTimeSegments?.[index];
                      const hasRealTime =
                        realSegment != null && realSegment.duration > 0;
                      const displayTime = hasRealTime
                        ? formatDuration(realSegment.duration)
                        : segment.isZeroTravel
                          ? '0min'
                          : `${segment.travelTime}min`;
                      const displayDistance =
                        hasRealTime && realSegment.distance > 0
                          ? formatDistance(realSegment.distance)
                          : null;

                      return (
                        <div
                          key={index}
                          className={`rounded-lg border p-4 ${
                            segment.isZeroTravel
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center space-x-3 mb-2'>
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full ${
                                    segment.isZeroTravel
                                      ? 'bg-green-500 text-white'
                                      : 'bg-blue-500 text-white'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <h5 className='text-base font-medium text-gray-900'>
                                  {segment.from.userLabel} →{' '}
                                  {segment.to.userLabel}
                                </h5>
                                {segment.isZeroTravel && (
                                  <span className='inline-flex items-center space-x-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full'>
                                    <span>🏠</span>
                                    <span>Mismo domicilio</span>
                                  </span>
                                )}
                              </div>

                              <div className='text-sm text-gray-600'>
                                <div className='flex items-start space-x-2 mb-1'>
                                  <span className='font-medium text-gray-700 w-12'>
                                    Desde:
                                  </span>
                                  <span>
                                    {segment.from.address ?? 'Sin dirección'}
                                  </span>
                                </div>
                                <div className='flex items-start space-x-2'>
                                  <span className='font-medium text-gray-700 w-12'>
                                    Hasta:
                                  </span>
                                  <span>
                                    {segment.to.address ?? 'Sin dirección'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className='flex flex-col items-end space-y-1 ml-4'>
                              <div className='text-center'>
                                <div
                                  className={`text-xl font-bold ${
                                    segment.isZeroTravel
                                      ? 'text-green-600'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  {segmentsLoading ? '⏳' : displayTime}
                                </div>
                                <div className='text-xs text-gray-500'>
                                  {hasRealTime ? 'Tiempo real' : 'Estimado'}
                                </div>
                              </div>
                              {displayDistance != null && (
                                <div className='text-sm text-gray-600'>
                                  📍 {displayDistance}
                                </div>
                              )}
                            </div>
                          </div>

                          {hasRealTime === false &&
                            segment?.isZeroTravel === false &&
                            segmentsError != null && (
                              <div className='mt-3 flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2'>
                                <span>⚠️</span>
                                <span>
                                  Usando tiempo estimado - Error en cálculo real
                                </span>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen Total */}
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <div className='bg-blue-900 rounded-lg p-6'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                            <span className='text-blue-900 font-bold text-lg'>
                              ∑
                            </span>
                          </div>
                          <div>
                            <h5 className='text-white font-semibold text-lg'>
                              Total tiempo de viaje
                            </h5>
                            <p className='text-blue-200 text-sm'>
                              Tiempo entre servicios
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-3xl font-bold text-white'>
                            {(() => {
                              const totalMinutes = travelSegments.reduce(
                                (total, segment, index) => {
                                  const realSegment = realTimeSegments?.[index];
                                  if (
                                    realSegment != null &&
                                    realSegment.duration > 0
                                  ) {
                                    return (
                                      total +
                                      Math.round(realSegment.duration / 60)
                                    );
                                  }
                                  return total + segment.travelTime;
                                },
                                0
                              );
                              return totalMinutes;
                            })()}
                            min
                          </div>
                          <div className='text-blue-200 text-sm'>
                            {(() => {
                              const totalMinutes = travelSegments.reduce(
                                (total, segment, index) => {
                                  const realSegment = realTimeSegments?.[index];
                                  if (
                                    realSegment != null &&
                                    realSegment.duration > 0
                                  ) {
                                    return (
                                      total +
                                      Math.round(realSegment.duration / 60)
                                    );
                                  }
                                  return total + segment.travelTime;
                                },
                                0
                              );
                              return Math.round((totalMinutes / 60) * 10) / 10;
                            })()}
                            h aproximadamente
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mapa */}
              <div className='bg-white rounded-2xl shadow-sm p-6'>
                <h2 className='text-lg font-bold text-gray-900 mb-4'>
                  🗺️ Visualización del Mapa
                </h2>
                <RouteMap routeStops={allRouteStops} workerInfo={workerInfo} />
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
