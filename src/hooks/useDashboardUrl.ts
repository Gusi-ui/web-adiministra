import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook personalizado para obtener la URL del dashboard correcta
 * basada en el rol del usuario actual
 */
export const useDashboardUrl = () => {
  const { user } = useAuth();

  // Determinar la URL del dashboard según el rol del usuario
  const getDashboardUrl = () => {
    if (user === null || user === undefined) return '/dashboard';

    // Verificar el rol del usuario
    const userRole = user.role;

    switch (userRole) {
      case 'super_admin':
        return '/super-dashboard';
      case 'admin':
        return '/dashboard';
      case 'worker':
        return '/worker-dashboard';
      case null:
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  return getDashboardUrl();
};
