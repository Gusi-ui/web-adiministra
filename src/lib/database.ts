import { createClient } from '@supabase/supabase-js';

import type {
  Assignment,
  AssignmentInsert,
  AssignmentUpdate,
  HoursBalance,
  HoursBalanceInsert,
  HoursBalanceUpdate,
  User,
  UserInsert,
  UserUpdate,
  Worker,
  WorkerInsert,
  WorkerUpdate,
} from '@/types/database-types';
import { securityLogger } from '@/utils/security-config';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

// Función para crear cliente de Supabase con validación
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Durante el build, las variables de entorno pueden no estar disponibles
    // Crear un cliente mock para evitar errores
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Importante para tokens de recuperación
    },
  });
};

// Configurar cliente de Supabase con manejo de auth
export const supabase = createSupabaseClient();

// Re-exportar tipos para compatibilidad
export type {
  Assignment,
  AssignmentInsert,
  AssignmentUpdate,
  HoursBalance,
  HoursBalanceInsert,
  HoursBalanceUpdate,
  User,
  UserInsert,
  UserUpdate,
  Worker,
  WorkerInsert,
  WorkerUpdate,
};

// Funciones helper para SAD LAS

/**
 * Obtiene todos los workers activos
 */
export const getActiveWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error !== null) {
    securityLogger.error('Error fetching active workers:', error);
    throw error;
  }

  return data ?? [];
};

/**
 * Obtiene un worker por ID
 */
export const getWorkerById = async (id: string): Promise<Worker | null> => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error !== null) {
    securityLogger.error('Error fetching worker:', error);
    throw error;
  }

  return data;
};

/**
 * Obtiene asignaciones de un worker
 */
export const getWorkerAssignments = async (
  workerId: string
): Promise<Assignment[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select(
      `
      *,
      workers (name, surname, email),
      users (name, surname, client_code)
    `
    )
    .eq('worker_id', workerId)
    .order('start_date', { ascending: false });

  if (error !== null) {
    securityLogger.error('Error fetching worker assignments:', error);
    throw error;
  }

  return data ?? [];
};

/**
 * Crea una nueva asignación
 */
export const createAssignment = async (
  assignment: AssignmentInsert
): Promise<Assignment> => {
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignment)
    .select()
    .single();

  if (error !== null) {
    securityLogger.error('Error creating assignment:', error);
    throw error;
  }

  return data;
};

/**
 * Actualiza una asignación
 */
export const updateAssignment = async (
  id: string,
  updates: AssignmentUpdate
): Promise<Assignment> => {
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error !== null) {
    securityLogger.error('Error updating assignment:', error);
    throw error;
  }

  return data;
};

interface WorkerStats {
  totalHours: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

/**
 * Obtiene estadísticas de un worker
 */
export const getWorkerStats = async (
  workerId: string,
  startDate: string,
  endDate: string
): Promise<WorkerStats> => {
  const { data, error } = await supabase
    .from('assignments')
    .select('weekly_hours, status')
    .eq('worker_id', workerId)
    .gte('start_date', startDate)
    .lte('start_date', endDate);

  if (error !== null) {
    securityLogger.error('Error fetching worker stats:', error);
    throw error;
  }

  const totalHours = (data ?? []).reduce((sum, assignment) => {
    if (typeof assignment.weekly_hours === 'number') {
      return sum + assignment.weekly_hours;
    }
    return sum;
  }, 0);
  const completedTasks = (data ?? []).filter(
    a => a.status === 'completed'
  ).length;
  const totalTasks = (data ?? []).length;

  return {
    totalHours,
    completedTasks,
    totalTasks,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
  };
};

/**
 * Obtiene todos los usuarios (clientes)
 */
export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error !== null) {
    securityLogger.error('Error fetching users:', error);
    throw error;
  }

  return data ?? [];
};

/**
 * Obtiene servicios activos para hoy
 */
export const getTodayServices = async (): Promise<Assignment[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('assignments')
    .select(
      `
      *,
      workers (name, surname, email),
      users (name, surname, client_code)
    `
    )
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .eq('status', 'active')
    .order('start_date', { ascending: false });

  if (error !== null) {
    securityLogger.error('Error fetching today services:', error);
    throw error;
  }

  return data ?? [];
};

/**
 * Obtiene estadísticas reales de servicios y horas
 */
export const getServicesStats = async (): Promise<{
  todayServices: number;
  weeklyHours: number;
  weeklyHoursIncrement: number;
}> => {
  try {
    // Servicios activos de hoy
    const todayServices = await getTodayServices();

    // Calcular horas de la semana actual
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    // Obtener asignaciones activas de la semana actual
    const { data: weeklyAssignments, error: weeklyError } = await supabase
      .from('assignments')
      .select('weekly_hours, start_date, end_date')
      .lte('start_date', endDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`)
      .eq('status', 'active');

    if (weeklyError !== null) {
      securityLogger.error('Error fetching weekly assignments:', weeklyError);
      throw weeklyError;
    }

    // Calcular horas totales de la semana actual
    const weeklyHours = (weeklyAssignments ?? []).reduce(
      (total, assignment) => total + (assignment.weekly_hours ?? 0),
      0
    );

    // Calcular horas de la semana anterior para el incremento
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);

    const startDateLastWeek = startOfLastWeek.toISOString().split('T')[0];
    const endDateLastWeek = endOfLastWeek.toISOString().split('T')[0];

    const { data: lastWeekAssignments, error: lastWeekError } = await supabase
      .from('assignments')
      .select('weekly_hours, start_date, end_date')
      .lte('start_date', endDateLastWeek)
      .or(`end_date.is.null,end_date.gte.${startDateLastWeek}`)
      .eq('status', 'active');

    if (lastWeekError !== null) {
      securityLogger.error(
        'Error fetching last week assignments:',
        lastWeekError
      );
      throw lastWeekError;
    }

    const lastWeekHours = (lastWeekAssignments ?? []).reduce(
      (total, assignment) => total + (assignment.weekly_hours ?? 0),
      0
    );

    // Calcular incremento real
    const weeklyHoursIncrement = weeklyHours - lastWeekHours;

    return {
      todayServices: todayServices.length,
      weeklyHours,
      weeklyHoursIncrement,
    };
  } catch (error) {
    securityLogger.error('Error in getServicesStats:', error);
    return {
      todayServices: 0,
      weeklyHours: 0,
      weeklyHoursIncrement: 0,
    };
  }
};

/**
 * Obtiene estadísticas detalladas de servicios de hoy
 */
export const getTodayServicesStats = async (): Promise<{
  totalServices: number;
  activeWorkers: number;
  activeUsers: number;
  totalHours: number;
}> => {
  try {
    const todayServices = await getTodayServices();

    // Obtener trabajadoras únicas
    const uniqueWorkers = new Set(
      todayServices.map(service => service.worker_id)
    );

    // Obtener usuarios únicos
    const uniqueUsers = new Set(todayServices.map(service => service.user_id));

    // Calcular horas totales (asumiendo 8 horas por servicio)
    const totalHours = todayServices.length * 8;

    return {
      totalServices: todayServices.length,
      activeWorkers: uniqueWorkers.size,
      activeUsers: uniqueUsers.size,
      totalHours,
    };
  } catch (error) {
    securityLogger.error('Error in getTodayServicesStats:', error);
    return {
      totalServices: 0,
      activeWorkers: 0,
      activeUsers: 0,
      totalHours: 0,
    };
  }
};

/**
 * Manejo de errores centralizado
 */
export const handleSupabaseError = (error: unknown, context: string) => {
  securityLogger.error(`Error in ${context}:`, error);

  // Determinar el tipo de error y retornar mensaje apropiado
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const errorCode = (error as { code: string }).code;

    if (errorCode === '23505') {
      return 'Ya existe un registro con estos datos';
    }

    if (errorCode === '23503') {
      return 'No se puede eliminar este registro porque está siendo usado';
    }

    if (errorCode === '42P01') {
      return 'La tabla no existe';
    }
  }

  return 'Ha ocurrido un error inesperado';
};
