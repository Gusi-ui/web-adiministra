/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { logger } from '@/utils/logger';

import { supabase } from './database';

export interface Assignment {
  id: string;
  user_id: string;
  worker_id: string;
  assignment_type:
    | 'laborables'
    | 'festivos'
    | 'flexible'
    | 'completa'
    | 'personalizada';
  monthly_hours: number;
  schedule: {
    monday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    tuesday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    wednesday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    thursday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    friday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    saturday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
    sunday: {
      enabled: boolean;
      totalHours: number;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        hours: number;
      }>;
    };
  };
  start_date: string;
  status: 'active' | 'inactive';
  priority: number;
  notes: string;
  created_at: string;
  user?: {
    name: string;
    surname: string;
  };
  worker?: {
    name: string;
    surname: string;
  };
}

export interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  inactiveAssignments: number;
  newThisWeek: number;
}

// Tipo para los datos de la base de datos
interface AssignmentDB {
  id: string;
  user_id: string;
  worker_id: string;
  assignment_type: string;
  monthly_hours?: number;
  weekly_hours?: number;
  schedule: unknown;
  start_date: string;
  status: string;
  priority: number;
  notes: string | null;
  created_at: string | null;
  user?: { name: string; surname: string };
  worker?: { name: string; surname: string };
}

// Obtener todas las asignaciones
export const getAssignments = async (): Promise<Assignment[]> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
        *,
        user:users(name, surname),
        worker:workers(name, surname)
      `
      )
      .order('created_at', { ascending: false });

    if (error !== null) {
      logger.error('Error obteniendo asignaciones:', error);
      return [];
    }

    return (data ?? []).map((assignment: AssignmentDB) => ({
      ...assignment,
      schedule: assignment.schedule as Assignment['schedule'],
      assignment_type:
        assignment.assignment_type as Assignment['assignment_type'],
      status: assignment.status as Assignment['status'],
      monthly_hours: assignment.monthly_hours ?? assignment.weekly_hours ?? 0,
      notes: assignment.notes ?? '',
      created_at: assignment.created_at ?? '',
    }));
  } catch (error) {
    logger.error('Error obteniendo asignaciones:', error);
    return [];
  }
};

// Obtener estadísticas de asignaciones
export const getAssignmentStats = async (): Promise<AssignmentStats> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('status, created_at');

    if (error !== null) {
      logger.error('Error obteniendo estadísticas:', error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        inactiveAssignments: 0,
        newThisWeek: 0,
      };
    }

    const assignments = data ?? [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats: AssignmentStats = {
      totalAssignments: assignments.length,
      activeAssignments: assignments.filter(a => a.status === 'active').length,
      inactiveAssignments: assignments.filter(a => a.status === 'inactive')
        .length,
      newThisWeek: assignments.filter(a => {
        if (a.created_at === null) return false;
        return new Date(a.created_at) > oneWeekAgo;
      }).length,
    };

    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    return {
      totalAssignments: 0,
      activeAssignments: 0,
      inactiveAssignments: 0,
      newThisWeek: 0,
    };
  }
};

// Crear nueva asignación
export const createAssignment = async (
  assignmentData: Omit<Assignment, 'id' | 'created_at'>
): Promise<Assignment | null> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        ...assignmentData,
        weekly_hours: assignmentData.monthly_hours, // Temporal: enviar a weekly_hours hasta actualizar BD
      })
      .select(
        `
        *,
        user:users(name, surname),
        worker:workers(name, surname)
      `
      )
      .single();

    if (error !== null) {
      logger.error('Error creando asignación:', error);
      return null;
    }

    const dbData = data as AssignmentDB;
    return {
      ...dbData,
      schedule: dbData.schedule as Assignment['schedule'],
      assignment_type: dbData.assignment_type as Assignment['assignment_type'],
      status: dbData.status as Assignment['status'],
      monthly_hours: dbData.monthly_hours ?? dbData.weekly_hours ?? 0,
      notes: dbData.notes ?? '',
      created_at: dbData.created_at ?? '',
    };
  } catch (error) {
    logger.error('Error creando asignación:', error);
    return null;
  }
};

// Actualizar asignación
export const updateAssignment = async (
  id: string,
  updates: Partial<Assignment>
): Promise<Assignment | null> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        user:users(name, surname),
        worker:workers(name, surname)
      `
      )
      .single();

    if (error !== null) {
      logger.error('Error actualizando asignación:', error);
      return null;
    }

    const dbData = data as AssignmentDB;
    return {
      ...dbData,
      schedule: dbData.schedule as Assignment['schedule'],
      assignment_type: dbData.assignment_type as Assignment['assignment_type'],
      status: dbData.status as Assignment['status'],
      monthly_hours: dbData.monthly_hours ?? dbData.weekly_hours ?? 0,
      notes: dbData.notes ?? '',
      created_at: dbData.created_at ?? '',
    };
  } catch (error) {
    logger.error('Error actualizando asignación:', error);
    return null;
  }
};

// Eliminar asignación
export const deleteAssignment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('assignments').delete().eq('id', id);

    if (error !== null) {
      logger.error('Error eliminando asignación:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error eliminando asignación:', error);
    return false;
  }
};

// Obtener asignación por ID
export const getAssignmentById = async (
  id: string
): Promise<Assignment | null> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
        *,
        user:users(name, surname),
        worker:workers(name, surname)
      `
      )
      .eq('id', id)
      .single();

    if (error !== null) {
      logger.error('Error obteniendo asignación:', error);
      return null;
    }

    const dbData = data as AssignmentDB;
    return {
      ...dbData,
      schedule: dbData.schedule as Assignment['schedule'],
      assignment_type: dbData.assignment_type as Assignment['assignment_type'],
      status: dbData.status as Assignment['status'],
      monthly_hours: dbData.monthly_hours ?? dbData.weekly_hours ?? 0,
      notes: dbData.notes ?? '',
      created_at: dbData.created_at ?? '',
    };
  } catch (error) {
    logger.error('Error obteniendo asignación:', error);
    return null;
  }
};
