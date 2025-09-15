'use client';

import React, { useEffect, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/database';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  client_code: string;
}

interface Worker {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  dni: string;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  timeSlots: TimeSlot[];
}

export interface AssignmentFormData {
  user_id: string;
  worker_id: string;
  assignment_type: 'laborables' | 'festivos' | 'flexible';
  start_date: string;
  end_date: string;
  has_holiday_service: boolean;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  holiday_timeSlots: TimeSlot[];
  notes: string;
}

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentFormData) => void;
  initialData?: Partial<AssignmentFormData>;
  mode: 'create' | 'edit' | 'view';
}

export default function AssignmentForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: AssignmentFormProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    user_id: '',
    worker_id: '',
    assignment_type: 'laborables',
    start_date: '',
    end_date: '',
    has_holiday_service: false,
    schedule: {
      monday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      tuesday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      wednesday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      thursday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      friday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      saturday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      sunday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
    },
    holiday_timeSlots: [],
    notes: '',
  });

  // Log para debuggear el estado del formulario
  useEffect(() => {
    // Debug logs comentados para producción
  }, [formData]);

  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedUser, setSelectedUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);

  // Cargar usuarios y trabajadoras
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar usuarios
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, surname, email, client_code')
          .eq('is_active', true)
          .order('name');

        if (usersError) {
          // eslint-disable-next-line no-console
          console.error('Error cargando usuarios:', usersError);
        } else {
          setUsers(usersData ?? []);
          setFilteredUsers(usersData ?? []);
        }

        // Cargar trabajadoras
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('id, name, surname, email, dni')
          .eq('is_active', true)
          .order('name');

        if (workersError) {
          // eslint-disable-next-line no-console
          console.error('Error cargando trabajadoras:', workersError);
        } else {
          setWorkers(workersData ?? []);
          setFilteredWorkers(workersData ?? []);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando datos:', error);
      }
    };

    loadData().catch(error => {
      // eslint-disable-next-line no-console
      console.error('Error loading data:', error);
    });
  }, []);

  // Función helper para validar y normalizar el schedule
  const normalizeSchedule = (schedule: unknown) => {
    const defaultSchedule = {
      monday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      tuesday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      wednesday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      thursday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      friday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      saturday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
      sunday: {
        enabled: false,
        timeSlots: [{ id: '1', start: '08:00', end: '16:00' }],
      },
    };

    if (
      schedule === null ||
      schedule === undefined ||
      typeof schedule !== 'object'
    ) {
      return defaultSchedule;
    }

    const scheduleObj = schedule as Record<string, unknown>;
    const normalizedSchedule = { ...defaultSchedule };

    // Validar cada día del schedule
    Object.keys(defaultSchedule).forEach(day => {
      const daySchedule = scheduleObj[day];
      if (
        daySchedule !== null &&
        daySchedule !== undefined &&
        typeof daySchedule === 'object'
      ) {
        const dayObj = daySchedule as Record<string, unknown>;
        normalizedSchedule[day as keyof typeof normalizedSchedule] = {
          enabled:
            typeof dayObj['enabled'] === 'boolean' ? dayObj['enabled'] : false,
          timeSlots: Array.isArray(dayObj['timeSlots'])
            ? dayObj['timeSlots'].map((slot: unknown, index: number) => {
                if (
                  slot !== null &&
                  slot !== undefined &&
                  typeof slot === 'object'
                ) {
                  const slotObj = slot as Record<string, unknown>;
                  return {
                    id:
                      typeof slotObj['id'] === 'string'
                        ? slotObj['id']
                        : `${day}-${index + 1}`,
                    start:
                      typeof slotObj['start'] === 'string'
                        ? slotObj['start']
                        : '08:00',
                    end:
                      typeof slotObj['end'] === 'string'
                        ? slotObj['end']
                        : '16:00',
                  };
                }
                return {
                  id: `${day}-${index + 1}`,
                  start: '08:00',
                  end: '16:00',
                };
              })
            : [{ id: `${day}-1`, start: '08:00', end: '16:00' }],
        };
      }
    });

    return normalizedSchedule;
  };

  // Inicializar datos si estamos en modo edición
  useEffect(() => {
    if (
      initialData &&
      Object.keys(initialData).length > 0 &&
      (mode === 'edit' || mode === 'view')
    ) {
      // Extraer configuración de festivos desde el schedule si viene embebida
      const scheduleObj =
        (initialData.schedule as unknown as Record<string, unknown>) ?? {};
      const holidayConfig = scheduleObj['holiday_config'] as
        | {
            has_holiday_service?: boolean;
            holiday_timeSlots?: Array<{
              id: string;
              start: string;
              end: string;
            }>;
          }
        | undefined;

      const normalizedData = {
        ...initialData,
        has_holiday_service:
          initialData.has_holiday_service ??
          holidayConfig?.has_holiday_service ??
          false,
        holiday_timeSlots:
          initialData.holiday_timeSlots ??
          holidayConfig?.holiday_timeSlots ??
          [],
        schedule: normalizeSchedule(initialData.schedule),
      };

      setFormData(prev => {
        const newData = { ...prev, ...normalizedData };
        return newData;
      });
    }
  }, [initialData, mode]); // Removí users y workers de las dependencias

  // Manejar selección de usuario y trabajadora cuando se cargan los datos
  useEffect(() => {
    if (
      initialData &&
      Object.keys(initialData).length > 0 &&
      users.length > 0 &&
      workers.length > 0 &&
      (mode === 'edit' || mode === 'view')
    ) {
      // Buscar usuario y trabajadora seleccionados
      if (initialData.user_id != null) {
        const user = users.find(u => u.id === initialData.user_id);
        if (user != null) {
          setSelectedUser(user);
          setUserSearchTerm(`${user.name} ${user.surname}`);
        }
      }

      if (initialData.worker_id != null) {
        const worker = workers.find(w => w.id === initialData.worker_id);
        if (worker != null) {
          setSelectedWorker(worker);
          setWorkerSearchTerm(`${worker.name} ${worker.surname}`);
        }
      }
    }
  }, [users, workers, mode, initialData]); // Agregué initialData de vuelta para evitar el warning

  // Filtrar usuarios en tiempo real
  useEffect(() => {
    const filtered = users.filter(user =>
      `${user.name} ${user.surname} ${user.client_code}`
        .toLowerCase()
        .includes(userSearchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

  // Filtrar trabajadoras en tiempo real
  useEffect(() => {
    const filtered = workers.filter(worker =>
      `${worker.name} ${worker.surname}`
        .toLowerCase()
        .includes(workerSearchTerm.toLowerCase())
    );
    setFilteredWorkers(filtered);
  }, [workerSearchTerm, workers]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearchTerm(`${user.name} ${user.surname}`);
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setShowUserDropdown(false);
  };

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setWorkerSearchTerm(`${worker.name} ${worker.surname}`);
    setFormData(prev => ({ ...prev, worker_id: worker.id }));
    setShowWorkerDropdown(false);
  };

  const handleDayToggle = (day: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day as keyof typeof prev.schedule],
          enabled,
        },
      },
    }));
  };

  const addHolidayTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `holiday-${Date.now()}`,
      start: '08:00',
      end: '16:00',
    };
    setFormData(prev => ({
      ...prev,
      holiday_timeSlots: [...prev.holiday_timeSlots, newSlot],
    }));
  };

  const removeHolidayTimeSlot = (slotId: string) => {
    setFormData(prev => ({
      ...prev,
      holiday_timeSlots: prev.holiday_timeSlots.filter(
        slot => slot.id !== slotId
      ),
    }));
  };

  const updateHolidayTimeSlot = (
    slotId: string,
    field: 'start' | 'end',
    value: string
  ) => {
    // Limpiar el valor de entrada (solo números)
    const cleanValue = value.replace(/[^0-9]/g, '');

    // Formatear automáticamente
    let formattedValue = '';
    if (cleanValue.length >= 1) {
      formattedValue = cleanValue.substring(0, 2);
      if (cleanValue.length >= 3) {
        formattedValue = `${formattedValue}:${cleanValue.substring(2, 4)}`;
      }
    }

    // Validar formato completo cuando tenga 5 caracteres (HH:MM)
    if (formattedValue.length === 5) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formattedValue)) {
        return; // No actualizar si el formato no es válido
      }
    }

    // Permitir escritura parcial (ej: '11', '11:', '11:15')
    if (formattedValue.length <= 5) {
      setFormData(prev => ({
        ...prev,
        holiday_timeSlots: prev.holiday_timeSlots.map(slot => {
          if (slot.id === slotId) {
            return { ...slot, [field]: formattedValue };
          }
          return slot;
        }),
      }));
    }
  };

  const addTimeSlot = (day: string) => {
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      start: '08:00',
      end: '16:00',
    };

    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day as keyof typeof prev.schedule],
          timeSlots: [
            ...prev.schedule[day as keyof typeof prev.schedule].timeSlots,
            newSlot,
          ],
        },
      },
    }));
  };

  const removeTimeSlot = (day: string, slotId: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day as keyof typeof prev.schedule],
          timeSlots: prev.schedule[
            day as keyof typeof prev.schedule
          ].timeSlots.filter(slot => slot.id !== slotId),
        },
      },
    }));
  };

  const updateTimeSlot = (
    day: string,
    slotId: string,
    field: 'start' | 'end',
    value: string
  ) => {
    // Limpiar el valor de entrada (solo números)
    const cleanValue = value.replace(/[^0-9]/g, '');

    // Formatear automáticamente
    let formattedValue = '';
    if (cleanValue.length >= 1) {
      formattedValue = cleanValue.substring(0, 2);
      if (cleanValue.length >= 3) {
        formattedValue = `${formattedValue}:${cleanValue.substring(2, 4)}`;
      }
    }

    // Validar formato completo cuando tenga 5 caracteres (HH:MM)
    if (formattedValue.length === 5) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formattedValue)) {
        return; // No actualizar si el formato no es válido
      }
    }

    // Permitir escritura parcial (ej: '11', '11:', '11:15')
    if (formattedValue.length <= 5) {
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: {
            ...prev.schedule[day as keyof typeof prev.schedule],
            timeSlots: prev.schedule[
              day as keyof typeof prev.schedule
            ].timeSlots.map(slot => {
              if (slot.id === slotId) {
                return { ...slot, [field]: formattedValue };
              }
              return slot;
            }),
          },
        },
      }));
    }
  };

  const calculateRegularHours = (schedule: typeof formData.schedule) => {
    let totalHours = 0;
    // Solo contar días laborables (lunes a viernes)
    const workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    workDays.forEach(day => {
      const daySchedule = schedule[day as keyof typeof schedule];
      if (daySchedule.enabled) {
        daySchedule.timeSlots.forEach(slot => {
          const start = new Date(`2000-01-01T${slot.start}`);
          const end = new Date(`2000-01-01T${slot.end}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        });
      }
    });
    return totalHours;
  };

  const calculateHolidayHours = () => {
    let totalHours = 0;
    formData.holiday_timeSlots.forEach(slot => {
      const start = new Date(`2000-01-01T${slot.start}`);
      const end = new Date(`2000-01-01T${slot.end}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    });
    return totalHours;
  };

  const calculateTotalHours = () => {
    const regularHours = calculateRegularHours(formData.schedule);
    const holidayHours = calculateHolidayHours();

    // Si hay servicio en festivos, multiplicar por 7 días (incluyendo sábado y domingo)
    // Si no hay servicio en festivos, solo contar días laborables
    const totalWeeklyHours = formData.has_holiday_service
      ? regularHours + holidayHours * 2 // 2 días (sábado y domingo)
      : regularHours;

    return totalWeeklyHours;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalHours = calculateTotalHours();

      const submissionData = {
        ...formData,
        monthly_hours: totalHours * 4, // Aproximación mensual
      };

      onSubmit(submissionData);
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error enviando formulario:', error);
    } finally {
      setLoading(false);
    }
  };

  const workDays = [
    { key: 'monday', label: 'Lunes', icon: '1️⃣' },
    { key: 'tuesday', label: 'Martes', icon: '2️⃣' },
    { key: 'wednesday', label: 'Miércoles', icon: '3️⃣' },
    { key: 'thursday', label: 'Jueves', icon: '4️⃣' },
    { key: 'friday', label: 'Viernes', icon: '5️⃣' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${mode === 'create' ? 'Crear' : mode === 'edit' ? 'Editar' : 'Ver'} Asignación`}
      size='lg'
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Selección de Usuario */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            👤 Usuario *
          </label>
          <div className='relative'>
            <Input
              type='text'
              placeholder='Buscar usuario por nombre, apellido o código...'
              value={userSearchTerm}
              onChange={e => {
                setUserSearchTerm(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              disabled={mode === 'view'}
            />
            {/* Debug logs comentados para producción */}
            {/* {(() => {
              console.log(
                '🔍 DEBUG - Campo usuario - userSearchTerm:',
                userSearchTerm
              );
              console.log(
                '🔍 DEBUG - Campo usuario - formData.user_id:',
                formData.user_id
              );
              return null;
            })()} */}
            {showUserDropdown && filteredUsers.length > 0 && (
              <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto'>
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className='px-4 py-2 hover:bg-gray-100 cursor-pointer'
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className='font-medium'>
                      {user.name} {user.surname}
                    </div>
                    <div className='text-sm text-gray-600'>
                      Código: {user.client_code} | {user.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selección de Trabajadora */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            👷‍♀️ Trabajadora *
          </label>
          <div className='relative'>
            <Input
              type='text'
              placeholder='Buscar trabajadora por nombre, apellido o DNI...'
              value={workerSearchTerm}
              onChange={e => {
                setWorkerSearchTerm(e.target.value);
                setShowWorkerDropdown(true);
              }}
              onFocus={() => setShowWorkerDropdown(true)}
              disabled={mode === 'view'}
            />
            {/* Debug logs comentados para producción */}
            {/* {(() => {
              console.log(
                '🔍 DEBUG - Campo trabajadora - workerSearchTerm:',
                workerSearchTerm
              );
              console.log(
                '🔍 DEBUG - Campo trabajadora - formData.worker_id:',
                formData.worker_id
              );
              return null;
            })()} */}
            {showWorkerDropdown && filteredWorkers.length > 0 && (
              <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto'>
                {filteredWorkers.map(worker => (
                  <div
                    key={worker.id}
                    className='px-4 py-2 hover:bg-gray-100 cursor-pointer'
                    onClick={() => handleWorkerSelect(worker)}
                  >
                    <div className='font-medium'>
                      {worker.name} {worker.surname}
                    </div>
                    <div className='text-sm text-gray-600'>
                      DNI: {worker.dni?.replace(/.(?=.{3}$)/g, '*') ?? '—'} |
                      {` ${worker.email ?? '—'}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tipo de Servicio */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            📋 Tipo de Servicio *
          </label>
          <select
            value={formData.assignment_type}
            onChange={e => {
              setFormData(prev => ({
                ...prev,
                assignment_type: e.target.value as
                  | 'laborables'
                  | 'festivos'
                  | 'flexible',
              }));
            }}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
            disabled={mode === 'view'}
          >
            {/* Debug logs comentados para producción */}
            {/* {(() => {
              console.log(
                '🔍 DEBUG - Renderizando select con value:',
                formData.assignment_type
              );
              return null;
            })()} */}
            <option value='laborables'>Laborables (Lunes a Viernes)</option>
            <option value='festivos'>
              Festivos (Fines de semana y festivos)
            </option>
            <option value='flexible'>Flexible (Laborables y festivos)</option>
          </select>
        </div>

        {/* Servicio en Días Festivos */}
        <div>
          <label className='flex items-center space-x-2'>
            <input
              type='checkbox'
              checked={formData.has_holiday_service}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  has_holiday_service: e.target.checked,
                }))
              }
              disabled={mode === 'view'}
              className='w-4 h-4 text-blue-600 border-gray-400 rounded focus:ring-blue-500 focus:border-blue-500'
            />
            <span className='text-sm font-medium text-gray-700'>
              🎉 Servicio en días festivos y fines de semana
            </span>
          </label>
          <p className='text-xs text-gray-500 mt-1'>
            Activa esta opción si el usuario necesita servicio en días festivos
            y fines de semana
          </p>
        </div>

        {/* Fechas */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              📅 Fecha de Inicio *
            </label>
            <Input
              type='date'
              value={formData.start_date}
              onChange={e =>
                setFormData(prev => ({ ...prev, start_date: e.target.value }))
              }
              required
              disabled={mode === 'view'}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              📅 Fecha de Fin (Opcional)
            </label>
            <Input
              type='date'
              value={formData.end_date}
              onChange={e =>
                setFormData(prev => ({ ...prev, end_date: e.target.value }))
              }
              disabled={mode === 'view'}
            />
          </div>
        </div>

        {/* Horarios Regulares */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-4'>
            🕐 Horarios Regulares (Días Laborables)
          </label>
          <div className='space-y-3'>
            {workDays.map(day => (
              <Card key={day.key} className='p-4'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <input
                        type='checkbox'
                        id={`regular-${day.key}`}
                        checked={
                          formData.schedule[
                            day.key as keyof typeof formData.schedule
                          ].enabled
                        }
                        onChange={e =>
                          handleDayToggle(day.key, e.target.checked)
                        }
                        disabled={mode === 'view'}
                        className='w-4 h-4 text-blue-600 border-gray-400 rounded focus:ring-blue-500 focus:border-blue-500'
                      />
                      <label
                        htmlFor={`regular-${day.key}`}
                        className='flex items-center space-x-2 cursor-pointer'
                      >
                        <span className='text-lg text-gray-900'>
                          {day.icon}
                        </span>
                        <span className='font-medium text-gray-900'>
                          {day.label}
                        </span>
                      </label>
                    </div>
                    {formData.schedule[
                      day.key as keyof typeof formData.schedule
                    ].enabled && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => addTimeSlot(day.key)}
                        disabled={mode === 'view'}
                      >
                        + Tramo
                      </Button>
                    )}
                  </div>

                  {formData.schedule[day.key as keyof typeof formData.schedule]
                    .enabled && (
                    <div className='space-y-2 ml-6'>
                      {formData.schedule[
                        day.key as keyof typeof formData.schedule
                      ].timeSlots.map(slot => (
                        <div
                          key={slot.id}
                          className='flex items-center space-x-2'
                        >
                          <Input
                            type='text'
                            value={slot.start}
                            onChange={e =>
                              updateTimeSlot(
                                day.key,
                                slot.id,
                                'start',
                                e.target.value
                              )
                            }
                            placeholder='HH:MM'
                            disabled={mode === 'view'}
                            className='w-24 text-center'
                            maxLength={5}
                          />
                          <span className='text-gray-500'>a</span>
                          <Input
                            type='text'
                            value={slot.end}
                            onChange={e =>
                              updateTimeSlot(
                                day.key,
                                slot.id,
                                'end',
                                e.target.value
                              )
                            }
                            placeholder='HH:MM'
                            disabled={mode === 'view'}
                            className='w-24 text-center'
                            maxLength={5}
                          />
                          {formData.schedule[
                            day.key as keyof typeof formData.schedule
                          ].timeSlots.length > 1 && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => removeTimeSlot(day.key, slot.id)}
                              disabled={mode === 'view'}
                              className='text-red-600 hover:text-red-700'
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Horarios de Festivos */}
        {formData.has_holiday_service && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-4'>
              🎉 Horarios de Festivos y Fines de Semana
            </label>
            <Card className='p-4 border-orange-200 bg-orange-50'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <span className='text-lg'>🎉</span>
                    <span className='font-medium text-gray-900'>
                      Horario para sábados, domingos y días festivos
                    </span>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addHolidayTimeSlot}
                    disabled={mode === 'view'}
                    className='border-orange-300 text-orange-600 hover:bg-orange-50'
                  >
                    + Tramo
                  </Button>
                </div>

                <div className='space-y-2'>
                  {formData.holiday_timeSlots.map(slot => (
                    <div key={slot.id} className='flex items-center space-x-2'>
                      <Input
                        type='text'
                        value={slot.start}
                        onChange={e =>
                          updateHolidayTimeSlot(
                            slot.id,
                            'start',
                            e.target.value
                          )
                        }
                        placeholder='HH:MM'
                        disabled={mode === 'view'}
                        className='w-24 text-center'
                        maxLength={5}
                      />
                      <span className='text-gray-500'>a</span>
                      <Input
                        type='text'
                        value={slot.end}
                        onChange={e =>
                          updateHolidayTimeSlot(slot.id, 'end', e.target.value)
                        }
                        placeholder='HH:MM'
                        disabled={mode === 'view'}
                        className='w-24 text-center'
                        maxLength={5}
                      />
                      {formData.holiday_timeSlots.length > 1 && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => removeHolidayTimeSlot(slot.id)}
                          disabled={mode === 'view'}
                          className='text-red-600 hover:text-red-700'
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Total de Horas */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium text-blue-800'>
                ⏰ Horas Laborables por Semana (Lunes a Viernes):
              </span>
              <span className='text-lg font-bold text-blue-900'>
                {calculateRegularHours(formData.schedule).toFixed(1)} horas
              </span>
            </div>
            {formData.has_holiday_service && (
              <>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-orange-800'>
                    🎉 Horas de Festivos por Día:
                  </span>
                  <span className='text-lg font-bold text-orange-900'>
                    {calculateHolidayHours().toFixed(1)} horas
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-orange-800'>
                    🎉 Horas de Festivos por Semana (Sábado + Domingo):
                  </span>
                  <span className='text-lg font-bold text-orange-900'>
                    {(calculateHolidayHours() * 2).toFixed(1)} horas
                  </span>
                </div>
              </>
            )}
            <div className='border-t border-blue-200 pt-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-blue-800'>
                  📊 Total de Horas por Semana:
                </span>
                <span className='text-xl font-bold text-blue-900'>
                  {calculateTotalHours().toFixed(1)} horas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            📝 Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={e =>
              setFormData(prev => ({ ...prev, notes: e.target.value }))
            }
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='Notas adicionales sobre la asignación...'
            disabled={mode === 'view'}
          />
        </div>

        {/* Botones */}
        {mode !== 'view' && (
          <div className='flex justify-end space-x-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={
                loading ||
                !formData.user_id ||
                !formData.worker_id ||
                !formData.start_date
              }
            >
              {loading
                ? 'Guardando...'
                : mode === 'create'
                  ? 'Crear Asignación'
                  : 'Actualizar Asignación'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
