'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users?: { name: string | null; surname: string | null } | null;
}

// Lista de servicios por tramos con prioridad por estado y hora
const TomorrowServicesList = (props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getTomorrowSlots: (
    schedule: unknown,
    assignmentType: string,
    useHoliday: boolean
  ) => Array<{ start: string; end: string }>;
}): React.JSX.Element => {
  const { assignments, getTomorrowSlots } = props;

  const isHoliday = new Date().getDay() === 6; // Mañana es domingo si hoy es sábado
  type Row = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
    startMinutes: number;
    state: 'pending' | 'inprogress' | 'done';
  };

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  };

  const rows: Row[] = assignments.flatMap(a => {
    const slots = getTomorrowSlots(a.schedule, a.assignment_type, isHoliday);
    const label =
      `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';
    return slots.map(s => {
      const sm = toMinutes(s.start);
      return {
        assignmentId: a.id,
        userLabel: label,
        start: s.start,
        end: s.end,
        startMinutes: sm,
        state: 'pending' as const,
      };
    });
  });

  // Ordenar por hora de inicio
  rows.sort((a, b) => a.startMinutes - b.startMinutes);

  const badgeClassByState: Record<Row['state'], string> = {
    pending: 'bg-white/80 text-amber-800 ring-1 ring-amber-300',
    inprogress: 'bg-white/80 text-green-800 ring-1 ring-green-300',
    done: 'bg-white/80 text-rose-800 ring-1 ring-rose-300',
  };
  const containerClassByState: Record<Row['state'], string> = {
    pending: 'bg-amber-100 border-amber-300 shadow-sm hover:bg-amber-50',
    inprogress: 'bg-green-100 border-green-300 shadow-sm hover:bg-green-50',
    done: 'bg-rose-100 border-rose-300 shadow-sm hover:bg-rose-50',
  };

  return (
    <div className='space-y-3'>
      {rows.map((r, idx) => (
        <div
          key={`${r.assignmentId}-${r.start}-${r.end}-${idx}`}
          className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 md:p-6 rounded-2xl border text-gray-900 ${containerClassByState[r.state]}`}
        >
          <div className='flex items-start md:items-center gap-4'>
            <div className='w-10 h-10 md:w-12 md:h-12 bg-white text-blue-700 rounded-full flex items-center justify-center ring-2 ring-blue-200 shadow-sm'>
              <span className='font-bold'>{idx + 1}</span>
            </div>
            <div>
              <h3 className='text-base md:text-lg font-semibold text-gray-900 leading-tight'>
                {r.userLabel}
              </h3>
              <p className='mt-1 text-sm text-gray-700'>
                <span className='font-medium text-gray-900'>{r.start}</span>
                <span className='mx-1 text-gray-500'>a</span>
                <span className='font-medium text-gray-900'>{r.end}</span>
              </p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClassByState[r.state]}`}
              >
                Programado
              </span>
            </div>
          </div>
          <Link
            href={`/worker-dashboard/assignment/${r.assignmentId}?start=${r.start}&end=${r.end}`}
          >
            <Button
              size='sm'
              variant='outline'
              className='self-start md:self-auto'
            >
              Ver Detalles
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default function TomorrowPage(): React.JSX.Element {
  const { user } = useAuth();
  const currentUser = user;
  const [tomorrowAssignments, setTomorrowAssignments] = useState<
    AssignmentRow[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);

  type TimeSlotRange = { start: string; end: string };

  const getTomorrowSlots = useCallback(
    (
      schedule: unknown,
      assignmentType: string,
      useHoliday: boolean
    ): TimeSlotRange[] => {
      try {
        const sc =
          typeof schedule === 'string'
            ? (JSON.parse(schedule) as Record<string, unknown>)
            : (schedule as Record<string, unknown>);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay();
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[tomorrowDay] ?? 'monday';

        const parseSlots = (raw: unknown[]): TimeSlotRange[] =>
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
            .filter((v): v is TimeSlotRange => v !== null);

        // Tramos del día normal
        const dayConfig = (sc?.[dayName] as Record<string, unknown>) ?? {};
        const enabled = (dayConfig?.['enabled'] as boolean) ?? true;
        const daySlotsRaw = Array.isArray(dayConfig?.['timeSlots'])
          ? (dayConfig['timeSlots'] as unknown[])
          : [];
        const daySlots = enabled ? parseSlots(daySlotsRaw) : [];

        // Festivos
        const holidayDay = (sc?.['holiday'] as Record<string, unknown>) ?? {};
        const holidayDayRaw = Array.isArray(holidayDay?.['timeSlots'])
          ? (holidayDay['timeSlots'] as unknown[])
          : [];
        const holidayCfg =
          (sc?.['holiday_config'] as Record<string, unknown> | undefined) ??
          undefined;
        const holidayCfgRaw = Array.isArray(holidayCfg?.['holiday_timeSlots'])
          ? (holidayCfg?.['holiday_timeSlots'] as unknown[])
          : [];
        const holidaySlots = parseSlots(
          holidayCfgRaw.length > 0 ? holidayCfgRaw : holidayDayRaw
        );

        const type = (assignmentType ?? '').toLowerCase();
        const mustUseHoliday = useHoliday || type === 'festivos';
        if (mustUseHoliday && holidaySlots.length > 0) return holidaySlots;
        if (daySlots.length > 0) return daySlots;
        return holidaySlots;
      } catch {
        return [];
      }
    },
    []
  );

  const tomorrowKey = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (currentUser?.email === undefined) {
        setTomorrowAssignments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar trabajadora por email
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .ilike('email', currentUser?.email)
          .maybeSingle();

        if (workerError !== null || workerData === null) {
          setTomorrowAssignments([]);
          setLoading(false);
          return;
        }

        const workerId = (workerData as { id: string }).id;

        // Verificar si mañana es festivo
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const { data: holidayData } = await supabase
          .from('holidays')
          .select('id')
          .eq('day', tomorrow.getDate())
          .eq('month', tomorrow.getMonth() + 1)
          .eq('year', tomorrow.getFullYear())
          .maybeSingle();

        const useHoliday = holidayData !== null || tomorrow.getDay() === 0;

        // Obtener todas las asignaciones activas de la trabajadora
        const { data: rows, error: err } = await supabase
          .from('assignments')
          .select(
            `
            id,
            assignment_type,
            schedule,
            start_date,
            end_date,
            users!inner(name, surname)
          `
          )
          .eq('worker_id', workerId)
          .eq('status', 'active');

        if (err === null && rows !== null) {
          const filtered = rows.filter(a => {
            // Verificar si la asignación incluye mañana
            const assignmentStart = new Date(a.start_date);
            const assignmentEnd =
              a.end_date !== null
                ? new Date(a.end_date)
                : new Date('2099-12-31');
            const tomorrowDate = new Date(tomorrowKey ?? '');

            // Si la asignación no incluye mañana, filtrar
            if (
              assignmentEnd.getTime() < tomorrowDate.getTime() ||
              assignmentStart.getTime() > tomorrowDate.getTime()
            ) {
              return false;
            }

            // Verificar si hay slots para mañana
            const slots = getTomorrowSlots(
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
          setTomorrowAssignments(filtered as unknown as AssignmentRow[]);
        } else {
          setTomorrowAssignments([]);
        }
      } finally {
        setLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [getTomorrowSlots, tomorrowKey, currentUser?.email]);

  const formatLongDate = (d: Date): string =>
    d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const tomorrow = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t;
  }, []);

  return (
    <ProtectedRoute requiredRole='worker'>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        {/* Header */}
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
                    Servicios de Mañana
                  </h1>
                  <p className='text-gray-600'>{formatLongDate(tomorrow)}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'>
          <div className='bg-white rounded-2xl shadow-sm'>
            <div className='p-6 border-b border-gray-200'>
              <h2 className='text-xl font-bold text-gray-900'>
                📅 Servicios Programados para Mañana
              </h2>
              <p className='text-gray-600'>
                {tomorrowAssignments.length} servicios programados
              </p>
            </div>
            <div className='p-6'>
              {loading ? (
                <p className='text-gray-600'>Cargando servicios de mañana...</p>
              ) : tomorrowAssignments.length === 0 ? (
                <div className='text-center py-8'>
                  <p className='text-gray-600 mb-4'>
                    No tienes servicios programados para mañana.
                  </p>
                  <Link href='/worker-dashboard'>
                    <Button variant='outline'>Volver al Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <TomorrowServicesList
                  assignments={tomorrowAssignments}
                  getTomorrowSlots={getTomorrowSlots}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
