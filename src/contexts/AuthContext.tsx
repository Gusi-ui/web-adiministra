'use client';

import React, { createContext, useContext, useEffect, useReducer } from 'react';

// secureStorage removido - no necesario en proyecto web

import { supabase } from '../lib/supabase';
import type { AuthContextType, AuthCredentials, Worker } from '../types';

// Estado inicial
const initialState = {
  isAuthenticated: false,
  currentWorker: null as Worker | null,
  isLoading: true,
  error: null as string | null,
};

// Tipos de acciones
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: Worker }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Reducer
function authReducer(
  state: typeof initialState,
  action: AuthAction
): typeof initialState {
  // Debug completado - reducer funcionando correctamente
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        currentWorker: action.payload,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        currentWorker: null,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        currentWorker: null,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Debug completado - AuthProvider funcionando correctamente

  // Verificar autenticación solo al iniciar - optimizado
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeAuth = (): void => {
      try {
        const workerDataStr = localStorage.getItem('worker');
        const token = localStorage.getItem('token');
        const workerData =
          workerDataStr !== null ? (JSON.parse(workerDataStr) as Worker) : null;

        if (workerData !== null && token !== null && token.length > 0) {
          // Restaurar sesión previa inmediatamente
          dispatch({ type: 'AUTH_SUCCESS', payload: workerData });
        } else {
          // No hay sesión previa - finalizar carga
          dispatch({ type: 'AUTH_FAILURE', payload: '' });
        }
      } catch {
        // Error al restaurar sesión - limpiar y finalizar carga
        localStorage.clear();
        dispatch({ type: 'AUTH_FAILURE', payload: '' });
      }
    };

    // Ejecutar inmediatamente sin demoras
    initializeAuth();
  }, []); // Solo al montar

  const login = async (
    credentials: AuthCredentials
  ): Promise<Worker | undefined> => {
    try {
      dispatch({ type: 'AUTH_START' });

      // Normalizar email a minúsculas para evitar problemas de case
      const normalizedEmail = credentials.email.toLowerCase().trim();

      // Login directo con Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: credentials.password,
        });

      if (authError) {
        throw new Error(`Error de autenticación: ${authError.message}`);
      }

      if (authData.user == null) {
        throw new Error('Error de autenticación: Usuario no encontrado');
      }

      // Autenticación exitosa con Supabase
      // Usar directamente los datos de Supabase Auth sin consultar auth_users

      // Crear objeto worker basado en los datos de Supabase Auth
      const metadata = authData.user.user_metadata as Record<
        string,
        unknown
      > | null;

      // Determinar el rol basado en el email o metadata
      const role: 'worker' | 'admin' | 'super_admin' =
        authData.user.email === 'conectomail@gmail.com'
          ? 'super_admin'
          : authData.user.email === 'webmaster@gusi.dev'
            ? 'admin'
            : 'worker';

      const worker: Worker = {
        id: authData.user.id,
        email: authData.user.email ?? '',
        name:
          (metadata?.['name'] as string) ??
          authData.user.email?.split('@')[0] ??
          'Usuario',
        surname: (metadata?.['surname'] as string) ?? '',
        phone: (metadata?.['phone'] as string) ?? '',
        dni: (metadata?.['dni'] as string) ?? '',
        worker_type: (metadata?.['worker_type'] as string) ?? 'cuidadora',
        role,
        is_active: true,
        monthly_contracted_hours:
          (metadata?.['monthly_contracted_hours'] as number) ?? 0,
        weekly_contracted_hours:
          (metadata?.['weekly_contracted_hours'] as number) ?? 0,
        address: (metadata?.['address'] as string) ?? null,
        postal_code: (metadata?.['postal_code'] as string) ?? null,
        city: (metadata?.['city'] as string) ?? null,
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at ?? authData.user.created_at,
      };

      // Guardar solo el ID del worker en localStorage (mejor práctica de seguridad)
      if (typeof window !== 'undefined' && worker.id) {
        localStorage.setItem('worker_id', worker.id);
      }

      dispatch({ type: 'AUTH_SUCCESS', payload: worker });

      // Login completado exitosamente
      return worker;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error de autenticación';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error; // Re-throw para que signIn pueda capturarlo
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Limpiar almacenamiento local (localStorage en web)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('worker');
        localStorage.removeItem('token');
      }
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch {
      // console.error('Error during logout:', error); // Comentado para producción
      // Aún así, limpiar el estado local
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updatePassword = async (
    _email: string,
    _newPassword: string
  ): Promise<void> => {
    try {
      // Implementar lógica de recuperación de contraseña
      // console.log('Password recovery for:', _email); // Comentado para producción
      // Evitar warning de variable no utilizada
      void _email;
      void _newPassword;
    } catch {
      // Error silencioso para producción
    }
  };

  const signIn = async (
    credentials: AuthCredentials
  ): Promise<Worker | undefined> => {
    try {
      const authenticatedUser = await login(credentials);
      return authenticatedUser;
    } catch {
      // Error silencioso para producción
      return undefined;
    }
  };

  const value: AuthContextType = {
    state,
    user: state.currentWorker,
    loading: state.isLoading,
    login,
    logout,
    signOut: logout,
    signIn,
    updatePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth };
