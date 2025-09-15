'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import AssignmentForm, {
  type AssignmentFormData,
} from '@/components/assignments/AssignmentForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navigation from '@/components/layout/Navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardUrl } from '@/hooks/useDashboardUrl';
import {
  logAssignmentCreationActivity,
  logAssignmentDeleteActivity,
  logAssignmentUpdateActivityDetailed,
} from '@/lib/activities-query';
import { supabase } from '@/lib/database';
import { notificationService } from '@/lib/notification-service';
import type { NotificationType } from '@/types';
import type { Json } from '@/types/supabase';
import { logger } from '@/utils/logger';

interface Assignment {
  id: string;
  user_id: string;
  worker_id: string;
  assignment_type: string;
  monthly_hours: number;
  schedule: Record<string, unknown>;
  start_date: string;
  end_date?: string | null;
  status: string;
  priority: number;
  notes: string;
  created_at: string;
  user?: { name: string | null; surname: string | null };
  worker?: { name: string | null; surname: string | null };
}

// Función para enviar notificación de nueva asignación
async function sendNewAssignmentNotification(
  workerId: string,
  userId: string,
  weeklyHours: number
): Promise<boolean> {
  try {
    // Obtener información del usuario y trabajadora
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, surname')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.warn('Error obteniendo datos del usuario para notificación', {
        userId,
        error: userError,
      });
      return false;
    }

    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('name, surname')
      .eq('id', workerId)
      .single();

    if (workerError) {
      logger.warn(
        'Error obteniendo datos de la trabajadora para notificación',
        { workerId, error: workerError }
      );
      return false;
    }

    if (userData === null || workerData === null) {
      logger.warn(
        'Datos incompletos para enviar notificación de nueva asignación',
        { userId, workerId }
      );
      return false;
    }

    const userName = `${userData.name ?? ''} ${userData.surname ?? ''}`.trim();
    const workerName =
      `${workerData.name ?? ''} ${workerData.surname ?? ''}`.trim();

    // Verificar que las tablas existan antes de enviar notificación
    try {
      await supabase.from('worker_notifications').select('id').limit(1);
    } catch {
      logger.warn(
        'Tabla worker_notifications no encontrada, creando notificación básica',
        { workerId, userId }
      );
      // Crear notificación básica sin usar el servicio completo
      const { error: basicError } = await supabase
        .from('worker_notifications')
        .insert({
          worker_id: workerId,
          title: '👤 Nueva asignación',
          body: `Se te ha asignado un nuevo usuario: ${userName} con ${weeklyHours}h semanales`,
          type: 'new_user',
          priority: 'high',
          data: {
            userName,
            weeklyHours,
            assignmentType: 'nueva asignación',
          },
        });

      if (basicError) {
        logger.error('Error creando notificación básica de nueva asignación', {
          workerId,
          userId,
          error: basicError,
        });
        return false;
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Notificación básica creada para ${workerName}`);
      return true;
    }

    // Enviar notificación completa usando el servicio
    const notificationResult =
      await notificationService.createAndSendNotification(workerId, {
        message: `Se te ha asignado un nuevo usuario: ${userName} con ${weeklyHours}h semanales`,
        notification_type: 'new_user',
        title: '👤 Nueva asignación',
        body: `Se te ha asignado un nuevo usuario: ${userName} con ${weeklyHours}h semanales`,
        type: 'new_user' as NotificationType,
        priority: 'high',
        data: {
          userName,
          weeklyHours,
          assignmentType: 'nueva asignación',
        },
      });

    if (notificationResult !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `✅ Notificación enviada a ${workerName}: Nueva asignación con ${userName}`
      );
      return true;
    }

    logger.error('Error enviando notificación de nueva asignación', {
      workerId,
      userId,
      workerName,
      userName,
    });
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error general en notificación de nueva asignación', {
      workerId,
      userId,
      error: errorMessage,
    });
    // No relanzar el error para no interrumpir el flujo principal
    return false;
  }
}

// Función para enviar notificación de cambio de asignación
async function sendAssignmentChangeNotification(
  workerId: string,
  userId: string,
  oldHours: number,
  newHours: number
): Promise<boolean> {
  try {
    // Obtener información del usuario y trabajadora
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, surname')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.warn('Error obteniendo datos del usuario para notificación', {
        userId,
        error: userError,
      });
      return false;
    }

    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('name, surname')
      .eq('id', workerId)
      .single();

    if (workerError) {
      logger.warn(
        'Error obteniendo datos de la trabajadora para notificación',
        { workerId, error: workerError }
      );
      return false;
    }

    if (userData === null || workerData === null) {
      logger.warn(
        'Datos incompletos para enviar notificación de cambio de asignación',
        { userId, workerId }
      );
      return false;
    }

    const userName = `${userData.name ?? ''} ${userData.surname ?? ''}`.trim();
    const workerName =
      `${workerData.name ?? ''} ${workerData.surname ?? ''}`.trim();

    // Crear mensaje descriptivo del cambio
    const hoursChange = newHours > oldHours ? 'aumentado' : 'reducido';
    const changeAmount = Math.abs(newHours - oldHours);

    // Verificar que las tablas existan antes de enviar notificación
    try {
      await supabase.from('worker_notifications').select('id').limit(1);
    } catch {
      logger.warn(
        'Tabla worker_notifications no encontrada, creando notificación básica',
        { workerId, userId }
      );
      // Crear notificación básica sin usar el servicio completo
      const { error: basicError } = await supabase
        .from('worker_notifications')
        .insert({
          worker_id: workerId,
          title: '📋 Asignación modificada',
          body: `Tus horas semanales han sido ${hoursChange} de ${oldHours}h a ${newHours}h (${changeAmount > 0 ? '+' : ''}${changeAmount}h)`,
          type: 'assignment_change',
          priority: 'high',
          data: {
            userName,
            oldHours,
            newHours,
            difference: changeAmount,
            changeType: hoursChange,
          },
        });

      if (basicError) {
        logger.error(
          'Error creando notificación básica de cambio de asignación',
          { workerId, userId, error: basicError }
        );
        return false;
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Notificación básica creada para ${workerName}`);
      return true;
    }

    // Enviar notificación completa usando el servicio
    const notificationResult =
      await notificationService.createAndSendNotification(workerId, {
        message: `Tus horas semanales han sido ${hoursChange} de ${oldHours}h a ${newHours}h (${changeAmount > 0 ? '+' : ''}${changeAmount}h)`,
        notification_type: 'assignment_change',
        title: '📋 Asignación modificada',
        body: `Tus horas semanales han sido ${hoursChange} de ${oldHours}h a ${newHours}h (${changeAmount > 0 ? '+' : ''}${changeAmount}h)`,
        type: 'assignment_change' as NotificationType,
        priority: 'high',
        data: {
          userName,
          oldHours,
          newHours,
          difference: changeAmount,
          changeType: hoursChange,
          assignmentType: 'trabajo semanal',
        },
      });

    if (notificationResult !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `✅ Notificación enviada a ${workerName}: ${oldHours}h → ${newHours}h`
      );
      return true;
    }

    logger.error('Error enviando notificación de cambio de asignación', {
      workerId,
      userId,
      workerName,
      userName,
      oldHours,
      newHours,
    });
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error general en notificación de cambio de asignación', {
      workerId,
      userId,
      error: errorMessage,
    });
    // No relanzar el error para no interrumpir el flujo principal
    return false;
  }
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );

  // Función helper para parsear el schedule de forma segura
  const parseSchedule = (schedule: unknown) => {
    if (typeof schedule === 'string') {
      try {
        return JSON.parse(schedule) as Record<string, unknown>;
      } catch {
        // console.error('Error parsing schedule JSON:', parseErr); // Comentado para producción
        // Retornar un schedule por defecto si el parsing falla
        return {
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
      }
    }
    return schedule;
  };

  // Tipos auxiliares para la configuración de festivos embebida en schedule
  type HolidayTimeSlot = { id: string; start: string; end: string };
  type HolidayConfig = {
    has_holiday_service: boolean;
    holiday_timeSlots: HolidayTimeSlot[];
  };

  type ScheduleWithHoliday = AssignmentFormData['schedule'] & {
    holiday_config?: HolidayConfig;
  };

  // Función para calcular horas semanales basada en el schedule, incluyendo festivos si aplica
  const calculateWeeklyHours = (
    schedule: AssignmentFormData['schedule'] | ScheduleWithHoliday
  ) => {
    let totalHours = 0;

    // Calcular horas de días laborables (lunes a viernes)
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

    // Incluir horas de festivos/fines de semana si está activo
    const maybeWithHoliday = schedule as ScheduleWithHoliday;
    if (maybeWithHoliday.holiday_config?.has_holiday_service === true) {
      let holidayDailyHours = 0;
      (maybeWithHoliday.holiday_config.holiday_timeSlots ?? []).forEach(
        slot => {
          const start = new Date(`2000-01-01T${slot.start}`);
          const end = new Date(`2000-01-01T${slot.end}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          holidayDailyHours += hours;
        }
      );
      // Sumar horas de sábado y domingo
      totalHours += holidayDailyHours * 2;
    }

    return totalHours;
  };

  const dashboardUrl = useDashboardUrl();

  // Limpiar mensajes automáticamente
  useEffect(() => {
    if (error !== null) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [error]);

  useEffect(() => {
    if (successMessage !== null) {
      const t = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [successMessage]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: assignmentsData, error: assignmentsError } =
          await supabase
            .from('assignments')
            .select(
              `
            *,
            user:users!inner(name, surname),
            worker:workers!inner(name, surname)
          `
            )
            .order('created_at', { ascending: false });

        if (assignmentsError !== null) {
          logger.error('Error cargando asignaciones:', assignmentsError);
        } else {
          // Transformar los datos para incluir monthly_hours
          const transformedData = (assignmentsData as unknown[]).map(
            (assignment: unknown) => {
              const assign = assignment as Record<string, unknown>;
              return {
                ...assign,
                monthly_hours:
                  typeof assign['weekly_hours'] === 'number'
                    ? assign['weekly_hours']
                    : 0, // Usar weekly_hours como monthly_hours temporalmente
              };
            }
          ) as Assignment[];

          setAssignments(transformedData);
        }
      } catch (loadErr) {
        logger.error('Error cargando datos:', loadErr);
      } finally {
        setLoading(false);
      }
    };

    loadData().catch(loadErr => {
      logger.error('Error loading data:', loadErr);
    });
  }, []);

  const handleViewAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteModal(true);
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete) return;

    setDeletingAssignment(true);
    try {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete.id);

      if (deleteError !== null) {
        logger.error('Error eliminando asignación:', deleteError);
        setError('Error eliminando asignación');
      } else {
        setAssignments(prev =>
          prev.filter(a => a.id !== assignmentToDelete.id)
        );
        setSuccessMessage('Asignación eliminada correctamente');

        // Log de eliminación de asignación
        const nameMeta = user?.user_metadata?.name as string | undefined;
        const adminName =
          typeof nameMeta === 'string' && nameMeta.trim().length > 0
            ? nameMeta
            : 'Administrador';
        const adminEmail = typeof user?.email === 'string' ? user.email : '';

        // Obtener nombres reales del trabajador y usuario
        const { data: workerData } = await supabase
          .from('workers')
          .select('name, surname')
          .eq('id', assignmentToDelete.worker_id)
          .single();

        const { data: userData } = await supabase
          .from('users')
          .select('name, surname')
          .eq('id', assignmentToDelete.user_id)
          .single();

        const workerName = workerData
          ? `${workerData.name} ${workerData.surname}`.trim()
          : 'Trabajador Desconocido';

        const userName = userData
          ? `${userData.name} ${userData.surname}`.trim()
          : 'Usuario Desconocido';

        await logAssignmentDeleteActivity(
          adminName,
          adminEmail,
          'eliminó',
          assignmentToDelete.assignment_type,
          workerName,
          assignmentToDelete.worker_id,
          userName,
          assignmentToDelete.user_id
        );

        // Cerrar modal y limpiar estado
        setShowDeleteModal(false);
        setAssignmentToDelete(null);
      }
    } catch (deleteErr) {
      logger.error('Error eliminando asignación:', deleteErr);
      setError('Error eliminando asignación');
    } finally {
      setDeletingAssignment(false);
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setAssignmentToDelete(null);
    setDeletingAssignment(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const searchLower = searchTerm.toLowerCase();
    const workerName =
      `${assignment.worker?.name} ${assignment.worker?.surname}`.toLowerCase();
    const userName =
      `${assignment.user?.name} ${assignment.user?.surname}`.toLowerCase();
    const assignmentType = assignment.assignment_type.toLowerCase();

    return (
      workerName.includes(searchLower) ||
      userName.includes(searchLower) ||
      assignmentType.includes(searchLower)
    );
  });

  const getStatusColor = (status: string): string => {
    if (status === 'active') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'laborables':
        return 'bg-blue-100 text-blue-800';
      case 'festivos':
        return 'bg-green-100 text-green-800';
      case 'flexible':
        return 'bg-purple-100 text-purple-800';
      case 'completa':
        return 'bg-orange-100 text-orange-800';
      case 'personalizada':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen flex flex-col'>
        {/* Header Mobile */}
        <header className='bg-white shadow-sm border-b border-gray-200 lg:hidden'>
          <div className='px-4 py-3'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center space-x-2'>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 64 64'
                    width='24'
                    height='24'
                    className='w-full h-full'
                  >
                    <defs>
                      <linearGradient
                        id='mobileAssignmentsLogoGradient'
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
                      fill='url(#mobileAssignmentsLogoGradient)'
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
                <span className='text-base font-bold text-gray-900'>SAD</span>
              </div>
              <Link
                href={dashboardUrl}
                className='flex items-center text-gray-600 hover:text-gray-900 transition-colors'
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
                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                  />
                </svg>
                <span className='text-xs font-medium ml-1'>Volver</span>
              </Link>
            </div>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>
                📋 Asignaciones
              </h1>
              <p className='text-xs text-gray-600 mt-1'>
                Gestiona las asignaciones de trabajadoras
              </p>
            </div>
          </div>
        </header>

        {/* Header Desktop */}
        <header className='hidden lg:block bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <div className='w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 64 64'
                    width='40'
                    height='40'
                    className='w-full h-full'
                  >
                    <defs>
                      <linearGradient
                        id='desktopAssignmentsLogoGradient'
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
                      fill='url(#desktopAssignmentsLogoGradient)'
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
                <div>
                  <h1 className='text-3xl font-bold text-gray-900'>
                    📋 Gestión de Asignaciones
                  </h1>
                  <p className='text-gray-600 mt-1'>
                    Administra las asignaciones entre trabajadoras y usuarios
                  </p>
                </div>
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
                <span className='font-medium'>Volver al Dashboard</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <div className='flex-1 w-full'>
          <div className='px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 max-w-7xl mx-auto'>
            {/* Stats - Mobile First */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8'>
              <Card className='p-4 md:p-5 lg:p-6'>
                <div className='flex flex-col sm:flex-row sm:items-center'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center'>
                      <span className='text-blue-600 text-base md:text-lg'>
                        📋
                      </span>
                    </div>
                    <div className='ml-3 sm:ml-4'>
                      <p className='text-xs md:text-sm font-medium text-gray-500'>
                        Total
                      </p>
                      <p className='text-xl md:text-2xl font-bold text-gray-900'>
                        {assignments.length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className='p-4 md:p-5 lg:p-6'>
                <div className='flex flex-col sm:flex-row sm:items-center'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center'>
                      <span className='text-green-600 text-base md:text-lg'>
                        ✅
                      </span>
                    </div>
                    <div className='ml-3 sm:ml-4'>
                      <p className='text-xs md:text-sm font-medium text-gray-500'>
                        Activas
                      </p>
                      <p className='text-xl md:text-2xl font-bold text-gray-900'>
                        {assignments.filter(a => a.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className='p-4 md:p-5 lg:p-6'>
                <div className='flex flex-col sm:flex-row sm:items-center'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center'>
                      <span className='text-gray-600 text-base md:text-lg'>
                        ⏸️
                      </span>
                    </div>
                    <div className='ml-3 sm:ml-4'>
                      <p className='text-xs md:text-sm font-medium text-gray-500'>
                        Inactivas
                      </p>
                      <p className='text-xl md:text-2xl font-bold text-gray-900'>
                        {
                          assignments.filter(a => a.status === 'inactive')
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className='p-4 md:p-5 lg:p-6'>
                <div className='flex flex-col sm:flex-row sm:items-center'>
                  <div className='flex items-center mb-2 sm:mb-0'>
                    <div className='w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center'>
                      <span className='text-yellow-600 text-base md:text-lg'>
                        🆕
                      </span>
                    </div>
                    <div className='ml-3 sm:ml-4'>
                      <p className='text-xs md:text-sm font-medium text-gray-500'>
                        Esta Semana
                      </p>
                      <p className='text-xl md:text-2xl font-bold text-gray-900'>
                        {
                          assignments.filter(a => {
                            if (a.created_at === null) return false;
                            const createdDate = new Date(a.created_at);
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return createdDate >= weekAgo;
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search and Actions - Mobile First */}
            <div className='mb-4 md:mb-6'>
              <div className='flex flex-col sm:flex-row gap-3 md:gap-4'>
                <div className='flex-1'>
                  <Input
                    type='text'
                    placeholder='Buscar asignación...'
                    value={searchTerm}
                    onChange={handleSearch}
                    className='w-full text-sm md:text-base'
                  />
                </div>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className='bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base px-4 py-2 md:px-6'
                >
                  <span className='md:hidden'>+ Nueva</span>
                  <span className='hidden md:inline'>+ Nueva Asignación</span>
                </Button>
              </div>
            </div>

            {/* Mensajes de Éxito y Error */}
            {successMessage !== null && (
              <div className='mb-3 md:mb-4 rounded-lg bg-green-100 p-3 md:p-4 text-center text-xs md:text-sm text-green-700'>
                {successMessage}
              </div>
            )}
            {error !== null && (
              <div className='mb-3 md:mb-4 rounded-lg bg-red-100 p-3 md:p-4 text-center text-xs md:text-sm text-red-700'>
                {error}
              </div>
            )}

            {/* Assignments List - Mobile First */}
            {loading ? (
              <Card className='p-6 md:p-8'>
                <div className='text-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                  <p className='mt-2 text-sm md:text-base text-gray-600'>
                    Cargando asignaciones...
                  </p>
                </div>
              </Card>
            ) : (
              <div className='space-y-3 md:space-y-4'>
                {filteredAssignments.map(assignment => (
                  <Card key={assignment.id} className='p-4 md:p-5 lg:p-6'>
                    {/* Mobile Layout */}
                    <div className='md:hidden'>
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex items-center space-x-3'>
                          <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
                            <span className='text-blue-600 text-sm font-medium'>
                              {assignment.worker?.name?.charAt(0)}
                              {assignment.worker?.surname?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>
                              {assignment.worker?.name}{' '}
                              {assignment.worker?.surname}
                            </h3>
                            <p className='text-xs text-gray-600'>
                              Usuario: {assignment.user?.name}{' '}
                              {assignment.user?.surname}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2 mb-3'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(assignment.assignment_type)}`}
                        >
                          {assignment.assignment_type === 'laborables'
                            ? 'Laborables'
                            : assignment.assignment_type === 'festivos'
                              ? 'Festivos'
                              : 'Flexible'}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}
                        >
                          {assignment.status === 'active'
                            ? 'Activa'
                            : 'Inactiva'}
                        </span>
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleViewAssignment(assignment)}
                          className='flex-1 text-xs'
                        >
                          Ver
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEditAssignment(assignment)}
                          className='flex-1 text-xs'
                        >
                          Editar
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            handleDeleteAssignment(assignment).catch(delErr => {
                              logger.error(
                                'Error deleting assignment:',
                                delErr
                              );
                            });
                          }}
                          className='flex-1 text-xs text-red-600'
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    {/* Tablet/Desktop Layout */}
                    <div className='hidden md:flex items-center justify-between'>
                      <div className='flex items-center space-x-4'>
                        <div className='flex-shrink-0'>
                          <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center'>
                            <span className='text-blue-600 font-medium'>
                              {assignment.worker?.name?.charAt(0)}
                              {assignment.worker?.surname?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className='text-lg font-medium text-gray-900'>
                            {assignment.worker?.name}{' '}
                            {assignment.worker?.surname}
                          </h3>
                          <p className='text-gray-600'>
                            Para: {assignment.user?.name}{' '}
                            {assignment.user?.surname}
                          </p>
                          <div className='flex items-center space-x-2 mt-1'>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(assignment.assignment_type)}`}
                            >
                              {assignment.assignment_type === 'laborables'
                                ? '🎉 Laborables'
                                : assignment.assignment_type === 'festivos'
                                  ? '🎉 Festivos'
                                  : '🔄 Flexible'}
                            </span>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}
                            >
                              {assignment.status === 'active'
                                ? 'Activa'
                                : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center space-x-3'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleViewAssignment(assignment)}
                          className='text-blue-600 hover:text-blue-900'
                        >
                          👁️ Ver
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEditAssignment(assignment)}
                          className='text-yellow-600 hover:text-yellow-900'
                        >
                          ✏️ Editar
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            handleDeleteAssignment(assignment).catch(delErr => {
                              logger.error(
                                'Error deleting assignment:',
                                delErr
                              );
                            });
                          }}
                          className='text-red-600 hover:text-red-900'
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignment Forms */}
        <AssignmentForm
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={data => {
            const handleSubmit = async () => {
              try {
                // Incluir configuración de festivos en el schedule persistido
                const scheduleWithHoliday: ScheduleWithHoliday = {
                  ...data.schedule,
                  holiday_config: {
                    has_holiday_service: data.has_holiday_service,
                    holiday_timeSlots: data.holiday_timeSlots,
                  },
                };

                // Calcular horas semanales (incluye festivos si aplica)
                const totalHours = calculateWeeklyHours(scheduleWithHoliday);

                // Validación: weekly_hours debe ser > 0
                if (totalHours <= 0) {
                  setError(
                    'Debes configurar al menos un tramo horario válido para crear la asignación.'
                  );
                  return;
                }

                const { error: createError } = await supabase
                  .from('assignments')
                  .insert([
                    {
                      user_id: data.user_id,
                      worker_id: data.worker_id,
                      assignment_type: data.assignment_type,
                      start_date: data.start_date,
                      end_date:
                        data.end_date.trim() === '' ? null : data.end_date,
                      schedule: scheduleWithHoliday as unknown as Json,
                      notes: data.notes,
                      status: 'active',
                      weekly_hours: totalHours,
                    },
                  ]);

                if (createError) {
                  logger.error('Error creando asignación:', createError);
                  const message =
                    (
                      createError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).message ??
                    (
                      createError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).details ??
                    (
                      createError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).code ??
                    'Error desconocido';
                  setError(`Error creando asignación: ${message}`);
                } else {
                  // Recargar datos
                  const { data: newAssignments } = await supabase
                    .from('assignments')
                    .select(
                      `
                        *,
                        user:users!inner(name, surname),
                        worker:workers!inner(name, surname)
                      `
                    )
                    .order('created_at', { ascending: false });

                  // Transformar datos para incluir monthly_hours
                  const transformedData = (newAssignments as unknown[]).map(
                    (assignment: unknown) => {
                      const assign = assignment as Record<string, unknown>;
                      return {
                        ...assign,
                        monthly_hours:
                          typeof assign['weekly_hours'] === 'number'
                            ? assign['weekly_hours']
                            : 0,
                      };
                    }
                  ) as Assignment[];

                  setAssignments(transformedData);
                  setShowAddModal(false);
                  setSuccessMessage('Asignación creada correctamente');

                  // Enviar notificación a la trabajadora sobre la nueva asignación
                  try {
                    const newAssignment = transformedData.find(
                      a =>
                        a.worker_id === data.worker_id &&
                        a.user_id === data.user_id
                    );

                    if (newAssignment) {
                      const notificationSent =
                        await sendNewAssignmentNotification(
                          data.worker_id,
                          data.user_id,
                          totalHours
                        );

                      if (!notificationSent) {
                        logger.warn(
                          'No se pudo enviar notificación de nueva asignación, pero la asignación se creó correctamente',
                          { workerId: data.worker_id, userId: data.user_id }
                        );
                      }
                    }
                  } catch (notificationError) {
                    logger.warn(
                      'Error enviando notificación de nueva asignación, pero la asignación se creó correctamente',
                      {
                        workerId: data.worker_id,
                        userId: data.user_id,
                        error: notificationError,
                      }
                    );
                  }

                  // Log de creación de asignación
                  const nameMeta = user?.user_metadata?.name as
                    | string
                    | undefined;
                  const adminName =
                    typeof nameMeta === 'string' && nameMeta.trim().length > 0
                      ? nameMeta
                      : 'Administrador';
                  const adminEmail =
                    typeof user?.email === 'string' ? user.email : '';

                  // Obtener nombres reales del trabajador y usuario
                  const { data: workerData } = await supabase
                    .from('workers')
                    .select('name, surname')
                    .eq('id', data.worker_id)
                    .single();

                  const { data: userData } = await supabase
                    .from('users')
                    .select('name, surname')
                    .eq('id', data.user_id)
                    .single();

                  const workerName = workerData
                    ? `${workerData.name} ${workerData.surname}`.trim()
                    : 'Trabajador Desconocido';

                  const userName = userData
                    ? `${userData.name} ${userData.surname}`.trim()
                    : 'Usuario Desconocido';

                  await logAssignmentCreationActivity(
                    adminName,
                    adminEmail,
                    'creó',
                    data.assignment_type,
                    workerName,
                    data.worker_id,
                    userName,
                    data.user_id,
                    data.start_date,
                    data.end_date.trim() === '' ? '' : data.end_date,
                    calculateWeeklyHours(scheduleWithHoliday)
                  );
                }
              } catch (createErr) {
                logger.error('Error creando asignación:', createErr);
                const message =
                  typeof createErr === 'object' && createErr !== null
                    ? ((createErr as { message?: string; name?: string })
                        .message ??
                      (createErr as { name?: string }).name ??
                      'Error desconocido')
                    : String(createErr);
                setError(`Error creando asignación: ${message}`);
              }
            };
            handleSubmit().catch(err => {
              logger.error('Error in handleSubmit:', err);
              setError('Error procesando la solicitud');
            });
          }}
          mode='create'
        />

        <AssignmentForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
          }}
          onSubmit={data => {
            const handleSubmit = async () => {
              if (!editingAssignment) return;

              try {
                // Incluir configuración de festivos en el schedule persistido
                const scheduleWithHoliday: ScheduleWithHoliday = {
                  ...data.schedule,
                  holiday_config: {
                    has_holiday_service: data.has_holiday_service,
                    holiday_timeSlots: data.holiday_timeSlots,
                  },
                };

                // Validación: weekly_hours debe ser > 0 en actualización
                const updatedWeeklyHours =
                  calculateWeeklyHours(scheduleWithHoliday);
                if (updatedWeeklyHours <= 0) {
                  setError(
                    'Debes configurar al menos un tramo horario válido para actualizar la asignación.'
                  );
                  return;
                }

                const { error: updateError } = await supabase
                  .from('assignments')
                  .update({
                    user_id: data.user_id,
                    worker_id: data.worker_id,
                    assignment_type: data.assignment_type,
                    start_date: data.start_date,
                    end_date:
                      data.end_date.trim() === '' ? null : data.end_date,
                    schedule: scheduleWithHoliday as unknown as Json,
                    notes: data.notes,
                    // Calcular weekly_hours basado en el schedule (incluye festivos)
                    weekly_hours: updatedWeeklyHours,
                  })
                  .eq('id', editingAssignment.id)
                  .select();

                if (updateError) {
                  logger.error('Error actualizando asignación:', updateError);
                  const message =
                    (
                      updateError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).message ??
                    (
                      updateError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).details ??
                    (
                      updateError as {
                        message?: string;
                        details?: string;
                        code?: string;
                      }
                    ).code ??
                    'Error desconocido';
                  setError(`Error actualizando asignación: ${message}`);
                } else {
                  // Enviar notificación a la trabajadora sobre el cambio de asignación
                  const notificationSent =
                    await sendAssignmentChangeNotification(
                      editingAssignment.worker_id,
                      editingAssignment.user_id,
                      editingAssignment.monthly_hours ?? 0,
                      updatedWeeklyHours
                    );

                  if (!notificationSent) {
                    logger.warn(
                      'No se pudo enviar notificación de cambio de asignación, pero la actualización continúa',
                      {
                        editingAssignment: editingAssignment.id,
                      }
                    );
                  }

                  // Recargar datos
                  const { data: updatedAssignments } = await supabase
                    .from('assignments')
                    .select(
                      `
                        *,
                        user:users!inner(name, surname),
                        worker:workers!inner(name, surname)
                      `
                    )
                    .order('created_at', { ascending: false });

                  // Transformar datos para incluir monthly_hours
                  const transformedData = (updatedAssignments as unknown[]).map(
                    (assignment: unknown) => {
                      const assign = assignment as Record<string, unknown>;
                      return {
                        ...assign,
                        monthly_hours:
                          typeof assign['weekly_hours'] === 'number'
                            ? assign['weekly_hours']
                            : 0,
                      };
                    }
                  ) as Assignment[];

                  setAssignments(transformedData);
                  setShowEditModal(false);
                  setEditingAssignment(null);
                  setSuccessMessage('Asignación actualizada correctamente');

                  // Log de actualización de asignación
                  const nameMeta = user?.user_metadata?.name as
                    | string
                    | undefined;
                  const adminName =
                    typeof nameMeta === 'string' && nameMeta.trim().length > 0
                      ? nameMeta
                      : 'Administrador';
                  const adminEmail =
                    typeof user?.email === 'string' ? user.email : '';

                  // Obtener nombres reales del trabajador y usuario
                  const { data: workerData } = await supabase
                    .from('workers')
                    .select('name, surname')
                    .eq('id', data.worker_id)
                    .single();

                  const { data: userData } = await supabase
                    .from('users')
                    .select('name, surname')
                    .eq('id', data.user_id)
                    .single();

                  const workerName = workerData
                    ? `${workerData.name} ${workerData.surname}`.trim()
                    : 'Trabajador Desconocido';

                  const userName = userData
                    ? `${userData.name} ${userData.surname}`.trim()
                    : 'Usuario Desconocido';

                  await logAssignmentUpdateActivityDetailed(
                    adminName,
                    adminEmail,
                    'actualizó',
                    editingAssignment.id,
                    data.assignment_type,
                    workerName,
                    data.worker_id,
                    userName,
                    data.user_id,
                    data.start_date,
                    data.end_date.trim() === '' ? '' : data.end_date,
                    updatedWeeklyHours
                  );
                }
              } catch (updateErr) {
                logger.error('Error actualizando asignación:', updateErr);
                const message =
                  typeof updateErr === 'object' && updateErr !== null
                    ? ((updateErr as { message?: string; name?: string })
                        .message ??
                      (updateErr as { name?: string }).name ??
                      'Error desconocido')
                    : String(updateErr);
                setError(`Error actualizando asignación: ${message}`);
              }
            };
            handleSubmit().catch(err => {
              logger.error('Error in handleSubmit:', err);
              setError('Error procesando la solicitud');
            });
          }}
          initialData={
            editingAssignment
              ? (() => {
                  const parsed = parseSchedule(
                    editingAssignment.schedule
                  ) as ScheduleWithHoliday;
                  return {
                    user_id: editingAssignment.user_id,
                    worker_id: editingAssignment.worker_id,
                    assignment_type: editingAssignment.assignment_type as
                      | 'laborables'
                      | 'festivos'
                      | 'flexible',
                    start_date: editingAssignment.start_date,
                    end_date: editingAssignment.end_date ?? '',
                    schedule: parsed as AssignmentFormData['schedule'],
                    has_holiday_service:
                      parsed.holiday_config?.has_holiday_service ?? false,
                    holiday_timeSlots:
                      parsed.holiday_config?.holiday_timeSlots ?? [],
                    notes: editingAssignment.notes ?? '',
                  };
                })()
              : {}
          }
          mode='edit'
        />

        <AssignmentForm
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          onSubmit={() => {
            // Función vacía para modo view
          }}
          initialData={
            selectedAssignment
              ? (() => {
                  const parsed = parseSchedule(
                    selectedAssignment.schedule
                  ) as ScheduleWithHoliday;
                  return {
                    user_id: selectedAssignment.user_id,
                    worker_id: selectedAssignment.worker_id,
                    assignment_type: selectedAssignment.assignment_type as
                      | 'laborables'
                      | 'festivos'
                      | 'flexible',
                    start_date: selectedAssignment.start_date,
                    end_date: selectedAssignment.end_date ?? '',
                    schedule: parsed as AssignmentFormData['schedule'],
                    has_holiday_service:
                      parsed.holiday_config?.has_holiday_service ?? false,
                    holiday_timeSlots:
                      parsed.holiday_config?.holiday_timeSlots ?? [],
                    notes: selectedAssignment.notes ?? '',
                  };
                })()
              : {}
          }
          mode='view'
        />

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={showDeleteModal}
          onClose={handleDeleteModalClose}
          title='Confirmar Eliminación'
          size='md'
        >
          <div className='space-y-6'>
            <div className='text-center'>
              <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4'>
                <svg
                  className='h-6 w-6 text-red-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                ¿Eliminar Asignación?
              </h3>
              <p className='text-sm text-gray-500'>
                ¿Estás seguro de que quieres eliminar la asignación de{' '}
                <span className='font-semibold text-gray-700'>
                  {assignmentToDelete?.worker?.name}{' '}
                  {assignmentToDelete?.worker?.surname}
                </span>{' '}
                para{' '}
                <span className='font-semibold text-gray-700'>
                  {assignmentToDelete?.user?.name}{' '}
                  {assignmentToDelete?.user?.surname}
                </span>
                ?
              </p>
              <p className='text-xs text-gray-400 mt-2'>
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3'>
              <Button
                variant='outline'
                className='w-full sm:w-auto'
                onClick={() => {
                  handleDeleteModalClose();
                }}
                disabled={deletingAssignment}
              >
                ❌ Cancelar
              </Button>
              <Button
                className='w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white'
                onClick={() => {
                  handleDeleteAssignmentConfirm().catch(err => {
                    logger.error(
                      'Error in handleDeleteAssignmentConfirm:',
                      err
                    );
                    setError('Error eliminando la asignación');
                  });
                }}
                disabled={deletingAssignment}
              >
                {deletingAssignment ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  '🗑️ Eliminar Asignación'
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Footer - Mobile First */}
        <footer className='border-t border-gray-200 bg-white py-6 md:py-8 mt-auto mb-16 md:mb-0'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <p className='text-xs md:text-sm text-gray-600 mb-1 md:mb-2 font-medium'>
                © 2025 SAD - Sistema de Gestión
              </p>
              <p className='text-xs text-gray-500'>
                Hecho con ❤️ por{' '}
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
