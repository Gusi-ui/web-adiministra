/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions */
import type { Worker, WorkerInsert, WorkerUpdate } from '@/types';
import { securityLogger } from '@/utils/security-config';

import { supabase } from './database';

/**
 * Consulta todos los workers de la base de datos
 */
export const getAllWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error !== null) {
      securityLogger.error('Error fetching workers:', error);
      throw error;
    }

    return (data ?? []) as Worker[];
  } catch (error) {
    securityLogger.error('Error in getAllWorkers:', error);
    throw error;
  }
};

/**
 * Consulta workers activos
 */
export const getActiveWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error !== null) {
      securityLogger.error('Error fetching active workers:', error);
      throw error;
    }

    return (data ?? []) as Worker[];
  } catch (error) {
    securityLogger.error('Error in getActiveWorkers:', error);
    throw error;
  }
};

/**
 * Consulta workers por tipo
 */
export const getWorkersByType = async (
  workerType: 'cuidadora' | 'auxiliar' | 'enfermera'
): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('worker_type', workerType)
      .eq('is_active', true)
      .order('name');

    if (error !== null) {
      securityLogger.error('Error fetching workers by type:', error);
      throw error;
    }

    return (data ?? []) as Worker[];
  } catch (error) {
    securityLogger.error('Error in getWorkersByType:', error);
    throw error;
  }
};

interface WorkersStats {
  total: number;
  active: number;
  inactive: number;
  cuidadoras: number;
  auxiliares: number;
  enfermeras: number;
}

/**
 * Obtiene estadísticas de workers
 */
export const getWorkersStats = async (): Promise<WorkersStats> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('worker_type, is_active');

    if (error !== null) {
      securityLogger.error('Error fetching workers stats:', error);
      throw error;
    }

    const stats = {
      total: (data ?? []).length,
      active: (data ?? []).filter(w => w.is_active === true).length,
      inactive: (data ?? []).filter(w => w.is_active !== true).length,
      cuidadoras: (data ?? []).filter(
        w => w.worker_type === 'cuidadora' && w.is_active === true
      ).length,
      auxiliares: (data ?? []).filter(
        w => w.worker_type === 'auxiliar' && w.is_active === true
      ).length,
      enfermeras: (data ?? []).filter(
        w => w.worker_type === 'enfermera' && w.is_active === true
      ).length,
    };

    return stats;
  } catch (error) {
    securityLogger.error('Error in getWorkersStats:', error);
    throw error;
  }
};

/**
 * Busca workers por nombre o email
 */
export const searchWorkers = async (searchTerm: string): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .or(
        `name.ilike.%${searchTerm}%,surname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .eq('is_active', true)
      .order('name');

    if (error !== null) {
      securityLogger.error('Error searching workers:', error);
      throw error;
    }

    return (data ?? []) as Worker[];
  } catch (error) {
    securityLogger.error('Error in searchWorkers:', error);
    throw error;
  }
};

/**
 * Obtiene un worker por ID
 */
export const getWorkerById = async (id: string): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== null) {
      securityLogger.error('Error fetching worker by ID:', error);
      throw error;
    }

    return data as Worker;
  } catch (error) {
    securityLogger.error('Error in getWorkerById:', error);
    throw error;
  }
};

/**
 * Actualiza los datos de un worker por ID
 */
export const updateWorker = async (
  id: string,
  updates: WorkerUpdate
): Promise<Worker | null> => {
  try {
    // Verificar autenticación del usuario
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (
      userError !== null ||
      userData.user === null ||
      userData.user === undefined
    ) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que el usuario tiene permisos (admin o super_admin)
    const userRole = userData.user.user_metadata?.['role'] as
      | string
      | undefined;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isSuperAdmin =
      userRole === 'super_admin' ||
      userData.user.email === 'conectomail@gmail.com';

    if (!isAdmin && !isSuperAdmin) {
      // Verificar en la tabla auth_users si no está en metadatos
      const { data: roleData, error: roleError } = await supabase
        .from('auth_users')
        .select('role')
        .eq('id', userData.user.id)
        .single();

      if (
        roleError ||
        !roleData?.role ||
        (roleData.role !== 'admin' && roleData.role !== 'super_admin')
      ) {
        throw new Error('No tienes permisos para actualizar trabajadoras');
      }
    }

    // Log de los datos que se van a actualizar para debugging
    securityLogger.info('Updating worker with data:', { id, updates });

    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      securityLogger.error('Error updating worker:', error);
      throw error;
    }

    return data as Worker;
  } catch (error) {
    securityLogger.error('Error in updateWorker:', error);
    throw error;
  }
};

/**
 * Crea un nuevo worker
 */
export const createWorker = async (worker: WorkerInsert): Promise<Worker> => {
  // Verificar autenticación del usuario
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (
    userError !== null ||
    userData.user === null ||
    userData.user === undefined
  ) {
    throw new Error('Usuario no autenticado');
  }

  // Verificar que el usuario tiene permisos (admin o super_admin)
  const userRole = userData.user.user_metadata?.['role'] as string | undefined;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin =
    userRole === 'super_admin' ||
    userData.user.email === 'conectomail@gmail.com';

  if (!isAdmin && !isSuperAdmin) {
    // Verificar en la tabla auth_users si no está en metadatos
    const { data: roleData, error: roleError } = await supabase
      .from('auth_users')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (
      roleError ||
      !roleData?.role ||
      (roleData.role !== 'admin' && roleData.role !== 'super_admin')
    ) {
      throw new Error('No tienes permisos para crear trabajadoras');
    }
  }

  const { data, error } = await supabase
    .from('workers')
    .insert(worker)
    .select()
    .single();

  if (error !== null) {
    throw error;
  }

  if (data === null || data === undefined) {
    throw new Error('No se pudo crear el trabajador');
  }

  return data as Worker;
};

/**
 * Elimina un worker por ID
 */
export const deleteWorker = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('workers').delete().eq('id', id);

    if (error) {
      securityLogger.error('Error deleting worker:', error);
      throw error;
    }
  } catch (error) {
    securityLogger.error('Error in deleteWorker:', error);
    throw error;
  }
};
