'use client';

import React, { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'worker';
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Si no hay usuario, redirigir al login inmediatamente
    if (user === null || user === undefined) {
      router.replace('/auth');
      return;
    }

    // Verificar rol si es requerido
    if (requiredRole !== null && requiredRole !== undefined) {
      const userRole = user.role;
      const hasAccess =
        userRole === requiredRole ||
        (userRole === 'super_admin' && requiredRole === 'admin');

      if (!hasAccess) {
        // Determinar redirección según el rol
        const defaultRedirect =
          userRole === 'super_admin'
            ? '/super-dashboard'
            : userRole === 'admin'
              ? '/dashboard'
              : '/worker-dashboard';

        router.replace(redirectTo ?? defaultRedirect);
        return;
      }
    }
  }, [user, loading, requiredRole, redirectTo, router]);

  // Derivar estado de autorización de las dependencias
  const isAuthorized =
    !loading &&
    user !== null &&
    user !== undefined &&
    (requiredRole === null ||
      requiredRole === undefined ||
      user.role === requiredRole ||
      (user.role === 'super_admin' && requiredRole === 'admin'));

  // Mostrar spinner mientras carga o no está autorizado
  if (loading || !isAuthorized) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3'></div>
          <p className='text-gray-600 text-sm'>
            {loading ? 'Verificando sesión...' : 'Accediendo...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no está autorizado, no mostrar nada (ya se está redirigiendo)
  if (!isAuthorized) {
    return null;
  }

  return children;
}
