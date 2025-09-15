'use client';

import React, { useEffect, useState } from 'react';

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
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // Si no hay usuario, redirigir al login inmediatamente
    if (user === null || user === undefined) {
      router.replace('/auth');
      setIsAuthorized(false);
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
        setIsAuthorized(false);
        return;
      }
    }

    // Usuario autorizado
    setIsAuthorized(true);
  }, [user, loading, requiredRole, redirectTo, router]);

  // Mostrar spinner mientras carga o verifica autorización
  if (loading || isAuthorized === null) {
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
