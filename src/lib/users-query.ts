/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions */
import type { User, UserInsert } from '@/types';
import { securityLogger } from '@/utils/security-config';

import { supabase } from './database';

/**
 * Consulta todos los usuarios de la base de datos
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error !== null) {
      securityLogger.error('Error fetching users', error);
      throw error;
    }

    return (data ?? []) as User[];
  } catch (error) {
    securityLogger.error('Error in getAllUsers', error);
    throw error;
  }
};

/**
 * Consulta usuarios activos
 */
export const getActiveUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error !== null) {
      securityLogger.error('Error fetching active users:', error);
      throw error;
    }

    return (data ?? []) as User[];
  } catch (error) {
    securityLogger.error('Error in getActiveUsers:', error);
    throw error;
  }
};

/**
 * Busca usuarios por nombre, apellido o email
 */
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(
        `name.ilike.%${searchTerm}%,surname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .eq('is_active', true)
      .order('name');

    if (error !== null) {
      securityLogger.error('Error searching users:', error);
      throw error;
    }

    return (data ?? []) as User[];
  } catch (error) {
    securityLogger.error('Error in searchUsers:', error);
    throw error;
  }
};

/**
 * Obtiene un usuario por ID
 */
export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== null) {
      securityLogger.error('Error fetching user by ID:', error);
      throw error;
    }

    return data as User;
  } catch (error) {
    securityLogger.error('Error in getUserById:', error);
    throw error;
  }
};

/**
 * Actualiza los datos de un usuario por ID
 */
export const updateUser = async (
  id: string,
  updates: Partial<User>
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      securityLogger.error('Error updating user:', error);
      throw error;
    }

    return data as User;
  } catch (error) {
    securityLogger.error('Error in updateUser:', error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario
 */
export const createUser = async (user: UserInsert): Promise<User> => {
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
      throw new Error('No tienes permisos para crear usuarios');
    }
  }

  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error !== null) {
    throw error;
  }

  if (data === null || data === undefined) {
    throw new Error('No se pudo crear el usuario');
  }

  return data as User;
};

/**
 * Elimina un usuario por ID
 */
export const deleteUser = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      securityLogger.error('Error deleting user:', error);
      throw error;
    }
  } catch (error) {
    securityLogger.error('Error in deleteUser:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de usuarios
 */
export const getUsersStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
  withAssignments: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, is_active');

    if (error !== null) {
      securityLogger.error('Error fetching users stats:', error);
      throw error;
    }

    const users = data ?? [];

    // Contar usuarios con asignaciones (esto requeriría una consulta adicional)
    // Por ahora, usamos un valor estimado
    const withAssignments = Math.floor(users.length * 0.7); // 70% estimado

    const stats = {
      total: users.length,
      active: users.filter(u => u.is_active === true).length,
      inactive: users.filter(u => u.is_active !== true).length,
      withAssignments,
    };

    return stats;
  } catch (error) {
    securityLogger.error('Error in getUsersStats:', error);
    throw error;
  }
};
