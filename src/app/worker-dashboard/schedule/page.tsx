'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';
import {
  getMonthRange,
  getNextWeekRange,
  getWeekRange,
} from '@/lib/date-utils';

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users?: { name: string | null; surname: string | null } | null;
}
// Componente para mostrar el horario semanal
const WeeklySchedule = (props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getScheduleSlots: (
    schedule: unknown,
    assignmentType: string,
    date: Date
  ) => Array<{ start: string; end: string }>;
  weekStart: Date;
  weekEnd: Date;
  holidaySet?: ReadonlySet<string>;
}): React.JSX.Element => {
  const { assignments, getScheduleSlots, weekStart, weekEnd, holidaySet } =
    props;
  type TimeSlot = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
    startMinutes: number;
    date: string;
    dayName: string;
  };
  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  };
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  // Función para verificar si una fecha es festivo (solo desde BD)
  // Función para verificar si una fecha es festivo (solo desde BD)
  const isKnownHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet?.has(dateKey) ?? false;
  };
  // Función para verificar si una trabajadora debe trabajar en una fecha específica
  const shouldWorkOnDate = (date: Date, assignmentType: string): boolean => {
    const dayOfWeek = date.getDay();
    const type = assignmentType.toLowerCase();
    // Domingo (0) y Sábado (6)
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isHoliday = holidaySet?.has(dateKey) === true || isKnownHoliday(date);
    // Lógica según tipo de trabajadora
    switch (type) {
      case 'laborables':
        // Solo trabaja lunes a viernes, NO festivos
        return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
      case 'festivos':
        // Solo trabaja festivos y fines de semana (sábado y domingo)
        return isSaturday || isSunday || isHoliday;
      case 'flexible':
        // Trabaja todos los días
        return true;
      case 'daily':
        // Trabaja todos los días
        return true;
      default:
        // Por defecto, solo días laborables
        return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
    }
  };
  // Generar slots para toda la semana
  const allSlots: TimeSlot[] = assignments.flatMap(a => {
    const label =
      `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';
    const slots: TimeSlot[] = [];
    const current = new Date(weekStart);
    while (current.getTime() <= weekEnd.getTime()) {
      const currentDate = new Date(current);
      // Verificar si la trabajadora debe trabajar en esta fecha
      const assignmentType = a.assignment_type ?? '';
      if (!shouldWorkOnDate(currentDate, assignmentType)) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      const daySlots = getScheduleSlots(
        a.schedule,
        a.assignment_type,
        currentDate
      );
      // Solo agregar servicios si hay slots para este día
      if (daySlots.length > 0) {
        daySlots.forEach(s => {
          const sm = toMinutes(s.start);
          const dateStr = currentDate.toISOString().split('T')[0] ?? '';
          slots.push({
            assignmentId: a.id,
            userLabel: label,
            start: s.start,
            end: s.end,
            startMinutes: sm,
            date: dateStr,
            dayName: formatDate(dateStr),
          });
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return slots;
  });
  // Ordenar por fecha y luego por hora
  allSlots.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startMinutes - b.startMinutes;
  });
  // Agrupar por día
  const groupedByDay = allSlots.reduce<Record<string, TimeSlot[]>>(
    (acc, slot) => {
      if (!(slot.date in acc)) {
        acc[slot.date] = [];
      }
      const array = acc[slot.date];
      if (array !== undefined) {
        array.push(slot);
      }
      return acc;
    },
    {}
  );
  const dayNames = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  return (
    <div className='space-y-4 sm:space-y-6'>
      {dayNames.map((dayName, index) => {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + index);
        const dateKey = currentDate.toISOString().split('T')[0];
        const daySlots = groupedByDay[dateKey ?? ''] ?? [];
        return (
          <div key={dayName} className='bg-gray-50 rounded-xl p-3 sm:p-4'>
            <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3'>
              <span className='block sm:inline'>{dayName}</span>
              <span className='block sm:inline text-sm sm:text-base font-normal text-gray-600 sm:ml-2'>
                {currentDate.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </h3>
            {daySlots.length === 0 ? (
              <div className='text-center py-4'>
                <p className='text-gray-500 italic text-sm sm:text-base'>
                  Sin servicios programados
                </p>
              </div>
            ) : (
              <div className='space-y-2 sm:space-y-3'>
                {daySlots.map((slot, slotIndex) => {
                  // Lógica simple de colores basada en la fecha
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  const serviceDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate()
                  );

                  // Determinar colores y textos de estado
                  const nowMinutes = now.getHours() * 60 + now.getMinutes();
                  const startMinutes = toMinutes(slot.start);
                  const endMinutes = toMinutes(slot.end);

                  const isPastDay = serviceDate < today;
                  const isFutureDay = serviceDate > today;
                  const isToday = !isPastDay && !isFutureDay;
                  const isInProgress =
                    isToday &&
                    nowMinutes >= startMinutes &&
                    nowMinutes < endMinutes;
                  const isCompleted = isToday && nowMinutes >= endMinutes;

                  const bgColor = isPastDay
                    ? 'bg-rose-100 border-rose-300'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'bg-amber-100 border-amber-300'
                      : isInProgress
                        ? 'bg-green-100 border-green-300'
                        : 'bg-rose-100 border-rose-300';

                  const badgeText = isPastDay
                    ? 'Completado'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'Pendiente'
                      : isInProgress
                        ? 'En curso'
                        : 'Completado';

                  const badgeColor = isPastDay
                    ? 'bg-white/80 text-rose-800 ring-1 ring-rose-300'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'bg-white/80 text-amber-800 ring-1 ring-amber-300'
                      : isInProgress
                        ? 'bg-white/80 text-green-800 ring-1 ring-green-300'
                        : 'bg-white/80 text-rose-800 ring-1 ring-rose-300';

                  return (
                    <div
                      key={`${slot.assignmentId}-${slot.start}-${slot.end}-${slotIndex}`}
                      className={`${bgColor} rounded-lg p-3 sm:p-4 border shadow-sm hover:bg-opacity-80`}
                    >
                      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
                        <div className='flex-1'>
                          <p className='font-medium text-gray-900 text-sm sm:text-base'>
                            {slot.userLabel}
                          </p>
                          <p className='text-xs sm:text-sm text-gray-600'>
                            {slot.start} - {slot.end}
                          </p>
                        </div>
                        <div className='flex justify-end sm:text-right'>
                          <span
                            className={`inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
// Componente de lista móvil para vista de mes
const MobileMonthList = (props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getScheduleSlots: (
    schedule: unknown,
    assignmentType: string,
    date: Date
  ) => Array<{ start: string; end: string }>;
  monthStart: Date;
  monthEnd: Date;
  holidaySet?: ReadonlySet<string>;
}): React.JSX.Element => {
  const { assignments, getScheduleSlots, monthStart, monthEnd, holidaySet } =
    props;

  // Función auxiliar para convertir hora a minutos
  const toMinutes = (timeStr: string): number => {
    const [hours = 0, minutes = 0] = timeStr
      .split(':')
      .map(v => Number(v ?? 0));
    return hours * 60 + minutes;
  };

  // Función para verificar si una fecha es festivo
  const isKnownHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet?.has(dateKey) ?? false;
  };

  const shouldWorkOnDate = (date: Date, assignmentType: string): boolean => {
    const dayOfWeek = date.getDay();
    const type = (assignmentType ?? '').toLowerCase();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);

    if (type === 'laborables')
      return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
    if (type === 'festivos')
      return dayOfWeek === 0 || dayOfWeek === 6 || isHoliday;
    if (type === 'flexible' || type === 'daily') return true;
    return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
  };

  const getDateKeyLocal = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const firstDayOfMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1,
    12,
    0,
    0
  );
  const lastDayOfMonth = new Date(
    monthEnd.getFullYear(),
    monthEnd.getMonth(),
    monthEnd.getDate(),
    12,
    0,
    0
  );
  const daysInMonth = lastDayOfMonth.getDate();

  type ExpandedEntry = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
  };

  // Generar días con servicios
  const daysWithServices: Array<{
    date: Date;
    key: string;
    isHoliday: boolean;
    entries: ExpandedEntry[];
  }> = [];

  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(firstDayOfMonth);
    date.setDate(firstDayOfMonth.getDate() + i);
    const key = getDateKeyLocal(date);
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);
    const entries: ExpandedEntry[] = [];
    for (const a of assignments) {
      const aStart = new Date(a.start_date);
      const aEnd =
        a.end_date !== null ? new Date(a.end_date) : new Date('2099-12-31');
      if (date < aStart || date > aEnd) continue;
      if (!shouldWorkOnDate(date, a.assignment_type ?? '')) continue;

      const slots = getScheduleSlots(a.schedule, a.assignment_type, date);
      if (slots.length > 0) {
        const userLabel =
          `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() ||
          'Servicio';
        slots.forEach(s => {
          entries.push({
            assignmentId: a.id,
            userLabel,
            start: s.start,
            end: s.end,
          });
        });
      }
    }

    if (entries.length > 0) {
      // Ordenar entradas por hora de inicio
      entries.sort((a, b) => {
        const timeA = a.start.replace(':', '');
        const timeB = b.start.replace(':', '');
        return timeA.localeCompare(timeB);
      });
      daysWithServices.push({ date, key, isHoliday, entries });
    }
  }

  return (
    <div>
      <div className='mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>Este Mes</h3>
        <p className='text-base text-gray-600'>
          Desde {firstDayOfMonth.toLocaleDateString('es-ES')} hasta{' '}
          {lastDayOfMonth.toLocaleDateString('es-ES')}
        </p>
      </div>

      {daysWithServices.length === 0 ? (
        <div className='text-center py-8'>
          <div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
            <span className='text-2xl'>📅</span>
          </div>
          <p className='text-gray-600 mb-4'>
            No tienes servicios programados este mes.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {daysWithServices.map(day => (
            <div
              key={day.key}
              className='bg-white border rounded-lg p-4 shadow-sm'
            >
              <div className='flex items-center justify-between mb-3'>
                <h4 className='font-semibold text-gray-900'>
                  {day.date.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </h4>
                {day.isHoliday && (
                  <span className='text-red-600 text-sm'>🎉 Festivo</span>
                )}
              </div>
              <div className='space-y-2'>
                {day.entries.map((entry, i) => {
                  // Determinar colores y textos de estado
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  const serviceDate = new Date(
                    day.date.getFullYear(),
                    day.date.getMonth(),
                    day.date.getDate()
                  );

                  const nowMinutes = now.getHours() * 60 + now.getMinutes();
                  const startMinutes = toMinutes(entry.start);
                  const endMinutes = toMinutes(entry.end);

                  const isPastDay = serviceDate < today;
                  const isFutureDay = serviceDate > today;
                  const isToday = !isPastDay && !isFutureDay;
                  const isInProgress =
                    isToday &&
                    nowMinutes >= startMinutes &&
                    nowMinutes < endMinutes;
                  const isCompleted = isToday && nowMinutes >= endMinutes;

                  const bgColor = isPastDay
                    ? 'bg-rose-100 border-rose-300'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'bg-amber-100 border-amber-300'
                      : isInProgress
                        ? 'bg-green-100 border-green-300'
                        : 'bg-rose-100 border-rose-300';

                  const badgeText = isPastDay
                    ? 'Completado'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'Pendiente'
                      : isInProgress
                        ? 'En curso'
                        : 'Completado';

                  const badgeColor = isPastDay
                    ? 'bg-white/80 text-rose-800 ring-1 ring-rose-300'
                    : isFutureDay || (isToday && !isInProgress && !isCompleted)
                      ? 'bg-white/80 text-amber-800 ring-1 ring-amber-300'
                      : isInProgress
                        ? 'bg-white/80 text-green-800 ring-1 ring-green-300'
                        : 'bg-white/80 text-rose-800 ring-1 ring-rose-300';

                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border-l-4 shadow-sm ${bgColor}`}
                    >
                      <span className='font-medium text-sm text-gray-700'>
                        {entry.userLabel}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}
                      >
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente Modal para mostrar servicios del día
const DayServicesModal = (props: {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  services: Array<{
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
  }>;
  dayStatus?: 'pending' | 'inprogress' | 'completed';
}): React.JSX.Element => {
  const { isOpen, onClose, date, services, dayStatus = 'pending' } = props;

  if (!isOpen) return <div />;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={onClose}
      />
      <div className='relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-4 md:p-6 max-h-96 md:max-h-[60vh] overflow-y-auto'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-lg font-semibold bg-blue-600 text-white px-3 py-2 rounded-lg shadow-sm'>
            {date.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors'
          >
            ✕
          </button>
        </div>
        <div className='space-y-2'>
          {services.length === 0 ? (
            <div className='p-4 bg-gray-50 rounded-lg border border-gray-200 text-center'>
              <p className='text-gray-600 font-medium'>
                No hay servicios programados
              </p>
              <p className='text-sm text-gray-500 mt-1'>Este día está libre</p>
            </div>
          ) : (
            services.map((service, index) => {
              // Aplicar colores tenues si el día está completado
              const isCompletedDay = dayStatus === 'completed';
              const isInProgressDay = dayStatus === 'inprogress';
              const isPendingDay = dayStatus === 'pending';

              let serviceClasses = 'p-3 rounded border-l-4';
              let userLabelClasses =
                'font-semibold px-2 py-1 rounded shadow-sm inline-block mb-1';
              let timeClasses = 'text-sm font-medium';

              if (isCompletedDay) {
                // Días completados: rojo pastel (igual que tomorrow)
                serviceClasses += ' bg-rose-100 border-rose-300';
                userLabelClasses += ' text-rose-800 bg-white/80';
                timeClasses += ' text-rose-800';
              } else if (isInProgressDay) {
                // Días en progreso: verde (igual que tomorrow)
                serviceClasses += ' bg-green-100 border-green-300';
                userLabelClasses += ' text-green-800 bg-white/80';
                timeClasses += ' text-green-800';
              } else if (isPendingDay) {
                // Días pendientes: amarillo (igual que tomorrow)
                serviceClasses += ' bg-amber-100 border-amber-300';
                userLabelClasses += ' text-amber-800 bg-white/80';
                timeClasses += ' text-amber-800';
              } else {
                // Estado por defecto
                serviceClasses += ' bg-blue-50 border-blue-400';
                userLabelClasses += ' text-gray-900 bg-white';
                timeClasses += ' text-gray-700';
              }

              return (
                <div key={index} className={serviceClasses}>
                  <div className={userLabelClasses}>{service.userLabel}</div>
                  <div className={timeClasses}>
                    {service.start} - {service.end}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const WorkerMonthCalendar = (props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getScheduleSlots: (
    schedule: unknown,
    assignmentType: string,
    date: Date
  ) => Array<{ start: string; end: string }>;
  monthStart: Date;
  monthEnd: Date;
  holidaySet?: ReadonlySet<string>;
  isMobile?: boolean;
}): React.JSX.Element => {
  const { assignments, getScheduleSlots, monthStart, monthEnd, holidaySet } =
    props;

  // Estado para el modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      assignmentId: string;
      userLabel: string;
      start: string;
      end: string;
    }>
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Función para verificar si una fecha es festivo (solo desde BD)
  const isKnownHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet?.has(dateKey) ?? false;
  };
  const shouldWorkOnDate = (date: Date, assignmentType: string): boolean => {
    const dayOfWeek = date.getDay();
    const type = (assignmentType ?? '').toLowerCase();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);
    if (type === 'laborables')
      return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
    if (type === 'festivos') return isSaturday || isSunday || isHoliday;
    if (type === 'flexible' || type === 'daily') return true;
    return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
  };
  type ExpandedEntry = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
  };
  const getDateKeyLocal = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  const todayKey = getDateKeyLocal(new Date());

  // Función auxiliar para convertir hora a minutos
  const toMinutes = (timeStr: string): number => {
    const [hours = 0, minutes = 0] = timeStr
      .split(':')
      .map(v => Number(v ?? 0));
    return hours * 60 + minutes;
  };

  // Función para determinar el estado de un día basado en sus servicios
  const getDayStatus = (
    services: ExpandedEntry[],
    date: Date
  ): 'pending' | 'inprogress' | 'completed' => {
    if (services.length === 0) return 'pending';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Si es un día futuro, está pendiente
    if (targetDate > today) return 'pending';

    // Si es un día pasado, asumir que está completado
    if (targetDate < today) {
      return 'completed';
    }

    // Es hoy, determinar el estado basado en los servicios actuales
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let hasInProgress = false;
    let hasPending = false;

    for (const service of services) {
      const startMinutes = toMinutes(service.start);
      const endMinutes = toMinutes(service.end);

      if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
        hasInProgress = true;
      } else if (nowMinutes < startMinutes) {
        hasPending = true;
      }
    }

    if (hasInProgress) return 'inprogress';
    if (hasPending) return 'pending';

    // Todos los servicios de hoy han terminado
    return 'completed';
  };

  // Función para obtener clases CSS basadas en el estado del día
  const getDayClasses = (day: (typeof calendarDays)[0]): string => {
    const baseClasses = [
      'h-16 md:h-20 flex flex-col items-center justify-center p-1 md:p-2 rounded-lg border transition-colors relative',
      day.isCurrentMonth
        ? 'bg-white border-gray-200'
        : 'bg-gray-50 border-gray-100',
      day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : '',
      day.isHoliday || day.isWeekend ? 'border-red-200' : '',
      day.entries.length > 0
        ? 'cursor-pointer hover:bg-blue-50'
        : 'cursor-pointer hover:bg-gray-50',
    ];

    // NO aplicar colores para días completados en la rejilla
    // (para evitar confusión con festivos que son rojos)
    // Solo mantener colores para días en progreso y pendientes
    if (day.status === 'inprogress') {
      // Días en progreso: verde
      baseClasses.push('bg-green-100 border-green-300');
    } else if (day.status === 'pending' && day.entries.length > 0) {
      // Días pendientes con servicios: amarillo
      baseClasses.push('bg-amber-100 border-amber-300');
    }
    // Días completados no tienen colores especiales en la rejilla

    return baseClasses.filter(Boolean).join(' ');
  };

  // Función para manejar clic en día
  const handleDayClick = (date: Date, services: ExpandedEntry[]) => {
    // Ordenar servicios por hora antes de mostrar el modal
    const sortedServices = [...services].sort((a, b) => {
      const timeA = a.start.replace(':', '');
      const timeB = b.start.replace(':', '');
      return timeA.localeCompare(timeB);
    });
    setSelectedDate(date);
    setSelectedServices(sortedServices);
    setIsModalOpen(true);
  };

  const firstDayOfMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1,
    12,
    0,
    0
  );
  const lastDayOfMonth = new Date(
    monthEnd.getFullYear(),
    monthEnd.getMonth(),
    monthEnd.getDate(),
    12,
    0,
    0
  );

  // Para calendario convencional, necesitamos incluir días de semanas anteriores y posteriores
  const startOfCalendar = new Date(firstDayOfMonth);
  const dayOfWeek = firstDayOfMonth.getDay();
  // Ajustar para que lunes sea 0 (lunes = 1 en getDay())
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfCalendar.setDate(firstDayOfMonth.getDate() - daysToSubtract);

  const endOfCalendar = new Date(lastDayOfMonth);
  const lastDayOfWeek = lastDayOfMonth.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endOfCalendar.setDate(lastDayOfMonth.getDate() + daysToAdd);

  // Crear grid de 6 semanas (42 días)
  const calendarDays: Array<{
    date: Date;
    key: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    entries: ExpandedEntry[];
    status: 'pending' | 'inprogress' | 'completed';
  }> = [];
  const totalDays =
    Math.ceil(
      (endOfCalendar.getTime() - startOfCalendar.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startOfCalendar);
    date.setDate(startOfCalendar.getDate() + i);
    const key = getDateKeyLocal(date);
    const isCurrentMonth = date.getMonth() === monthStart.getMonth();
    const isToday = key === todayKey;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);

    const entries: ExpandedEntry[] = [];
    if (isCurrentMonth) {
      for (const a of assignments) {
        const aStart = new Date(a.start_date);
        const aEnd =
          a.end_date !== null ? new Date(a.end_date) : new Date('2099-12-31');
        if (date < aStart || date > aEnd) continue;
        if (!shouldWorkOnDate(date, a.assignment_type ?? '')) continue;
        const slots = getScheduleSlots(a.schedule, a.assignment_type, date);
        if (slots.length > 0) {
          const userLabel =
            `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() ||
            'Servicio';
          slots.forEach(s => {
            entries.push({
              assignmentId: a.id,
              userLabel,
              start: s.start,
              end: s.end,
            });
          });
        }
      }
    }

    // Ordenar entradas por hora de inicio
    entries.sort((a, b) => {
      const timeA = a.start.replace(':', '');
      const timeB = b.start.replace(':', '');
      return timeA.localeCompare(timeB);
    });

    // Determinar el estado del día
    const dayStatus = getDayStatus(entries, date);

    calendarDays.push({
      date,
      key,
      isCurrentMonth,
      isToday,
      isWeekend,
      isHoliday,
      entries,
      status: dayStatus,
    });
  }

  // Dividir en semanas
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  // Mostrar calendario con modal en todas las pantallas
  {
    return (
      <div>
        <div className='mb-4 md:mb-6'>
          <h3 className='text-lg md:text-xl font-semibold text-gray-900 mb-2'>
            📅{' '}
            {firstDayOfMonth.toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className='text-sm md:text-base text-gray-600'>
            Toca un día para ver los servicios
          </p>
        </div>

        {/* Encabezados de días de la semana */}
        <div className='grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-4'>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
            <div key={index} className='text-center py-2 md:py-3'>
              <span className='text-xs md:text-sm font-semibold text-gray-600'>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Grid del calendario */}
        <div className='space-y-1 md:space-y-2'>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className='grid grid-cols-7 gap-1 md:gap-2'>
              {week.map((day, dayIndex) => {
                const dayClasses = getDayClasses(day);

                return (
                  <button
                    key={dayIndex}
                    className={dayClasses}
                    onClick={() => handleDayClick(day.date, day.entries)}
                    disabled={!day.isCurrentMonth}
                  >
                    <span
                      className={`text-sm md:text-base font-medium ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${day.isToday ? 'text-blue-600' : ''}`}
                    >
                      {day.date.getDate()}
                    </span>

                    {/* Indicador de servicios */}
                    {day.entries.length > 0 && (
                      <div className='flex items-center justify-center mt-1'>
                        <div className='w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full'></div>
                        {day.entries.length > 1 && (
                          <span className='text-[10px] md:text-xs text-blue-600 font-medium ml-1'>
                            {day.entries.length}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Indicador de festivo */}
                    {day.isHoliday && (
                      <div className='absolute top-1 right-1'>
                        <span className='text-[8px] md:text-xs'>🎉</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Modal */}
        <DayServicesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          date={selectedDate ?? new Date()}
          services={selectedServices}
          dayStatus={
            selectedDate
              ? getDayStatus(selectedServices, selectedDate)
              : 'pending'
          }
        />
      </div>
    );
  }
};
// Eliminado: Componente mensual previo ya no se usa
/* const MonthlySchedule = (props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getScheduleSlots: (
    schedule: unknown,
    assignmentType: string,
    date: Date
  ) => Array<{ start: string; end: string }>;
  monthStart: Date;
  monthEnd: Date;
  holidaySet?: ReadonlySet<string>;
}): React.JSX.Element => {
  const { assignments, getScheduleSlots, monthStart, monthEnd, holidaySet } =
    props;
  type Row = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
    startMinutes: number;
    date: string;
    dayName: string;
  };
  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  };
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  // Función para verificar si una fecha es festivo (solo desde BD)
  const isKnownHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet?.has(dateKey) ?? false;
  };
  const shouldWorkOnDate = (date: Date, assignmentType: string): boolean => {
    const dayOfWeek = date.getDay();
    const type = assignmentType.toLowerCase();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const isHoliday = holidaySet?.has(dateKey) === true || isKnownHoliday(date);
    switch (type) {
      case 'laborables':
        return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
      case 'festivos':
        return isSaturday || isSunday || isHoliday;
      case 'flexible':
      case 'daily':
        return true;
      default:
        return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
    }
  };
  const rows: Row[] = assignments.flatMap((a) => {
    const label =
      `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';
    const services: Row[] = [];
    const current = new Date(monthStart);
    while (current.getTime() <= monthEnd.getTime()) {
      const currentDate = new Date(current);
      const assignmentType = a.assignment_type ?? '';
      if (!shouldWorkOnDate(currentDate, assignmentType)) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      const slots = getScheduleSlots(
        a.schedule,
        a.assignment_type,
        currentDate
      );
      if (slots.length > 0) {
        slots.forEach((s) => {
          const sm = toMinutes(s.start);
          const dateStr = `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
          ).padStart(
            2,
            '0'
          )}-${String(currentDate.getDate()).padStart(2, '0')}`;
          services.push({
            assignmentId: a.id,
            userLabel: label,
            start: s.start,
            end: s.end,
            startMinutes: sm,
            date: dateStr,
            dayName: formatDate(dateStr),
          });
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return services;
  });
  rows.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startMinutes - b.startMinutes;
  });
  const groupedByWeek = rows.reduce<Record<string, Row[]>>((acc, row) => {
    const date = new Date(row.date);
    const day = date.getDay();
    const monday = new Date(date);
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(
      monday.getDate()
    ).padStart(2, '0')}`;
    (acc[weekKey] ??= []).push(row);
    return acc;
  }, {});
  const formatWeekLabel = (weekStartStr: string): string => {
    const parts = weekStartStr.split('-');
    const rawStart = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      12,
      0,
      0
    );
    const start = new Date(Math.max(rawStart.getTime(), monthStart.getTime()));
    const rawEnd = new Date(rawStart);
    rawEnd.setDate(rawStart.getDate() + 6);
    const end = new Date(Math.min(rawEnd.getTime(), monthEnd.getTime()));
    return `${start.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })} - ${end.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })}`;
  };
  return (
    <div>
      <div className='mb-4 sm:mb-6'>
        <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
          Este Mes
        </h3>
        <p className='text-sm sm:text-base text-gray-600'>
          Desde {monthStart.toLocaleDateString('es-ES')} hasta{' '}
          {monthEnd.toLocaleDateString('es-ES')}
        </p>
      </div>
      {Object.entries(groupedByWeek).map(([weekStartStr, weekRows]) => (
        <div key={weekStartStr} className='space-y-3 mb-6'>
          <h4 className='text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2'>
            Semana del {formatWeekLabel(weekStartStr)}
          </h4>
          {weekRows.map((r, idx) => (
            <div
              key={`${r.assignmentId}-${r.start}-${r.end}-${idx}`}
              className='flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 rounded-xl border text-gray-900 bg-white'
            >
              <div className='flex items-start md:items-center gap-3'>
                <div className='w-8 h-8 md:w-10 md:h-10 bg-white text-blue-700 rounded-full flex items-center justify-center ring-2 ring-blue-200 shadow-sm'>
                  <span className='font-bold text-sm'>{idx + 1}</span>
                </div>
                <div>
                  <h3 className='text-sm md:text-base font-semibold text-gray-900 leading-tight'>
                    {r.userLabel}
                  </h3>
                  <p className='mt-1 text-xs md:text-sm text-gray-700'>
                    <span className='font-medium text-gray-900'>{r.start}</span>
                    <span className='mx-1 text-gray-500'>a</span>
                    <span className='font-medium text-gray-900'>{r.end}</span>
                    <span className='ml-2 text-gray-600'>({r.dayName})</span>
                  </p>
                </div>
              </div>
              <div>
                <span className='inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                  Programado
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}; */
// Calendario mensual estilo Planning para la trabajadora logueada (declaración superior para evitar no-use-before-define)
export default function SchedulePage(): React.JSX.Element {
  const { user } = useAuth();
  const currentUser = user;
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>(
    'week'
  );
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isMobile, setIsMobile] = useState(false);
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
  type TimeSlotRange = { start: string; end: string };
  const getScheduleSlots = useCallback(
    (
      schedule: unknown,
      assignmentType: string,
      date: Date
    ): TimeSlotRange[] => {
      try {
        const sc =
          typeof schedule === 'string'
            ? (JSON.parse(schedule) as Record<string, unknown>)
            : (schedule as Record<string, unknown>);
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
        // Festivos: soportar schedule.holiday.timeSlots y holiday_config.holiday_timeSlots
        const holidayDay = (sc?.['holiday'] as Record<string, unknown>) ?? {};
        const holidayEnabled = (holidayDay?.['enabled'] as boolean) ?? false;
        const holidaySlotsRaw = Array.isArray(holidayDay?.['timeSlots'])
          ? (holidayDay['timeSlots'] as unknown[])
          : [];
        const holidayCfg =
          (sc?.['holiday_config'] as Record<string, unknown> | undefined) ??
          undefined;
        const holidayCfgRaw = Array.isArray(holidayCfg?.['holiday_timeSlots'])
          ? (holidayCfg?.['holiday_timeSlots'] as unknown[])
          : [];
        const combinedHolidayRaw =
          holidayCfgRaw.length > 0 ? holidayCfgRaw : holidaySlotsRaw;
        const parsedHolidaySlots = holidayEnabled
          ? parseSlots(combinedHolidayRaw)
          : parseSlots(combinedHolidayRaw);
        // Determinar qué slots usar: festivos = fines de semana o festivo oficial o tipo 'festivos'
        const dow = date.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const type = (assignmentType ?? '').toLowerCase();
        const dateKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isOfficialHoliday = holidaySet.has(dateKey);
        const mustUseHoliday =
          isWeekend || isOfficialHoliday || type === 'festivos';
        if (mustUseHoliday && parsedHolidaySlots.length > 0)
          return parsedHolidaySlots;
        if (daySlots.length > 0) return daySlots;
        return parsedHolidaySlots;
      } catch {
        // Error parsing schedule
        return [];
      }
    },
    [holidaySet]
  );
  // Calcular rangos de fechas
  const weekRange = useMemo(() => getWeekRange(), []);
  const nextWeekRange = useMemo(() => getNextWeekRange(), []);
  const monthRange = useMemo(() => getMonthRange(), []);
  const monthStartLocal = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
  }, []);
  const monthEndLocal = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0);
  }, []);
  const currentWeekStart = useMemo(
    () => new Date(weekRange.start),
    [weekRange.start]
  );
  const currentWeekEnd = useMemo(
    () => new Date(weekRange.end),
    [weekRange.end]
  );
  const nextWeekStart = useMemo(
    () => new Date(nextWeekRange.start),
    [nextWeekRange.start]
  );
  const nextWeekEnd = useMemo(
    () => new Date(nextWeekRange.end),
    [nextWeekRange.end]
  );
  useEffect(() => {
    const load = async (): Promise<void> => {
      if (currentUser?.email === undefined) {
        setAssignments([]);
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
          setAssignments([]);
          setLoading(false);
          return;
        }
        const workerId = (workerData as { id: string }).id;
        // Cargar festivos para el rango que abarca semana actual, próxima semana y mes restante
        const holidayStart = new Date(
          Math.min(
            new Date(weekRange.start).getTime(),
            new Date(nextWeekRange.start).getTime(),
            new Date(monthRange.start).getTime()
          )
        );
        const holidayEnd = new Date(
          Math.max(
            new Date(weekRange.end).getTime(),
            new Date(nextWeekRange.end).getTime(),
            new Date(monthRange.end).getTime()
          )
        );
        const startYear = holidayStart.getFullYear();
        const endYear = holidayEnd.getFullYear();
        const { data: holidayRows } = await supabase
          .from('holidays')
          .select('day, month, year')
          .gte('year', startYear)
          .lte('year', endYear);
        const hset = new Set<string>();
        (holidayRows ?? []).forEach(row => {
          const r = row as { day: number; month: number; year: number };
          const key = `${r.year}-${String(r.month).padStart(2, '0')}-${String(
            r.day
          ).padStart(2, '0')}`;
          hset.add(key);
        });
        setHolidaySet(hset);
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
            const assignmentType =
              typeof a.assignment_type === 'string' ? a.assignment_type : '';
            const t = assignmentType.toLowerCase();
            return t === 'laborables' || t === 'flexible' || t === 'festivos';
          });
          setAssignments(filtered as unknown as AssignmentRow[]);
        } else {
          setAssignments([]);
        }
      } finally {
        setLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [
    user?.email,
    currentUser?.email,
    weekRange.start,
    weekRange.end,
    nextWeekRange.start,
    nextWeekRange.end,
    monthRange.start,
    monthRange.end,
  ]);

  // Detectar dispositivo móvil y tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Incluir tablets hasta 1024px
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const formatLongDate = (d: Date): string =>
    d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  return (
    <ProtectedRoute requiredRole='worker'>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        {/* Header */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8'>
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
                    Mi Horario Completo
                  </h1>
                  <p className='text-gray-600'>
                    Vista detallada de todos tus servicios
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
          <div className='bg-white rounded-2xl shadow-sm'>
            <div className='p-4 sm:p-6 border-b border-gray-200'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0'>
                <div>
                  <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
                    📅 Horario Detallado
                  </h2>
                  <p className='text-sm sm:text-base text-gray-600'>
                    {assignments.length} asignaciones activas
                  </p>
                </div>
                {/* Selector de período */}
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-0 sm:space-x-2'>
                  <div className='flex space-x-2'>
                    <Button
                      variant={
                        selectedPeriod === 'week' ? 'primary' : 'outline'
                      }
                      size='sm'
                      onClick={() => setSelectedPeriod('week')}
                      className='flex-1 sm:flex-none'
                    >
                      <span className='hidden sm:inline'>Esta Semana</span>
                      <span className='sm:hidden'>Semana</span>
                    </Button>
                    <Button
                      variant={
                        selectedPeriod === 'month' ? 'primary' : 'outline'
                      }
                      size='sm'
                      onClick={() => setSelectedPeriod('month')}
                      className='flex-1 sm:flex-none'
                    >
                      <span className='hidden sm:inline'>Este Mes</span>
                      <span className='sm:hidden'>Mes</span>
                    </Button>
                  </div>

                  {/* Toggle de vista para todas las pantallas en vista de mes */}
                  {selectedPeriod === 'month' && (
                    <div className='flex space-x-2'>
                      <Button
                        variant={
                          viewMode === 'calendar' ? 'primary' : 'outline'
                        }
                        size='sm'
                        onClick={() => setViewMode('calendar')}
                        className='flex-1 sm:flex-none'
                      >
                        📅 Calendario
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'primary' : 'outline'}
                        size='sm'
                        onClick={() => setViewMode('list')}
                        className='flex-1 sm:flex-none'
                      >
                        📋 Lista
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className='w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8'>
              {loading ? (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
                  <p className='text-gray-600 text-sm sm:text-base'>
                    Cargando horario completo...
                  </p>
                </div>
              ) : assignments.length === 0 ? (
                <div className='text-center py-8'>
                  <div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
                    <span className='text-2xl'>📅</span>
                  </div>
                  <p className='text-gray-600 mb-4 text-sm sm:text-base'>
                    No tienes asignaciones activas.
                  </p>
                  <Link href='/worker-dashboard'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='sm:text-base'
                    >
                      Volver al Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className='space-y-6'>
                  {selectedPeriod === 'week' ? (
                    <div>
                      <div className='mb-4 sm:mb-6'>
                        <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                          Semana Actual
                        </h3>
                        <p className='text-sm sm:text-base text-gray-600'>
                          {formatLongDate(currentWeekStart)} -{' '}
                          {formatLongDate(currentWeekEnd)}
                        </p>
                      </div>
                      <WeeklySchedule
                        assignments={assignments}
                        getScheduleSlots={getScheduleSlots}
                        weekStart={currentWeekStart}
                        weekEnd={currentWeekEnd}
                        holidaySet={holidaySet}
                      />
                      <div className='mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200'>
                        <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                          Próxima Semana
                        </h3>
                        <p className='text-sm sm:text-base text-gray-600 mb-4'>
                          {formatLongDate(nextWeekStart)} -{' '}
                          {formatLongDate(nextWeekEnd)}
                        </p>
                        <WeeklySchedule
                          assignments={assignments}
                          getScheduleSlots={getScheduleSlots}
                          weekStart={nextWeekStart}
                          weekEnd={nextWeekEnd}
                          holidaySet={holidaySet}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      {viewMode === 'list' ? (
                        <MobileMonthList
                          assignments={assignments}
                          getScheduleSlots={getScheduleSlots}
                          monthStart={monthStartLocal}
                          monthEnd={monthEndLocal}
                          holidaySet={holidaySet}
                        />
                      ) : (
                        <WorkerMonthCalendar
                          assignments={assignments}
                          getScheduleSlots={getScheduleSlots}
                          monthStart={monthStartLocal}
                          monthEnd={monthEndLocal}
                          holidaySet={holidaySet}
                          isMobile={isMobile}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
// Calendario mensual estilo Planning para la trabajadora logueada
/* function WorkerMonthCalendar(props: {
  assignments: Array<{
    id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    users?: { name: string | null; surname: string | null } | null;
  }>;
  getScheduleSlots: (
    schedule: unknown,
    assignmentType: string,
    date: Date
  ) => Array<{ start: string; end: string }>;
  monthStart: Date;
  monthEnd: Date;
  holidaySet?: ReadonlySet<string>;
}): React.JSX.Element {
  const { assignments, getScheduleSlots, monthStart, monthEnd, holidaySet } =
    props;
  // Función para verificar si una fecha es festivo (solo desde BD)
  const isKnownHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet?.has(dateKey) ?? false;
  };
  const shouldWorkOnDate = (date: Date, assignmentType: string): boolean => {
    const dayOfWeek = date.getDay();
    const type = (assignmentType ?? '').toLowerCase();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);
    if (type === 'laborables')
      return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
    if (type === 'festivos') return isSaturday || isSunday || isHoliday;
    if (type === 'flexible' || type === 'daily') return true;
    return dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;
  };
  type ExpandedEntry = {
    assignmentId: string;
    userLabel: string;
    start: string;
    end: string;
  };
  const getDateKeyLocal = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  const todayKey = getDateKeyLocal(new Date());
  const firstDayOfMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1,
    12,
    0,
    0
  );
  const lastDayOfMonth = new Date(
    monthEnd.getFullYear(),
    monthEnd.getMonth(),
    monthEnd.getDate(),
    12,
    0,
    0
  );
  // Construir solo los días del mes actual (no arrastrar semanas completas)
  const daysInMonth = lastDayOfMonth.getDate();
  const monthGrid = Array.from({ length: daysInMonth }, (_, idx) => {
    const date = new Date(firstDayOfMonth);
    date.setDate(firstDayOfMonth.getDate() + idx);
    const key = getDateKeyLocal(date);
    const isCurrentMonth = true;
    const isToday = key === todayKey;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidaySet?.has(key) === true || isKnownHoliday(date);
    const entries: ExpandedEntry[] = [];
    for (const a of assignments) {
      const aStart = new Date(a.start_date);
      const aEnd =
        a.end_date !== null ? new Date(a.end_date) : new Date('2099-12-31');
      if (date < aStart || date > aEnd) continue;
      if (!shouldWorkOnDate(date, a.assignment_type ?? '')) continue;
      const slots = getScheduleSlots(a.schedule, a.assignment_type, date);
      if (slots.length > 0) {
        const userLabel =
          `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() ||
          'Servicio';
        slots.forEach((s) => {
          entries.push({
            assignmentId: a.id,
            userLabel,
            start: s.start,
            end: s.end,
          });
        });
      }
    }
    return {
      date,
      key,
      isCurrentMonth,
      isToday,
      isWeekend,
      isHoliday,
      entries,
    };
  });
  return (
    <div>
      <div className='mb-4 sm:mb-6'>
        <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
          Este Mes
        </h3>
        <p className='text-sm sm:text-base text-gray-600'>
          Desde {firstDayOfMonth.toLocaleDateString('es-ES')} hasta{' '}
          {lastDayOfMonth.toLocaleDateString('es-ES')}
        </p>
      </div>
      <div className='hidden md:grid grid-cols-7 gap-2 sm:gap-3 mb-2'>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div
            key={d}
            className='text-center text-sm font-semibold text-gray-700'
          >
            {d}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3'>
        {monthGrid.map((cell, idx) => {
          const headerClasses = cell.isCurrentMonth
            ? 'text-gray-900'
            : 'text-gray-400';
          const borderHighlight =
            cell.isHoliday || cell.isWeekend
              ? 'border-red-300'
              : 'border-gray-200';
          const todayRing = cell.isToday ? 'ring-2 ring-blue-500' : '';
          const weekdayShort = cell.date
            .toLocaleDateString('es-ES', { weekday: 'short' })
            .replace('.', '')
            .slice(0, 3);
          return (
            <div
              key={idx}
              className={`p-2 sm:p-3 border ${borderHighlight} bg-white min-h-24 rounded-lg ${todayRing}`}
            >
              <div className='flex items-center justify-between mb-1'>
                <div className='flex items-center gap-2'>
                  <span className='lg:hidden inline-block text-[10px] font-semibold text-gray-700 bg-gray-100 rounded px-1.5 py-0.5'>
                    {weekdayShort}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-medium ${headerClasses}`}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>
                {cell.isHoliday && (
                  <span className='text-[10px] sm:text-xs text-red-600 font-medium'>
                    🎉
                  </span>
                )}
              </div>
              <div className='space-y-1 max-h-36 sm:max-h-40 overflow-y-auto pr-0.5'>
                {cell.entries.slice(0, 4).map((e, i) => (
                  <div
                    key={`${cell.key}-${e.assignmentId}-${i}`}
                    className='rounded px-1.5 py-1 border-l-4 border-blue-500 bg-blue-50/70 hover:bg-blue-50'
                  >
                    <div className='text-[10px] sm:text-[11px] font-medium text-gray-700 truncate'>
                      {e.userLabel}
                    </div>
                    <div className='flex items-center gap-1 text-[10px] sm:text-[11px] text-blue-700 font-semibold'>
                      <span>
                        {e.start}–{e.end}
                      </span>
                    </div>
                  </div>
                ))}
                {cell.entries.length === 0 && (
                  <div className='text-center py-2'>
                    <p className='text-[10px] text-gray-400 italic'>
                      Sin servicios
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} */
