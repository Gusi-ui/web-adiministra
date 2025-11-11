'use client';

import { useEffect, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { logger } from '@/utils/logger';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  hours: number;
}

interface DaySchedule {
  enabled: boolean;
  timeSlots: TimeSlot[];
  totalHours: number;
}

interface Schedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface MonthlyCalculation {
  totalCalculatedHours: number;
  assignedHours: number;
  difference: number;
  daysBreakdown: {
    laborables: number;
    festivos: number;
    finesDeSemana: number;
  };
}

interface ScheduleConfigProps {
  schedule: Schedule;
  onScheduleChange: (schedule: Schedule) => void;
  assignedHours: number;
  selectedMonth: number;
  selectedYear: number;
}

export default function ScheduleConfig({
  schedule,
  onScheduleChange,
  assignedHours,
  selectedMonth,
  selectedYear,
}: ScheduleConfigProps) {
  const [monthlyCalculation, setMonthlyCalculation] =
    useState<MonthlyCalculation>({
      totalCalculatedHours: 0,
      assignedHours,
      difference: 0,
      daysBreakdown: {
        laborables: 0,
        festivos: 0,
        finesDeSemana: 0,
      },
    });

  const [holidays, setHolidays] = useState<
    Array<{ day: number; month: number; year: number; name: string }>
  >([]);

  // Función para actualizar las horas totales de un día
  const updateDayTotalHours = (
    updatedSchedule: Schedule,
    dayKey: keyof Schedule
  ) => {
    const totalHours = updatedSchedule[dayKey].timeSlots.reduce((sum, slot) => {
      const start = new Date(`2000-01-01T${slot.startTime}`);
      const end = new Date(`2000-01-01T${slot.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    updatedSchedule[dayKey].totalHours = totalHours;
  };

  // Cargar festivos de Mataró desde la base de datos
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        // Importar dinámicamente para evitar problemas de SSR
        const { getHolidaysForMonth } = await import('@/lib/holidays-query');
        const holidaysData = await getHolidaysForMonth(
          selectedMonth,
          selectedYear
        );

        // Convertir a formato compatible
        const monthHolidays = holidaysData.map(holiday => ({
          day: holiday.day,
          month: holiday.month,
          year: holiday.year,
          name: holiday.name,
        }));

        setHolidays(monthHolidays);
      } catch (error) {
        logger.error('Error cargando festivos:', error);
        // Fallback: mantener array vacío si hay error
        setHolidays([]);
      }
    };

    loadHolidays().catch(error => {
      logger.error('Error en loadHolidays:', error);
      setHolidays([]);
    });
  }, [selectedMonth, selectedYear]);

  // Calcular horas del mes
  useEffect(() => {
    const calculateMonthlyHours = () => {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      let laborables = 0;
      let festivos = 0;
      let finesDeSemana = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, etc.
        const isHoliday = holidays.some(holiday => holiday.day === day);

        if (isHoliday) {
          festivos++;
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Sábado o domingo
          finesDeSemana++;
        } else {
          // Día laborable
          laborables++;
        }
      }

      // Calcular horas totales
      const laborablesHours = laborables * schedule.monday.totalHours; // Usamos lunes como referencia para laborables
      const festivosHours = festivos * schedule.sunday.totalHours; // Usamos domingo como referencia para festivos
      const finesDeSemanaHours = finesDeSemana * schedule.sunday.totalHours;

      const totalCalculatedHours =
        laborablesHours + festivosHours + finesDeSemanaHours;
      const difference = totalCalculatedHours - assignedHours;

      setMonthlyCalculation({
        totalCalculatedHours,
        assignedHours,
        difference,
        daysBreakdown: {
          laborables,
          festivos,
          finesDeSemana,
        },
      });
    };

    calculateMonthlyHours();
  }, [schedule, assignedHours, selectedMonth, selectedYear, holidays]);

  const addTimeSlot = (dayKey: keyof Schedule) => {
    const newTimeSlot: TimeSlot = {
      id: Date.now().toString(),
      startTime: '08:00',
      endTime: '09:00',
      hours: 1,
    };

    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        timeSlots: [...schedule[dayKey].timeSlots, newTimeSlot],
      },
    };

    updateDayTotalHours(updatedSchedule, dayKey);
    onScheduleChange(updatedSchedule);
  };

  const removeTimeSlot = (dayKey: keyof Schedule, slotId: string) => {
    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        timeSlots: schedule[dayKey].timeSlots.filter(
          slot => slot.id !== slotId
        ),
      },
    };

    updateDayTotalHours(updatedSchedule, dayKey);
    onScheduleChange(updatedSchedule);
  };

  const updateTimeSlot = (
    dayKey: keyof Schedule,
    slotId: string,
    field: keyof TimeSlot,
    value: string | number
  ) => {
    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        timeSlots: schedule[dayKey].timeSlots.map(slot => {
          const isTargetSlot = slot.id === slotId;
          return isTargetSlot ? { ...slot, [field]: value } : slot;
        }),
      },
    };

    updateDayTotalHours(updatedSchedule, dayKey);
    onScheduleChange(updatedSchedule);
  };

  const toggleDayEnabled = (dayKey: keyof Schedule) => {
    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        enabled: !schedule[dayKey].enabled,
      },
    };

    onScheduleChange(updatedSchedule);
  };

  const getDayName = (dayKey: string) => {
    const dayNames: Record<string, string> = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo',
    };
    return dayNames[dayKey] ?? dayKey;
  };

  // Orden correcto de los días de la semana
  const dayOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return 'text-red-600 bg-red-50 border-red-200';
    if (difference < 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getDifferenceText = (difference: number) => {
    if (difference > 0) return `Exceso de ${difference.toFixed(1)} horas`;
    if (difference < 0)
      return `Defecto de ${Math.abs(difference).toFixed(1)} horas`;
    return 'Horas exactas';
  };

  return (
    <div className='space-y-6'>
      {/* Resumen del cálculo mensual */}
      <Card className='p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
          📊 Cálculo Mensual -{' '}
          {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
            'es-ES',
            { month: 'long', year: 'numeric' }
          )}
        </h3>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-blue-600'>
              {monthlyCalculation.daysBreakdown.laborables}
            </div>
            <div className='text-sm text-gray-600'>Días Laborables</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-yellow-600'>
              {monthlyCalculation.daysBreakdown.festivos}
            </div>
            <div className='text-sm text-gray-600'>Festivos</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-purple-600'>
              {monthlyCalculation.daysBreakdown.finesDeSemana}
            </div>
            <div className='text-sm text-gray-600'>Fines de Semana</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>
              {monthlyCalculation.totalCalculatedHours.toFixed(1)}h
            </div>
            <div className='text-sm text-gray-600'>Horas Calculadas</div>
          </div>
        </div>

        <div
          className={`p-4 rounded-lg border ${getDifferenceColor(monthlyCalculation.difference)}`}
        >
          <div className='text-center'>
            <div className='text-lg font-semibold'>
              {getDifferenceText(monthlyCalculation.difference)}
            </div>
            <div className='text-sm'>
              Asignadas: {monthlyCalculation.assignedHours}h | Calculadas:{' '}
              {monthlyCalculation.totalCalculatedHours.toFixed(1)}h
            </div>
          </div>
        </div>
      </Card>

      {/* Festivos del mes */}
      {holidays.length > 0 && (
        <Card className='p-4 bg-yellow-50 border-yellow-200'>
          <h4 className='font-semibold text-yellow-800 mb-2'>
            🎉 Festivos del Mes
          </h4>
          <div className='flex flex-wrap gap-2'>
            {holidays.map(holiday => (
              <span
                key={`holiday-${holiday.day}-${holiday.month}-${holiday.year}`}
                className='px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full border border-yellow-300'
              >
                {holiday.day}/{holiday.month}: {holiday.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Configuración por días */}
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-gray-900'>
          📅 Configuración de Horarios por Día
        </h3>

        {dayOrder.map(dayKey => {
          const daySchedule = schedule[dayKey as keyof Schedule];
          return (
            <Card key={dayKey} className='p-4'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center space-x-3'>
                  <input
                    type='checkbox'
                    checked={daySchedule.enabled}
                    onChange={() => toggleDayEnabled(dayKey as keyof Schedule)}
                    className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                  />
                  <h4 className='font-medium text-gray-900'>
                    {getDayName(dayKey)}
                  </h4>
                  <span className='text-sm text-gray-500'>
                    Total: {daySchedule.totalHours.toFixed(1)}h
                  </span>
                </div>
                <Button
                  size='sm'
                  onClick={() => addTimeSlot(dayKey as keyof Schedule)}
                  disabled={daySchedule.enabled === false}
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  ➕ Añadir Tramo
                </Button>
              </div>

              {daySchedule.enabled === true && (
                <div className='space-y-3'>
                  {daySchedule.timeSlots.map(
                    (slot: TimeSlot, index: number) => (
                      <div
                        key={slot.id || `slot-${dayKey}-${index}`}
                        className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
                      >
                        <div className='flex items-center space-x-2'>
                          <span className='text-sm font-medium text-gray-700'>
                            Tramo {index + 1}:
                          </span>
                          <Input
                            type='time'
                            value={slot.startTime}
                            onChange={e =>
                              updateTimeSlot(
                                dayKey as keyof Schedule,
                                slot.id,
                                'startTime',
                                e.target.value
                              )
                            }
                            className='w-24'
                          />
                          <span className='text-gray-500'>a</span>
                          <Input
                            type='time'
                            value={slot.endTime}
                            onChange={e =>
                              updateTimeSlot(
                                dayKey as keyof Schedule,
                                slot.id,
                                'endTime',
                                e.target.value
                              )
                            }
                            className='w-24'
                          />
                          <span className='text-sm text-gray-600'>
                            ({slot.hours.toFixed(1)}h)
                          </span>
                        </div>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() =>
                            removeTimeSlot(dayKey as keyof Schedule, slot.id)
                          }
                          className='text-red-600 hover:text-red-700'
                        >
                          🗑️
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
