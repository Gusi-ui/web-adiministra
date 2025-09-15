'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navigation from '@/components/layout/Navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { useDashboardUrl } from '@/hooks/useDashboardUrl';
import { supabase } from '@/lib/database';
import { type Holiday, getHolidaysForMonth } from '@/lib/holidays-query';
import { logger } from '@/utils/logger';

interface DayTimeSlot {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  timeSlots: DayTimeSlot[];
}

interface StoredAssignment {
  id: string;
  user_id: string;
  worker_id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date?: string | null;
  status: string;
  notes: string | null;
  user?: { name: string; surname: string };
  worker?: { name: string; surname: string };
}

interface ExpandedEntry {
  assignmentId: string;
  workerName: string;
  userName: string;
  start: string;
  end: string;
  assignmentType: string;
}

interface MonthStats {
  totalAssignments: number;
  totalHours: number;
  activeWorkers: number;
}

type MonthGridCell = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | undefined;
  entries: ExpandedEntry[];
};

export default function PlanningPage() {
  const [year, setYear] = useState<number>(2025);
  const [month, setMonth] = useState<number>(8); // Agosto por defecto
  const [loading, setLoading] = useState<boolean>(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<
    Record<string, ExpandedEntry[]>
  >({});
  const [stats, setStats] = useState<MonthStats>({
    totalAssignments: 0,
    totalHours: 0,
    activeWorkers: 0,
  });
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [selectedCellDate, setSelectedCellDate] = useState<string>('');
  // Consultas de filtro por texto (mobile-first)
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const dashboardUrl = useDashboardUrl();

  const firstDayOfMonth = useMemo(
    () => new Date(year, month - 1, 1),
    [year, month]
  );
  const lastDayOfMonth = useMemo(() => new Date(year, month, 0), [year, month]);

  // Helper para formatear clave de fecha en horario LOCAL (evita desfases por UTC)
  const getDateKeyLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Nota: eliminamos opciones predefinidas (selects) y usamos inputs de texto (mobile-first)

  // Aplicar filtros de trabajadora/usuario
  const visibleEntriesByDate = useMemo(() => {
    // Si no hay filtros, mantener el calendario vacío (mejor rendimiento/legibilidad)
    if (selectedWorker.trim() === '' && selectedUser.trim() === '') return {};

    // Si el filtro por trabajadora coincide exactamente con un nombre existente,
    // usamos coincidencia exacta; de lo contrario, coincidencia parcial (includes)
    const allWorkerNames = new Set<string>();
    Object.values(entriesByDate).forEach(list => {
      list.forEach(e => {
        const name = e.workerName?.toLowerCase();
        if (name && name.trim() !== '') allWorkerNames.add(name);
      });
    });

    const workerQuery = selectedWorker.trim().toLowerCase();
    const exactWorkerMatch =
      workerQuery !== '' && allWorkerNames.has(workerQuery)
        ? workerQuery
        : undefined;

    const result: Record<string, ExpandedEntry[]> = {};
    Object.entries(entriesByDate).forEach(([key, list]) => {
      result[key] = list.filter(e => {
        const uq = selectedUser.trim().toLowerCase();
        const okWorker =
          workerQuery === '' ||
          (exactWorkerMatch !== undefined
            ? e.workerName.toLowerCase() === exactWorkerMatch
            : e.workerName.toLowerCase().includes(workerQuery));
        const okUser = uq === '' || e.userName.toLowerCase().includes(uq);
        return okWorker && okUser;
      });
    });
    return result;
  }, [entriesByDate, selectedUser, selectedWorker]);

  // Construir la grilla del mes mostrando solo días del mes actual.
  // Rellenamos con placeholders (celdas vacías) antes/después para completar filas.
  const monthGrid: MonthGridCell[] = useMemo(() => {
    const start = new Date(firstDayOfMonth);
    const startDay = (start.getDay() + 6) % 7; // 0=Lunes ... 6=Domingo (lunes-based)

    const daysInMonth = lastDayOfMonth.getDate();
    const leadingPlaceholders = startDay; // celdas vacías antes del día 1
    const trailingPlaceholders =
      (7 - ((leadingPlaceholders + daysInMonth) % 7)) % 7; // celdas vacías al final

    const grid: MonthGridCell[] = [];

    // 1) Placeholders previos
    for (let i = 0; i < leadingPlaceholders; i++) {
      // Fecha dummy (no se usa para interacción)
      const date = new Date(firstDayOfMonth);
      date.setDate(1 - (leadingPlaceholders - i));
      grid.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isHoliday: false,
        holidayName: undefined,
        entries: [],
      });
    }

    // 2) Días reales del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(firstDayOfMonth);
      date.setDate(d);
      const dateKey = getDateKeyLocal(date);
      const isHoliday: boolean = holidays.some(
        h => h.day === date.getDate() && h.month === month && h.year === year
      );
      const holidayName = isHoliday
        ? (holidays.find(
            h =>
              h.day === date.getDate() && h.month === month && h.year === year
          )?.name ?? '')
        : undefined;
      grid.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === new Date().toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHoliday,
        holidayName,
        entries: visibleEntriesByDate[dateKey] ?? [],
      });
    }

    // 3) Placeholders finales
    for (let i = 0; i < trailingPlaceholders; i++) {
      const date = new Date(lastDayOfMonth);
      date.setDate(lastDayOfMonth.getDate() + (i + 1));
      grid.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isHoliday: false,
        holidayName: undefined,
        entries: [],
      });
    }

    return grid;
  }, [
    visibleEntriesByDate,
    firstDayOfMonth,
    lastDayOfMonth,
    holidays,
    month,
    year,
  ]);

  // Utilidad: parsear schedule de la BD en forma segura
  const parseSchedule = (raw: unknown): Record<string, DaySchedule> => {
    if (typeof raw === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object') {
          return parsed as Record<string, DaySchedule>;
        }
        return {};
      } catch (error: unknown) {
        logger.error('Error parsing assignment schedule:', error);
        return {};
      }
    }
    return (raw as Record<string, DaySchedule>) ?? {};
  };

  // Cargar festivos y asignaciones del mes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Festivos (usamos la tabla existente; los locales deberían estar cargados como type='local')
        const monthHolidays = await getHolidaysForMonth(month, year);
        // eslint-disable-next-line no-console
        console.log(
          'Festivos cargados para agosto 2025:',
          JSON.stringify(monthHolidays, null, 2)
        );

        setHolidays(monthHolidays);

        // Rango de fechas del mes
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = lastDayOfMonth.toISOString().split('T')[0];

        // Asignaciones que intersectan con el mes
        const { data, error } = await supabase
          .from('assignments')
          .select(
            `
            *,
            user:users(name, surname),
            worker:workers(name, surname)
          `
          )
          .lte('start_date', endDate)
          .or(`end_date.is.null,end_date.gte.${startDate}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error !== null) {
          logger.error('Error cargando asignaciones para planning:', error);
          setEntriesByDate({});
          setStats({ totalAssignments: 0, totalHours: 0, activeWorkers: 0 });
          return;
        }

        const storedList = (data ?? []) as StoredAssignment[];

        // Expandir a entradas por día del mes
        const byDate: Record<string, ExpandedEntry[]> = {};
        const workerSet = new Set<string>();
        let totalHours = 0;

        for (const a of storedList) {
          const schedule = parseSchedule(a.schedule);
          const scheduleAny = schedule as Record<string, unknown>;
          const holidayConfig = (scheduleAny['holiday_config'] ?? undefined) as
            | {
                has_holiday_service?: boolean;
                holiday_timeSlots?: Array<{
                  id?: string;
                  start?: string;
                  end?: string;
                }>;
              }
            | undefined;
          const userName =
            `${a.user?.name ?? ''} ${a.user?.surname ?? ''}`.trim() ||
            'Sin nombre';
          const workerName =
            `${a.worker?.name ?? ''} ${a.worker?.surname ?? ''}`.trim() ||
            'Sin nombre';
          if (workerName !== '') workerSet.add(workerName);

          // Iterar días del mes
          for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
            // Crear fecha en zona horaria local para evitar problemas de UTC
            const date = new Date(year, month - 1, d, 12, 0, 0); // Mediodía para evitar problemas de zona horaria
            const dateKey = getDateKeyLocal(date);

            // Rango de asignación
            const startsOnOrBefore = new Date(a.start_date) <= date;
            const endsOnOrAfter =
              a.end_date === null ||
              a.end_date === undefined ||
              new Date(a.end_date) >= date;
            if (!startsOnOrBefore || !endsOnOrAfter) continue;

            // Día de semana
            const weekDayIndex = date.getDay(); // 0=Domingo ... 6=Sábado
            const dayKeyMap: Record<number, string> = {
              0: 'sunday',
              1: 'monday',
              2: 'tuesday',
              3: 'wednesday',
              4: 'thursday',
              5: 'friday',
              6: 'saturday',
            };
            const dayKey = dayKeyMap[weekDayIndex] ?? 'monday';

            // Determinar si es festivo o fin de semana y filtrar por tipo de asignación
            const isWeekend = weekDayIndex === 0 || weekDayIndex === 6;
            const isHoliday = monthHolidays.some(
              h =>
                h.day === date.getDate() && h.month === month && h.year === year
            );
            const onHolidayContext = isHoliday || isWeekend;

            const type = a.assignment_type;
            const allowedOnThisDay = onHolidayContext
              ? type === 'festivos' ||
                type === 'flexible' ||
                type === 'completa'
              : type === 'laborables' ||
                type === 'flexible' ||
                type === 'completa';

            if (!allowedOnThisDay) {
              continue;
            }
            // Determinar los tramos a usar según el contexto y tipo de asignación
            let slots: DayTimeSlot[] = [];
            const typeLower = (a.assignment_type ?? '').toLowerCase();

            if (onHolidayContext) {
              // Preferir tramos de festivo si existen para festivos/flexible/completa
              const holidaySlotsRawCfg = holidayConfig?.holiday_timeSlots ?? [];
              const scheduleHoliday = scheduleAny['holiday'] as
                | {
                    enabled?: boolean;
                    timeSlots?: Array<{
                      id?: string;
                      start?: string;
                      end?: string;
                    }>;
                  }
                | undefined;
              const holidaySlotsRaw =
                holidaySlotsRawCfg.length > 0
                  ? holidaySlotsRawCfg
                  : Array.isArray(scheduleHoliday?.timeSlots)
                    ? (scheduleHoliday?.timeSlots as Array<{
                        id?: string;
                        start?: string;
                        end?: string;
                      }>)
                    : [];

              if (
                (typeLower === 'festivos' ||
                  typeLower === 'flexible' ||
                  typeLower === 'completa') &&
                holidaySlotsRaw.length > 0
              ) {
                slots = holidaySlotsRaw.map((s, idx) => {
                  const safeId =
                    typeof s.id === 'string' ? s.id : `holiday-${idx + 1}`;
                  const safeStart =
                    typeof s.start === 'string' ? s.start : '08:00';
                  const safeEnd = typeof s.end === 'string' ? s.end : '16:00';
                  return { id: safeId, start: safeStart, end: safeEnd };
                });
              } else {
                // Fallback a tramos del día si están habilitados
                const dayScheduleRaw = schedule?.[dayKey];
                let daySchedule: DaySchedule | undefined = undefined;
                if (
                  dayScheduleRaw !== null &&
                  dayScheduleRaw !== undefined &&
                  typeof dayScheduleRaw === 'object'
                ) {
                  daySchedule = dayScheduleRaw as unknown as DaySchedule;
                }
                if (daySchedule === undefined || daySchedule.enabled !== true) {
                  continue;
                }
                slots = Array.isArray(daySchedule.timeSlots)
                  ? (daySchedule.timeSlots as unknown[]).map(
                      (s: unknown, idx: number) => {
                        const slot = s as Partial<DayTimeSlot>;
                        const safeId =
                          typeof slot.id === 'string'
                            ? slot.id
                            : `${dayKey}-${idx + 1}`;
                        const safeStart =
                          typeof slot.start === 'string' ? slot.start : '08:00';
                        const safeEnd =
                          typeof slot.end === 'string' ? slot.end : '16:00';
                        const result: DayTimeSlot = {
                          id: safeId,
                          start: safeStart,
                          end: safeEnd,
                        };
                        return result;
                      }
                    )
                  : [];
              }
            } else {
              // Día no festivo: usar configuración del día si está habilitada
              const dayScheduleRaw = schedule?.[dayKey];
              let daySchedule: DaySchedule | undefined = undefined;
              if (
                dayScheduleRaw !== null &&
                dayScheduleRaw !== undefined &&
                typeof dayScheduleRaw === 'object'
              ) {
                daySchedule = dayScheduleRaw as unknown as DaySchedule;
              }
              if (daySchedule === undefined || daySchedule.enabled !== true) {
                continue;
              }
              slots = Array.isArray(daySchedule.timeSlots)
                ? (daySchedule.timeSlots as unknown[]).map(
                    (s: unknown, idx: number) => {
                      const slot = s as Partial<DayTimeSlot>;
                      const safeId =
                        typeof slot.id === 'string'
                          ? slot.id
                          : `${dayKey}-${idx + 1}`;
                      const safeStart =
                        typeof slot.start === 'string' ? slot.start : '08:00';
                      const safeEnd =
                        typeof slot.end === 'string' ? slot.end : '16:00';
                      const result: DayTimeSlot = {
                        id: safeId,
                        start: safeStart,
                        end: safeEnd,
                      };
                      return result;
                    }
                  )
                : [];
            }
            for (const slot of slots) {
              const entry: ExpandedEntry = {
                assignmentId: a.id,
                workerName,
                userName,
                start: slot.start,
                end: slot.end,
                assignmentType: a.assignment_type,
              };
              byDate[dateKey] ??= [];
              byDate[dateKey].push(entry);

              // Calcular horas del tramo
              const startDateTime = new Date(`2000-01-01T${slot.start}`);
              const endDateTime = new Date(`2000-01-01T${slot.end}`);
              const hours =
                (endDateTime.getTime() - startDateTime.getTime()) /
                (1000 * 60 * 60);
              totalHours += hours;
            }
          }
        }

        setEntriesByDate(byDate);
        setStats({
          totalAssignments: Object.values(byDate).reduce(
            (acc, list) => acc + list.length,
            0
          ),
          totalHours: Number(totalHours.toFixed(1)),
          activeWorkers: workerSet.size,
        });
      } catch (error: unknown) {
        logger.error('Error cargando datos del planning:', error);
        setEntriesByDate({});
        setStats({ totalAssignments: 0, totalHours: 0, activeWorkers: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadData().catch((error: unknown) => {
      logger.error('Unhandled error loading planning:', error);
      setLoading(false);
    });
  }, [firstDayOfMonth, lastDayOfMonth, month, year]);

  const formatMonthTitle = (date: Date): string => {
    const monthName = date
      .toLocaleDateString('es-ES', { month: 'long' })
      .replace(' de', '');
    const yearNum = date.getFullYear();
    return `${monthName} ${yearNum}`;
  };

  const handlePrevMonth = () => {
    const newMonth = month - 1;
    if (newMonth < 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(newMonth);
    }
  };

  const handleNextMonth = () => {
    const newMonth = month + 1;
    if (newMonth > 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(newMonth);
    }
  };

  const handleOpenCell = (dateKey: string) => {
    setSelectedCellDate(dateKey);
    setShowEntryModal(true);
  };

  const closeModals = () => {
    setShowEntryModal(false);
    setSelectedCellDate('');
  };

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen flex flex-col'>
        {/* Header - Visible en todos los dispositivos */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 64 64'
                  width='32'
                  height='32'
                  className='w-full h-full'
                >
                  <defs>
                    <linearGradient
                      id='mobilePlanningLogoGradient'
                      x1='0%'
                      y1='0%'
                      x2='100%'
                      y2='100%'
                    >
                      <stop offset='0%' stopColor='#3b82f6' />
                      <stop offset='100%' stopColor='#22c55e' />
                    </linearGradient>
                  </defs>
                  <circle
                    cx='32'
                    cy='32'
                    r='30'
                    fill='url(#mobilePlanningLogoGradient)'
                  />
                  <path
                    d='M32 50C32 50 12 36.36 12 24.5C12 17.6 17.6 12 24.5 12C28.09 12 31.36 13.94 32 16.35C32.64 13.94 35.91 12 39.5 12C46.4 12 52 17.6 52 24.5C52 36.36 32 50 32 50Z'
                    fill='white'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
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

        {/* Contenido Principal */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 flex-1'>
          {/* Header Desktop */}
          <div className='hidden lg:block mb-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                  📅 Planificación Mensual
                </h1>
                <p className='text-gray-600 text-lg'>
                  Gestiona la planificación de servicios SAD
                </p>
              </div>
            </div>
          </div>

          {/* Header Mobile */}
          <div className='lg:hidden mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>
              📅 Planificación Mensual
            </h1>
            <p className='text-gray-600 text-sm'>
              Gestiona la planificación de servicios SAD
            </p>
          </div>

          {/* Enhanced Month Selector */}
          <div className='mb-6'>
            <Card className='p-4 lg:p-6'>
              <div className='flex flex-col lg:flex-row lg:flex-nowrap items-center justify-between gap-4'>
                {/* Month Navigation */}
                <div className='flex items-center justify-center lg:justify-start space-x-3 h-12 flex-none'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handlePrevMonth}
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
                    {formatMonthTitle(firstDayOfMonth)}
                  </h2>

                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleNextMonth}
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

                {/* Filters */}
                <div className='w-full lg:flex-1 lg:min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:flex lg:space-x-3 lg:items-center'>
                  {/* Worker Filter */}
                  <div className='relative'>
                    <input
                      id='filter-worker'
                      aria-label='Buscar trabajadora'
                      type='text'
                      className='w-full px-4 py-2 h-10 border border-gray-300 rounded-lg placeholder-gray-400 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
                      placeholder='🔍 Buscar trabajadora'
                      value={selectedWorker}
                      onChange={e => setSelectedWorker(e.target.value)}
                    />
                  </div>

                  {/* User Filter */}
                  <div className='relative'>
                    <input
                      id='filter-user'
                      aria-label='Buscar usuario'
                      type='text'
                      className='w-full px-4 py-2 h-10 border border-gray-300 rounded-lg placeholder-gray-400 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
                      placeholder='👤 Buscar usuario'
                      value={selectedUser}
                      onChange={e => setSelectedUser(e.target.value)}
                    />
                  </div>

                  {/* Clear Filters */}
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-10 text-sm font-medium'
                    onClick={() => {
                      setSelectedWorker('');
                      setSelectedUser('');
                    }}
                  >
                    <svg
                      className='w-4 h-4 mr-1'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <p className='mt-2 text-gray-600'>Cargando planificación...</p>
            </div>
          )}

          {/* Desktop Calendar Grid */}
          {!loading && (
            <div className='hidden lg:block mb-8'>
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                {/* Weekday Headers */}
                <div className='grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200'>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(
                    day => (
                      <div
                        key={day}
                        className='px-2 py-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0'
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar Grid */}
                <div className='grid grid-cols-7 border border-gray-200'>
                  {monthGrid.map((cell, idx) => {
                    const dateKey = getDateKeyLocal(cell.date);
                    const isCurrentMonth = cell.isCurrentMonth;
                    const isToday = cell.isToday;
                    const isWeekend = cell.isWeekend;
                    const isHoliday = cell.isHoliday;

                    // Estilos base
                    let cellClasses =
                      'min-h-[160px] p-3 relative border-r border-b border-gray-200';

                    if (!isCurrentMonth) {
                      cellClasses += ' bg-gray-50 text-gray-400';
                    } else if (isToday) {
                      cellClasses += ' bg-blue-50 border-2 border-blue-500';
                    } else if (isHoliday) {
                      cellClasses += ' bg-red-50 border-l-4 border-red-500';
                    } else if (isWeekend) {
                      cellClasses +=
                        ' bg-orange-50 border-l-4 border-orange-300';
                    } else {
                      cellClasses +=
                        ' bg-white hover:bg-gray-50 transition-colors';
                    }

                    return (
                      <div
                        key={idx}
                        className={cellClasses}
                        onClick={
                          isCurrentMonth
                            ? () => handleOpenCell(dateKey)
                            : undefined
                        }
                        role={isCurrentMonth ? 'button' : undefined}
                        tabIndex={isCurrentMonth ? 0 : -1}
                      >
                        {/* Date Number */}
                        <div className='flex items-center justify-between mb-2'>
                          <span
                            className={`text-base font-semibold ${
                              isToday
                                ? 'text-blue-700'
                                : isHoliday
                                  ? 'text-red-700'
                                  : isWeekend
                                    ? 'text-orange-700'
                                    : 'text-gray-900'
                            }`}
                          >
                            {cell.date.getDate()}
                          </span>

                          {/* Holiday Indicator */}
                          {isHoliday && (
                            <span
                              className='text-xs text-red-600 font-medium'
                              title={cell.holidayName}
                            >
                              🎉
                            </span>
                          )}

                          {/* Today Indicator */}
                          {isToday && (
                            <span className='text-xs text-blue-600 font-medium'>
                              Hoy
                            </span>
                          )}
                        </div>

                        {/* Entries */}
                        {isCurrentMonth && (
                          <div className='space-y-1 max-h-28 overflow-y-auto'>
                            {cell.entries.slice(0, 3).map((entry, i) => (
                              <div
                                key={`${dateKey}-${i}`}
                                className={`rounded-lg px-2 py-1.5 text-xs border-l-3 ${
                                  entry.assignmentType === 'laborables'
                                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                                    : entry.assignmentType === 'festivos'
                                      ? 'bg-orange-100 border-orange-500 text-orange-800'
                                      : entry.assignmentType === 'flexible'
                                        ? 'bg-purple-100 border-purple-500 text-purple-800'
                                        : 'bg-gray-100 border-gray-500 text-gray-800'
                                }`}
                              >
                                <div className='font-medium truncate'>
                                  {entry.workerName}
                                </div>
                                <div className='text-xs text-gray-600'>
                                  {entry.userName}
                                </div>
                                <div className='text-xs font-semibold'>
                                  {entry.start}-{entry.end}
                                </div>
                              </div>
                            ))}

                            {/* More entries indicator */}
                            {cell.entries.length > 3 && (
                              <button
                                className='w-full text-xs text-blue-600 hover:text-blue-800 font-medium text-center py-1 hover:bg-blue-50 rounded'
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenCell(dateKey);
                                }}
                              >
                                +{cell.entries.length - 3} más
                              </button>
                            )}
                          </div>
                        )}

                        {/* Empty state for current month */}
                        {isCurrentMonth && cell.entries.length === 0 && (
                          <div className='text-center py-4 text-gray-400'>
                            <div className='text-lg'>📅</div>
                            <div className='text-xs'>Sin servicios</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mobile/Tablet List View */}
          {!loading && (
            <div className='lg:hidden mb-8 space-y-4'>
              {/* Group by week for better mobile experience */}
              {(() => {
                const weeks: Array<{
                  weekStart: Date;
                  weekEnd: Date;
                  days: Array<{
                    date: Date;
                    entries: ExpandedEntry[];
                    isToday: boolean;
                    isHoliday: boolean;
                    isWeekend: boolean;
                    holidayName?: string;
                  }>;
                }> = [];

                let currentWeek: (typeof weeks)[0] | null = null;

                monthGrid
                  .filter(cell => cell.isCurrentMonth)
                  .forEach(cell => {
                    const weekStart = new Date(cell.date);
                    weekStart.setDate(
                      weekStart.getDate() - weekStart.getDay() + 1
                    ); // Monday

                    if (
                      !currentWeek ||
                      currentWeek.weekStart.getTime() !== weekStart.getTime()
                    ) {
                      if (currentWeek) {
                        weeks.push(currentWeek);
                      }
                      currentWeek = {
                        weekStart,
                        weekEnd: new Date(weekStart),
                        days: [],
                      };
                      currentWeek.weekEnd.setDate(weekStart.getDate() + 6);
                    }

                    if (currentWeek !== null) {
                      currentWeek.days.push({
                        date: cell.date,
                        entries: cell.entries,
                        isToday: cell.isToday,
                        isHoliday: cell.isHoliday,
                        isWeekend: cell.isWeekend,
                        ...(cell.holidayName !== undefined
                          ? { holidayName: cell.holidayName }
                          : {}),
                      });
                    }
                  });

                if (currentWeek !== null) {
                  weeks.push(currentWeek);
                }

                return weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'
                  >
                    {/* Week Header */}
                    <div className='bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200'>
                      <h3 className='text-sm font-semibold text-gray-900'>
                        Semana del{' '}
                        {week.weekStart.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        -{' '}
                        {week.weekEnd.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </h3>
                    </div>

                    {/* Week Days */}
                    <div className='divide-y divide-gray-200'>
                      {week.days.map((day, dayIndex) => {
                        const dayName = day.date.toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        });

                        return (
                          <div key={dayIndex} className='p-4'>
                            {/* Day Header */}
                            <div className='flex items-center justify-between mb-3'>
                              <div className='flex items-center space-x-2'>
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    day.isToday
                                      ? 'bg-blue-500 text-white'
                                      : day.isHoliday
                                        ? 'bg-red-500 text-white'
                                        : day.isWeekend
                                          ? 'bg-orange-500 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {day.date.getDate()}
                                </div>
                                <div>
                                  <h4 className='font-semibold text-gray-900'>
                                    {dayName}
                                  </h4>
                                  {day.isHoliday && (
                                    <p className='text-xs text-red-600'>
                                      🎉 {day.holidayName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className='text-right'>
                                <span className='text-sm text-gray-500'>
                                  {day.entries.length} servicios
                                </span>
                              </div>
                            </div>

                            {/* Day Entries */}
                            {day.entries.length > 0 ? (
                              <div className='space-y-2'>
                                {day.entries.map((entry, entryIndex) => (
                                  <div
                                    key={entryIndex}
                                    className={`p-3 rounded-lg border-l-4 ${
                                      entry.assignmentType === 'laborables'
                                        ? 'bg-blue-50 border-blue-500'
                                        : entry.assignmentType === 'festivos'
                                          ? 'bg-orange-50 border-orange-500'
                                          : entry.assignmentType === 'flexible'
                                            ? 'bg-purple-50 border-purple-500'
                                            : 'bg-gray-50 border-gray-500'
                                    }`}
                                  >
                                    <div className='flex items-center justify-between mb-1'>
                                      <span className='font-medium text-gray-900'>
                                        {entry.workerName}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          entry.assignmentType === 'laborables'
                                            ? 'bg-blue-100 text-blue-800'
                                            : entry.assignmentType ===
                                                'festivos'
                                              ? 'bg-orange-100 text-orange-800'
                                              : entry.assignmentType ===
                                                  'flexible'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {entry.assignmentType === 'laborables'
                                          ? 'Laborables'
                                          : entry.assignmentType === 'festivos'
                                            ? 'Festivos'
                                            : entry.assignmentType ===
                                                'flexible'
                                              ? 'Flexible'
                                              : 'Otro'}
                                      </span>
                                    </div>
                                    <p className='text-sm text-gray-700 mb-1'>
                                      {entry.userName}
                                    </p>
                                    <p className='text-sm font-semibold text-gray-900'>
                                      {entry.start} - {entry.end}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className='text-center py-6 text-gray-400'>
                                <div className='text-2xl mb-2'>📅</div>
                                <p className='text-sm'>
                                  Sin servicios programados
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Weekly Schedule - Tablet Layout (oculto temporalmente en modo mensual) */}
          {/* !loading && (
            <div className='hidden md:block lg:hidden mb-8'>
              <div className='grid grid-cols-2 gap-4'>
                {weekDates.map((date, index) => {
                  const dayAssignments = getAssignmentsForDate(date);
                  return (
                    <Card
                      key={index}
                      className='p-4 shadow-lg hover:shadow-xl transition-all duration-200'
                    >
                      <div className='text-center mb-4'>
                        <h3 className='font-semibold text-gray-900'>
                          {formatWeekday(date)}
                        </h3>
                        <p className='text-sm text-gray-500'>
                          {formatDate(date)}
                        </p>
                      </div>

                      {dayAssignments.length > 0 ? (
                        <div className='space-y-2'>
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`p-2 rounded border-l-4 ${getAssignmentColor(assignment.type)} cursor-pointer hover:shadow-md transition-shadow`}
                              onClick={() => handleViewAssignment(assignment)}
                            >
                              <div className='flex items-center justify-between mb-1'>
                                <p className='text-xs font-medium truncate'>
                                  {assignment.workerName}
                                </p>
                                <span
                                  className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}
                                >
                                  {assignment.status === 'confirmed'
                                    ? '✓'
                                    : assignment.status === 'completed'
                                      ? '✓'
                                      : assignment.status === 'cancelled'
                                        ? '✗'
                                        : '⏳'}
                                </span>
                              </div>
                              <p className='text-xs text-gray-700 truncate'>
                                {assignment.userName} - {assignment.hours}h
                              </p>
                              {assignment.type === 'urgent' && (
                                <span className='inline-block mt-1 text-xs text-red-700 font-medium'>
                                  🚨
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-4'>
                          <div className='text-2xl mb-1'>📅</div>
                          <p className='text-xs text-gray-500'>
                            Sin asignaciones
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ) */}

          {/* Weekly Schedule - Desktop Layout (oculto temporalmente en modo mensual) */}
          {/* !loading && (
            <div className='hidden lg:grid grid-cols-7 gap-4 mb-8'>
              {weekDates.map((date, index) => {
                const dayAssignments = getAssignmentsForDate(date);
                return (
                  <Card key={index} className='p-4'>
                    <div className='text-center mb-4'>
                      <h3 className='font-semibold text-gray-900'>
                        {formatWeekday(date)}
                      </h3>
                      <p className='text-sm text-gray-500'>
                        {formatDate(date)}
                      </p>
                    </div>

                    {dayAssignments.length > 0 ? (
                      <div className='space-y-2'>
                        {dayAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className={`p-2 rounded border-l-4 ${getAssignmentColor(assignment.type)} cursor-pointer hover:shadow-md transition-shadow`}
                            onClick={() => handleViewAssignment(assignment)}
                          >
                            <div className='flex items-center justify-between mb-1'>
                              <p className='text-xs font-medium truncate'>
                                {assignment.workerName}
                              </p>
                              <span
                                className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}
                              >
                                {assignment.status === 'confirmed'
                                  ? '✓'
                                  : assignment.status === 'completed'
                                    ? '✓'
                                    : assignment.status === 'cancelled'
                                      ? '✗'
                                      : '⏳'}
                              </span>
                            </div>
                            <p className='text-xs text-gray-700 truncate'>
                              {assignment.userName} - {assignment.hours}h
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center py-4'>
                        <div className='text-2xl mb-1'>📅</div>
                        <p className='text-xs text-gray-500'>
                          Sin asignaciones
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) */}

          {/* Summary Stats */}
          {!loading && (
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              <Card className='p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>👥</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-600'>
                      Trabajadores Activos
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.activeWorkers}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>⏰</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-600'>
                      Horas Programadas
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.totalHours}h
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>📋</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-600'>
                      Asignaciones
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.totalAssignments}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='p-4 lg:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'>
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>⏳</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-600'>
                      Pendientes
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.totalAssignments}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!loading && Object.keys(entriesByDate).length === 0 && (
            <Card className='p-8 text-center'>
              <div className='text-6xl mb-4'>📅</div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                No hay asignaciones programadas este mes
              </h3>
              <p className='text-gray-600 mb-4'>
                Comienza creando tu primera asignación para este mes
              </p>
              <Button
                onClick={() => setShowEntryModal(true)}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                ➕ Nueva Entrada
              </Button>
            </Card>
          )}
        </div>

        {/* Entries Modal */}
        <Modal
          isOpen={showEntryModal}
          onClose={closeModals}
          title='Entradas del día'
        >
          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>
              {selectedCellDate
                ? new Date(selectedCellDate).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
            </p>
            <div className='space-y-2'>
              {(entriesByDate[selectedCellDate ?? ''] ?? []).map((e, idx) => (
                <Card key={`${selectedCellDate}-${idx}`} className='p-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-sm font-semibold text-gray-900'>
                        {e.workerName}
                      </div>
                      <div className='text-xs text-gray-600'>{e.userName}</div>
                    </div>
                    <div className='text-sm font-medium text-gray-800'>
                      {e.start}–{e.end}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className='flex justify-end'>
              <Button variant='outline' onClick={closeModals}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Assignment Modal (no usado en vista mensual actual) */}

        {/* Footer */}
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

        {/* Navegación Móvil */}
        <Navigation variant='mobile' />
      </div>
    </ProtectedRoute>
  );
}
