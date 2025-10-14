import type { Activity, ActivityInsert } from '@/types';
import { logger } from '@/utils/logger';

import { supabase } from './database';

/**
 * Convierte una fecha a formato 'time ago'
 */
const toTimeAgo = (dateString: string | null): string => {
  if (dateString === null) return 'Reciente';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';
  if (diffInSeconds < 3600) {
    return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
  }
  if (diffInSeconds < 86400) {
    return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
  }
  if (diffInSeconds < 2592000) {
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  }
  if (diffInSeconds < 31536000) {
    return `Hace ${Math.floor(diffInSeconds / 2592000)} meses`;
  }
  return `Hace ${Math.floor(diffInSeconds / 31536000)} años`;
};

/**
 * Registra una actividad en el sistema
 */
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Ajuste para exactOptionalPropertyTypes: las propiedades opcionales no incluyen undefined explícitamente
type LogParams = {
  p_activity_type: string;
  p_entity_type: string;
  p_description: string;
  p_user_id?: string; // Mantener como string para compatibilidad con RPC
  p_user_email?: string;
  p_user_name?: string;
  p_entity_id?: string; // Mantener como string para compatibilidad con RPC
  p_entity_name?: string;
  p_details?: Json;
  p_ip_address?: string;
  p_user_agent?: string;
};

export const logActivity = async (
  activity: ActivityInsert
): Promise<string> => {
  try {
    // Construir params omitiendo propiedades undefined para cumplir exactOptionalPropertyTypes
    const params: LogParams = {
      p_activity_type: activity.activity_type,
      p_entity_type: activity.entity_type,
      p_description: activity.description,
    };

    if (activity.user_id != null) params.p_user_id = activity.user_id;
    if (activity.user_email != null) params.p_user_email = activity.user_email;
    if (activity.user_name != null) params.p_user_name = activity.user_name;
    if (activity.entity_id != null) params.p_entity_id = activity.entity_id;
    if (activity.entity_name != null) {
      params.p_entity_name = activity.entity_name;
    }
    if (activity.details != null) params.p_details = activity.details as Json;
    if (activity.ip_address != null) params.p_ip_address = activity.ip_address;
    if (activity.user_agent != null) params.p_user_agent = activity.user_agent;

    // Usar solo la función RPC (más confiable)

    const { data, error } = await supabase.rpc('log_system_activity', params);

    if (error !== null) {
      logger.error('Error en RPC log_system_activity:', error);
      // Retornar ID temporal en lugar de fallar
      return 'temp-activity-id';
    }

    if (data !== null && data !== undefined) {
      return data as string;
    }

    // Si no hay data, retornar ID temporal
    return 'temp-activity-id';
  } catch (error) {
    logger.error('Error al registrar actividad:', error);
    // Retornar ID temporal en lugar de fallar
    return 'temp-activity-id';
  }
};

/**
 * Obtiene las actividades del sistema con información de usuario
 */
export const getActivities = async (): Promise<Activity[]> => {
  try {
    const { data, error } = await supabase
      .from('system_activities')
      .select(
        `
        id,
        user_name,
        activity_type,
        entity_type,
        entity_name,
        description,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(7);

    if (error !== null) {
      logger.error('Error al obtener actividades', error);
      throw error;
    }

    // Agregar time_ago a cada actividad
    const activitiesWithTimeAgo = (data ?? []).map(
      (activity: {
        id: string;
        user_name: string;
        activity_type: string;
        entity_type: string;
        entity_name: string;
        description: string;
        created_at: string;
      }) => ({
        id: activity.id,
        user_name: activity.user_name,
        activity_type: activity.activity_type,
        entity_type: activity.entity_type,
        entity_name: activity.entity_name,
        description: activity.description,
        created_at: activity.created_at,
        time_ago: toTimeAgo(activity.created_at),
      })
    );

    return activitiesWithTimeAgo as unknown as Activity[];
  } catch (error) {
    logger.error('Error al obtener actividades', error);
    throw error;
  }
};

// Funciones específicas para diferentes tipos de actividades
export const logWorkerActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  workerName: string,
  workerId: string
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type:
      action === 'creó'
        ? 'worker_created'
        : action === 'actualizó'
          ? 'worker_updated'
          : 'worker_deleted',
    entity_type: 'worker',
    entity_id: workerId, // Este es el ID de la trabajadora (entidad)
    entity_name: workerName,
    description: `${action} trabajador: ${workerName}`,
    details: {
      action,
      entity: 'worker',
      worker_name: workerName,
      worker_id: workerId,
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};

export const logUserActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  userName: string,
  userId: string
): Promise<void> => {
  await logActivity({
    user_id: userId,
    user_name: adminName,
    user_email: adminEmail,
    activity_type:
      action === 'creó'
        ? 'user_created'
        : action === 'actualizó'
          ? 'user_updated'
          : 'user_deleted',
    entity_type: 'user',
    entity_id: userId,
    entity_name: userName,
    description: `${action} usuario: ${userName}`,
    details: {
      action,
      entity: 'user',
      user_name: userName,
      user_id: userId,
    },
  });
};

export const logAssignmentActivity = async (
  createdBy: string,
  action: string,
  assignmentType: string,
  workerName: string,
  userName: string
): Promise<void> => {
  await logActivity({
    user_id: '', // No tenemos user_id específico aquí
    user_name: createdBy,
    user_email: '', // No tenemos user_email específico aquí
    activity_type: 'assignment_created',
    entity_type: 'assignment',
    entity_id: '', // No tenemos entity_id específico aquí
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      action,
      entity: 'assignment',
      admin_name: createdBy,
      admin_email: '', // No tenemos admin_email específico aquí
      created_by: createdBy,
    },
  });
};

export const logAssignmentUpdateActivity = async (
  updatedBy: string,
  action: string,
  assignmentType: string,
  workerName: string,
  userName: string
): Promise<void> => {
  await logActivity({
    user_id: '', // No tenemos user_id específico aquí
    user_name: updatedBy,
    user_email: '', // No tenemos user_email específico aquí
    activity_type: 'assignment_updated',
    entity_type: 'assignment',
    entity_id: '', // No tenemos entity_id específico aquí
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      action,
      entity: 'assignment',
      admin_name: updatedBy,
      admin_email: '', // No tenemos admin_email específico aquí
      updated_by: updatedBy,
    },
  });
};

export const logAssignmentDeleteActivity = async (
  deletedBy: string,
  deletedByEmail: string,
  action: string,
  assignmentType: string,
  workerName: string,
  workerId: string,
  userName: string,
  userId: string
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: deletedBy,
    user_email: deletedByEmail,
    activity_type: 'assignment_cancelled',
    entity_type: 'assignment',
    entity_id: null, // No tenemos el ID de la asignación al eliminarla
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      action,
      entity: 'assignment',
      admin_name: deletedBy,
      admin_email: deletedByEmail,
      deleted_by: deletedBy,
      assignment_type: assignmentType,
      worker_name: workerName,
      worker_id: workerId,
      user_name: userName,
      user_id: userId, // Este es el ID del usuario de la asignación
    },
  });
};

export const logAssignmentCreationActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  assignmentType: string,
  workerName: string,
  workerId: string,
  userName: string,
  userId: string,
  startDate: string,
  endDate: string,
  weeklyHours: number
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type: 'assignment_created',
    entity_type: 'assignment',
    entity_id: null, // No tenemos el ID de la asignación al crearla
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      assignment_type: assignmentType,
      worker_name: workerName,
      worker_id: workerId,
      user_name: userName,
      user_id: userId, // Este es el ID del usuario de la asignación
      start_date: startDate,
      end_date: endDate,
      weekly_hours: weeklyHours,
      entity: 'assignment',
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};

export const logAssignmentUpdateActivityDetailed = async (
  adminName: string,
  adminEmail: string,
  action: string,
  assignmentId: string,
  assignmentType: string,
  workerName: string,
  workerId: string,
  userName: string,
  userId: string,
  startDate: string,
  endDate: string,
  weeklyHours: number
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type: 'assignment_updated',
    entity_type: 'assignment',
    entity_id: assignmentId,
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      assignment_id: assignmentId,
      assignment_type: assignmentType,
      worker_name: workerName,
      worker_id: workerId,
      user_name: userName,
      user_id: userId, // Este es el ID del usuario de la asignación
      start_date: startDate,
      end_date: endDate,
      weekly_hours: weeklyHours,
      action,
      entity: 'assignment',
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};

export const logAssignmentStatusChangeActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  assignmentId: string,
  assignmentType: string,
  workerName: string,
  workerId: string,
  userName: string,
  userId: string
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type: 'assignment_completed',
    entity_type: 'assignment',
    entity_id: assignmentId,
    entity_name: `${assignmentType} - ${workerName} - ${userName}`,
    description: `${action} asignación: ${assignmentType} para ${workerName} y ${userName}`,
    details: {
      assignment_id: assignmentId,
      assignment_type: assignmentType,
      worker_name: workerName,
      worker_id: workerId,
      user_name: userName,
      user_id: userId, // Este es el ID del usuario de la asignación
      action,
      entity: 'assignment',
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};

export const logUserManagementActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  userName: string,
  userId: string
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type:
      action === 'creó'
        ? 'user_created'
        : action === 'actualizó'
          ? 'user_updated'
          : 'user_deleted',
    entity_type: 'user',
    entity_id: userId, // Este es el ID del usuario que se está gestionando
    entity_name: userName,
    description: `${action} usuario: ${userName}`,
    details: {
      action,
      entity: 'user',
      user_name: userName,
      user_id: userId, // Este es el ID del usuario que se está gestionando
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};

export const logUserUpdateActivity = async (
  adminName: string,
  adminEmail: string,
  action: string,
  userName: string,
  userId: string
): Promise<void> => {
  await logActivity({
    user_id: null, // No tenemos el ID del admin, solo su nombre y email
    user_name: adminName,
    user_email: adminEmail,
    activity_type: 'user_updated',
    entity_type: 'user',
    entity_id: userId, // Este es el ID del usuario que se está actualizando
    entity_name: userName,
    description: `${action} usuario: ${userName}`,
    details: {
      action,
      entity: 'user',
      user_name: userName,
      user_id: userId, // Este es el ID del usuario que se está actualizando
      admin_name: adminName,
      admin_email: adminEmail,
    },
  });
};
