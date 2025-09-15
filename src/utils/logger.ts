/**
 * Sistema de logging para el proyecto SAD LAS
 * Maneja logs de desarrollo de manera apropiada sin usar console.log directamente
 */

// type LogLevel = 'log' | 'warn' | 'error'; // Comentado ya que no se usa actualmente

interface Logger {
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Logger que solo funciona en desarrollo
 * En producción, no genera ningún output
 */
export const logger: Logger = {
  log: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(message, ...args);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(message, ...args);
    }
  },
};

/**
 * Helper para debug de autenticación
 */
export const authLogger = {
  userRole: (email: string | null | undefined) => {
    logger.log('Checking user role for:', email);
  },

  metadata: (role: string | undefined) => {
    logger.log('User metadata role:', role);
  },

  usingRole: (role: string) => {
    logger.log('Using metadata role:', role);
  },

  signInStart: (email: string) => {
    logger.log('Starting sign in for:', email);
  },

  signInSuccess: () => {
    logger.log('Supabase auth successful, useEffect will handle user setup');
  },

  quickRedirect: (redirectTo: string) => {
    logger.log('Quick redirect determined:', redirectTo);
  },

  authError: (error: unknown) => {
    logger.error('Supabase auth error:', error);
  },

  superAdminByEmail: () => {
    logger.log('User identified as super_admin by email');
  },

  adminDefault: () => {
    logger.log('User identified as admin (default)');
  },

  workerDefault: () => {
    logger.log('User identified as worker (default)');
  },

  fetchingUserFromDb: (userId: string) => {
    logger.log(
      'User role not in metadata, checking auth_users table for user:',
      userId
    );
  },

  userRoleFromDb: (role: string | undefined) => {
    logger.log('User role from auth_users:', role);
  },

  userNotFoundInDb: (error: unknown) => {
    logger.warn(
      'User not found in auth_users or error fetching role, treating as worker:',
      error
    );
  },

  checkUserRoleError: (error: unknown) => {
    logger.error('Error in checkUserRole:', error);
  },

  sessionError: (error: unknown) => {
    logger.error('Error getting initial session:', error);
  },
};

/**
 * Helper para debug de workers
 */
export const workerLogger = {
  sendingData: (data: unknown) => {
    logger.log('Enviando datos de trabajadora:', data);
  },

  created: (worker: unknown) => {
    logger.log('Trabajadora creada exitosamente:', worker);
  },

  error: (error: unknown) => {
    logger.error('Error al crear trabajadora:', error);
  },
};
