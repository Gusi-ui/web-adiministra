'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navigation from '@/components/layout/Navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  resetAdminPassword,
} from '@/lib/admin-query';
import { getAllUsers } from '@/lib/users-query';
import { getWorkersStats } from '@/lib/workers-query';
import type { User as AdminUser } from '@/types';

interface WorkersStats {
  total: number;
  active: number;
  inactive: number;
  cuidadoras: number;
  auxiliares: number;
  enfermeras: number;
}

interface UsersStats {
  total: number;
  active: number;
  inactive: number;
}

export default function SuperDashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Estados
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workersStats, setWorkersStats] = useState<WorkersStats>({
    total: 0,
    active: 0,
    inactive: 0,
    cuidadoras: 0,
    auxiliares: 0,
    enfermeras: 0,
  });
  const [usersStats, setUsersStats] = useState<UsersStats>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] =
    useState<AdminUser | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] =
    useState(false);
  const [selectedAdminForDelete, setSelectedAdminForDelete] =
    useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Limpiar mensajes después de un tiempo
  useEffect(() => {
    if (error !== null && error !== undefined) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  useEffect(() => {
    if (successMessage !== null && successMessage !== undefined) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  // Obtener nombre del usuario y saludo personalizado
  useEffect(() => {
    const metadataName = user?.name;
    if (
      metadataName !== undefined &&
      metadataName !== null &&
      typeof metadataName === 'string' &&
      metadataName.length > 0
    ) {
      setUserName(metadataName);
    } else if (
      user?.email !== undefined &&
      user.email !== null &&
      typeof user.email === 'string' &&
      user.email.length > 0
    ) {
      const emailName = user.email.split('@')[0];
      if (
        emailName !== undefined &&
        emailName !== null &&
        emailName.length > 0
      ) {
        const displayName =
          emailName.charAt(0).toUpperCase() + emailName.slice(1);
        setUserName(displayName);
      }
    }

    // Saludo según la hora del día
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('¡Buenos días');
    } else if (hour < 18) {
      setGreeting('¡Buenas tardes');
    } else {
      setGreeting('¡Buenas noches');
    }
  }, [user]);

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const adminUsers = await getAdmins();
        setAdmins(adminUsers);

        const workersStatsData = await getWorkersStats();
        setWorkersStats(workersStatsData);

        const users = await getAllUsers();
        setUsersStats({
          total: users.length,
          active: users.filter(u => u.is_active === true).length,
          inactive: users.filter(
            u => u.is_active === false || u.is_active === null
          ).length,
        });
      } catch (err) {
        setError('No se pudieron cargar los datos del dashboard.');
        // eslint-disable-next-line no-console
        console.error(err);
      }
    };

    fetchData().catch(err => {
      // eslint-disable-next-line no-console
      console.error('Error fetching dashboard data:', err);
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Funciones de validación
  const validateName = (name: string): string => {
    if (name.trim() === '') {
      return 'El nombre es obligatorio';
    }
    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name.trim())) {
      return 'El nombre solo puede contener letras y espacios';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (email.trim() === '') {
      return 'El email es obligatorio';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Formato de email inválido';
    }
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (phone.trim() === '') {
      return 'El teléfono es obligatorio';
    }
    const phoneRegex =
      /^[67]\d{8}$|^[89]\d{8}$|^\+34[67]\d{8}$|^\+34[89]\d{8}$/;
    if (!phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
      return 'Formato de teléfono inválido (ej: 612345678 o +34612345678)';
    }
    return '';
  };

  const validatePassword = (password: string): string => {
    if (password === '') {
      return 'La contraseña es obligatoria';
    }
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const nameError = validateName(newAdmin.name);
    const emailError = validateEmail(newAdmin.email);
    const phoneError = validatePhone(newAdmin.phone);
    const passwordError = validatePassword(newAdmin.password);

    setValidationErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
    });

    return (
      nameError === '' &&
      emailError === '' &&
      phoneError === '' &&
      passwordError === ''
    );
  };

  const handleCreateAdmin = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setError('Por favor, corrige los errores en el formulario.');
      return;
    }

    setLoading(true);
    try {
      const newAdminUser = await createAdmin({
        email: newAdmin.email.trim(),
        password: newAdmin.password,
        name: newAdmin.name.trim(),
        surname: '',
        // phone: newAdmin.phone.trim(), // Comentado porque no está en AdminInsert
        // address: '', // Comentado porque no está en AdminInsert
        // postal_code: '', // Comentado porque no está en AdminInsert
        // city: '', // Comentado porque no está en AdminInsert
        // monthly_assigned_hours: 0, // Comentado porque no está en AdminInsert
        // medical_conditions: [], // Comentado porque no está en AdminInsert
        // emergency_contact: {
        //   name: '',
        //   phone: '',
        //   relationship: '',
        // }, // Comentado porque no está en AdminInsert
      });

      setAdmins([...admins, newAdminUser]);
      setSuccessMessage('¡Administrador creado con éxito!');
      setIsCreateAdminModalOpen(false);
      setNewAdmin({ email: '', password: '', name: '', phone: '' });
      setValidationErrors({ name: '', email: '', phone: '', password: '' });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al crear el administrador: ${errorMessage}`);
      // eslint-disable-next-line no-console
      console.error('Error creating admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdminForReset) return;

    setError(null);
    setSuccessMessage(null);

    if (!resetPasswordData.password || !resetPasswordData.confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (resetPasswordData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetAdminPassword(
        selectedAdminForReset.id,
        resetPasswordData.password
      );

      if (result.success) {
        setSuccessMessage(
          `Contraseña actualizada para ${selectedAdminForReset.name}`
        );
        setIsResetPasswordModalOpen(false);
        setSelectedAdminForReset(null);
        setResetPasswordData({ password: '', confirmPassword: '' });
      } else {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al resetear la contraseña: ${errorMessage}`);
      // eslint-disable-next-line no-console
      console.error('Error resetting password:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdminForDelete) return;

    setError(null);
    setSuccessMessage(null);

    if (deleteConfirmText !== 'ELIMINAR') {
      setError('Debes escribir exactamente "ELIMINAR" para confirmar.');
      return;
    }

    setLoading(true);
    try {
      const result = await deleteAdmin(
        selectedAdminForDelete.id,
        selectedAdminForDelete.email ?? ''
      );

      if (result.success) {
        const updatedAdmins = admins.filter(
          admin => admin.id !== selectedAdminForDelete.id
        );
        setAdmins(updatedAdmins);
        setSuccessMessage(result.message);
        setIsDeleteConfirmModalOpen(false);
        setSelectedAdminForDelete(null);
        setDeleteConfirmText('');
      } else {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al eliminar el administrador: ${errorMessage}`);
      // eslint-disable-next-line no-console
      console.error('Error deleting admin:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole='super_admin'>
      <div className='bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        {/* Header - Visible en todos los dispositivos */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 64 64'
                  width='32'
                  height='32'
                  className='w-full h-full'
                >
                  <defs>
                    <linearGradient
                      id='mobileLogoGradient'
                      x1='0%'
                      y1='0%'
                      x2='100%'
                      y2='100%'
                    >
                      <stop offset='0%' stopColor='#3b82f6' />
                      <stop offset='100%' stopColor='#22c55e' />
                    </linearGradient>
                  </defs>
                  <circle
                    cx='32'
                    cy='32'
                    r='30'
                    fill='url(#mobileLogoGradient)'
                  />
                  <path
                    d='M32 50C32 50 12 36.36 12 24.5C12 17.6 17.6 12 24.5 12C28.09 12 31.36 13.94 32 16.35C32.64 13.94 35.91 12 39.5 12C46.4 12 52 17.6 52 24.5C52 36.36 32 50 32 50Z'
                    fill='white'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className='text-lg font-bold text-gray-900'>SAD</span>
            </div>
            <button
              onClick={() => {
                handleSignOut().catch(signOutError => {
                  // eslint-disable-next-line no-console
                  console.error('Error signing out:', signOutError);
                });
              }}
              className='flex items-center text-gray-600 hover:text-gray-900 transition-colors space-x-2'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                />
              </svg>
              <span className='text-sm font-medium'>Cerrar sesión</span>
            </button>
          </div>
        </header>

        {/* Contenido Principal */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 pb-20 md:pb-20 lg:pb-20 min-h-screen'>
          {/* Saludo Personalizado */}
          <div className='mb-6 md:mb-8'>
            <div className='flex flex-col items-start mb-4'>
              <span className='text-base text-gray-700 font-semibold mb-1'>
                {greeting}, {userName} 👑
              </span>
              <h1 className='text-xl font-bold text-gray-900 leading-tight'>
                Panel de control del sistema
              </h1>
              <span className='text-base text-purple-700 font-semibold mt-1'>
                Súper Administrador
              </span>
            </div>
          </div>

          {/* Mensajes de Error y Éxito */}
          {error !== null && error !== undefined && (
            <div className='mb-4 rounded-lg bg-red-100 p-4 text-center text-sm text-red-700'>
              {error}
            </div>
          )}
          {successMessage !== null && successMessage !== undefined && (
            <div className='mb-4 rounded-lg bg-green-100 p-4 text-center text-sm text-green-700'>
              {successMessage}
            </div>
          )}

          {/* Estadísticas - Layout Responsive */}
          <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-6 mb-6 md:mb-8'>
            {/* Súper Admin */}
            <div className='bg-white rounded-2xl shadow-lg p-4 md:p-5 lg:p-6 border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p className='text-xs md:text-sm text-gray-600 mb-2'>
                    Súper Admin
                  </p>
                  <p className='text-xl md:text-2xl font-bold text-gray-900'>
                    1
                  </p>
                  <p className='text-xs md:text-sm text-purple-600 mt-1 font-medium hidden'>
                    Tú
                  </p>
                </div>
                <div className='w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center ml-3'>
                  <span className='text-xl md:text-2xl'>👑</span>
                </div>
              </div>
            </div>

            {/* Administradores */}
            <button
              onClick={() => {
                const adminsList = document.getElementById('admins-list');
                if (adminsList !== null && adminsList !== undefined) {
                  adminsList.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className='bg-white hover:bg-blue-50 active:bg-blue-100 rounded-2xl shadow-lg hover:shadow-xl p-4 md:p-5 lg:p-6 border border-gray-100 hover:border-blue-200 transition-all duration-200 w-full cursor-pointer transform hover:scale-105'
            >
              <div className='flex items-center justify-between'>
                <div className='flex-1 text-left'>
                  <p className='text-xs md:text-sm text-gray-600 mb-2'>
                    Administradores
                  </p>
                  <p className='text-xl md:text-2xl font-bold text-gray-900'>
                    {admins.length}
                  </p>
                </div>
                <div className='w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center ml-3'>
                  <span className='text-xl md:text-2xl'>👥</span>
                </div>
              </div>
            </button>

            {/* Trabajadoras */}
            <Link href='/workers' className='block'>
              <div className='bg-white hover:bg-green-50 active:bg-green-100 rounded-2xl shadow-lg hover:shadow-xl p-4 md:p-5 lg:p-6 border border-gray-100 hover:border-green-200 transition-all duration-200 w-full cursor-pointer transform hover:scale-105'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1 text-left'>
                    <p className='text-xs md:text-sm text-gray-600 mb-2'>
                      Trabajadoras
                    </p>
                    <p className='text-xl md:text-2xl font-bold text-gray-900'>
                      {workersStats.total}
                    </p>
                    <p className='text-xs md:text-sm text-green-600 mt-1 font-medium hidden'>
                      {workersStats.total > 0
                        ? `${workersStats.total} trabajadoras`
                        : 'Ninguna'}
                    </p>
                  </div>
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-xl flex items-center justify-center ml-3'>
                    <span className='text-xl md:text-2xl'>👷</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Usuarios */}
            <Link href='/users' className='block'>
              <div className='bg-white hover:bg-orange-50 active:bg-orange-100 rounded-2xl shadow-lg hover:shadow-xl p-4 md:p-5 lg:p-6 border border-gray-100 hover:border-orange-200 transition-all duration-200 w-full cursor-pointer transform hover:scale-105'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1 text-left'>
                    <p className='text-xs md:text-sm text-gray-600 mb-2'>
                      Usuarios
                    </p>
                    <p className='text-xl md:text-2xl font-bold text-gray-900'>
                      {usersStats.total}
                    </p>
                    <p className='text-xs md:text-sm text-orange-600 mt-1 font-medium hidden'>
                      {usersStats.total > 0
                        ? `${usersStats.total} usuarios`
                        : 'Ninguno'}
                    </p>
                  </div>
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center ml-3'>
                    <span className='text-xl md:text-2xl'>👤</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Sección de Administradores */}
          <div
            id='admins-list'
            className='bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100 mb-6 md:mb-8'
          >
            <div className='flex items-center justify-between mb-4 md:mb-6'>
              <h2 className='text-lg lg:text-xl font-bold text-gray-900'>
                👑 Administradores del Sistema
              </h2>
              <Button
                onClick={() => setIsCreateAdminModalOpen(true)}
                className='bg-purple-600 hover:bg-purple-700 text-white hidden md:flex'
              >
                ➕ Crear Administrador
              </Button>
            </div>

            <div className='space-y-3 md:space-y-4'>
              {admins.map(admin => (
                <div
                  key={admin.id}
                  className='bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4 lg:p-6'
                >
                  {/* Layout para móvil: dos líneas + botones debajo */}
                  <div className='md:hidden'>
                    <div className='flex items-center space-x-3 mb-3'>
                      <div className='w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg'>
                        <span className='text-white text-sm font-bold leading-none'>
                          {admin.name
                            ? admin.name
                                .split(' ')
                                .filter(Boolean)
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : '👤'}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-semibold text-gray-900 mb-1'>
                          {admin.name}
                        </h3>
                        <p className='text-sm text-gray-600 break-all'>
                          {admin.email}
                        </p>
                      </div>
                    </div>
                    <div className='flex flex-row justify-between gap-2'>
                      <button
                        onClick={() => {
                          setSelectedAdminForReset(admin);
                          setIsResetPasswordModalOpen(true);
                        }}
                        className='flex-1 py-2 px-3 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition-colors duration-200 border-2 border-orange-300'
                        title='Resetear contraseña'
                      >
                        🔑 Resetear
                      </button>
                      <button
                        onClick={() => {
                          // Acción de editar
                        }}
                        className='flex-1 py-2 px-3 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors duration-200 border-2 border-green-300'
                        title='Editar administrador'
                      >
                        ✏️
                        <br />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdminForDelete(admin);
                          setIsDeleteConfirmModalOpen(true);
                        }}
                        className='flex-1 py-2 px-3 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border-2 border-red-300'
                        title='Eliminar administrador'
                        disabled={admin.email === 'conectomail@gmail.com'}
                      >
                        {admin.email === 'conectomail@gmail.com'
                          ? '🔒 Protegido'
                          : '🗑️ Eliminar'}
                      </button>
                    </div>
                  </div>

                  {/* Layout para tablet/desktop: horizontal */}
                  <div className='hidden md:flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                      <div className='w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg'>
                        <span className='text-white text-sm font-bold leading-none'>
                          {admin.name
                            ? admin.name
                                .split(' ')
                                .filter(Boolean)
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : '👤'}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-semibold text-gray-900 mb-1'>
                          {admin.name}
                        </h3>
                        <p className='text-sm text-gray-600 break-all'>
                          {admin.email}
                        </p>
                        <p className='text-xs text-gray-500 mt-1'>
                          Creado:{' '}
                          {new Date(admin.created_at ?? '').toLocaleDateString(
                            'es-ES'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center space-x-2'>
                      <button
                        onClick={() => {
                          setSelectedAdminForReset(admin);
                          setIsResetPasswordModalOpen(true);
                        }}
                        className='px-3 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition-colors duration-200 border-2 border-orange-300'
                        title='Resetear contraseña'
                      >
                        🔑 Resetear
                      </button>
                      <button
                        onClick={() => {
                          // Acción de editar
                        }}
                        className='px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors duration-200 border-2 border-green-300'
                        title='Editar administrador'
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdminForDelete(admin);
                          setIsDeleteConfirmModalOpen(true);
                        }}
                        className='px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border-2 border-red-300'
                        title='Eliminar administrador'
                        disabled={admin.email === 'conectomail@gmail.com'}
                      >
                        {admin.email === 'conectomail@gmail.com'
                          ? '🔒 Protegido'
                          : '🗑️ Eliminar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {admins.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  <p>No hay administradores creados</p>
                  <p className='text-sm'>
                    Crea el primer administrador del sistema
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className='mt-8 md:mt-12 lg:mt-16 border-t border-gray-200 bg-white'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6'>
              <div className='text-center'>
                <p className='text-sm text-gray-600 mb-2'>
                  © 2025 SAD - Sistema de Gestión de Servicios Asistenciales
                  Domiciliarios
                </p>
                <p className='text-xs text-gray-500'>
                  Hecho con mucho ❤️ por{' '}
                  <span className='font-medium text-gray-700'>Gusi</span>
                </p>
              </div>
            </div>
          </footer>
        </div>

        {/* Navegación Móvil */}
        <Navigation variant='mobile' />

        {/* Modales (mantener los existentes) */}
        {/* Create Admin Modal */}
        <Modal
          isOpen={isCreateAdminModalOpen}
          onClose={() => {
            setIsCreateAdminModalOpen(false);
            setNewAdmin({ email: '', password: '', name: '', phone: '' });
            setValidationErrors({
              name: '',
              email: '',
              phone: '',
              password: '',
            });
          }}
          title='👑 Crear Nuevo Administrador'
          size='md'
        >
          <div className='space-y-4'>
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-start space-x-2'>
                <span className='text-blue-600 text-lg flex-shrink-0'>ℹ️</span>
                <div>
                  <p className='text-sm text-blue-800 font-medium'>
                    Nuevo Administrador del Sistema
                  </p>
                  <p className='text-xs text-blue-700 mt-1'>
                    Los administradores pueden gestionar trabajadoras, usuarios
                    y generar reportes del sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <span className='flex items-center space-x-2'>
                    <span className='text-purple-600'>👤</span>
                    <span>Nombre Completo *</span>
                  </span>
                </label>
                <Input
                  className={`w-full transition-colors duration-200 ${
                    validationErrors.name !== ''
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  placeholder='Ej: María García López'
                  value={newAdmin.name}
                  onChange={e => {
                    setNewAdmin({ ...newAdmin, name: e.target.value });
                    const nameError = validateName(e.target.value);
                    setValidationErrors({
                      ...validationErrors,
                      name: nameError,
                    });
                  }}
                />
                {validationErrors.name !== '' && (
                  <p className='mt-1 text-xs text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{validationErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <span className='flex items-center space-x-2'>
                    <span className='text-blue-600'>📧</span>
                    <span>Email Corporativo *</span>
                  </span>
                </label>
                <Input
                  className={`w-full transition-colors duration-200 ${
                    validationErrors.email !== ''
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  type='email'
                  placeholder='admin@empresa.com'
                  value={newAdmin.email}
                  onChange={e => {
                    setNewAdmin({ ...newAdmin, email: e.target.value });
                    const emailError = validateEmail(e.target.value);
                    setValidationErrors({
                      ...validationErrors,
                      email: emailError,
                    });
                  }}
                />
                {validationErrors.email !== '' && (
                  <p className='mt-1 text-xs text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{validationErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <span className='flex items-center space-x-2'>
                    <span className='text-green-600'>📱</span>
                    <span>Teléfono de Contacto *</span>
                  </span>
                </label>
                <Input
                  className={`w-full transition-colors duration-200 ${
                    validationErrors.phone !== ''
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  type='tel'
                  placeholder='612345678 o +34612345678'
                  value={newAdmin.phone}
                  onChange={e => {
                    setNewAdmin({ ...newAdmin, phone: e.target.value });
                    const phoneError = validatePhone(e.target.value);
                    setValidationErrors({
                      ...validationErrors,
                      phone: phoneError,
                    });
                  }}
                />
                {validationErrors.phone !== '' && (
                  <p className='mt-1 text-xs text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{validationErrors.phone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <span className='flex items-center space-x-2'>
                    <span className='text-orange-600'>🔐</span>
                    <span>Contraseña Segura *</span>
                  </span>
                </label>
                <Input
                  className={`w-full transition-colors duration-200 ${
                    validationErrors.password !== ''
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  type='password'
                  placeholder='Mínimo 6 caracteres con mayúscula y número'
                  value={newAdmin.password}
                  onChange={e => {
                    setNewAdmin({ ...newAdmin, password: e.target.value });
                    const passwordError = validatePassword(e.target.value);
                    setValidationErrors({
                      ...validationErrors,
                      password: passwordError,
                    });
                  }}
                />
                {validationErrors.password !== '' && (
                  <p className='mt-1 text-xs text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{validationErrors.password}</span>
                  </p>
                )}
                {newAdmin.password !== '' &&
                  validationErrors.password === '' && (
                    <p className='mt-1 text-xs text-green-600 flex items-center space-x-1'>
                      <span>✅</span>
                      <span>Contraseña válida</span>
                    </p>
                  )}
              </div>
            </div>

            <div className='flex flex-col md:flex-row md:justify-end space-y-3 md:space-y-0 md:space-x-3 pt-4 border-t border-gray-200'>
              <Button
                variant='outline'
                className='w-full md:w-auto py-3 md:py-2 text-sm md:text-base'
                onClick={() => {
                  setIsCreateAdminModalOpen(false);
                  setNewAdmin({ email: '', password: '', name: '', phone: '' });
                  setValidationErrors({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                  });
                }}
                disabled={loading}
              >
                <span className='flex items-center justify-center space-x-2'>
                  <span>❌</span>
                  <span>Cancelar</span>
                </span>
              </Button>
              <Button
                className='w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white py-3 md:py-2 text-sm md:text-base font-medium transition-colors duration-200'
                onClick={() => {
                  handleCreateAdmin().catch(createAdminError => {
                    // eslint-disable-next-line no-console
                    console.error('Error creating admin:', createAdminError);
                  });
                }}
                disabled={
                  loading ||
                  newAdmin.name === '' ||
                  newAdmin.email === '' ||
                  newAdmin.phone === '' ||
                  newAdmin.password === '' ||
                  validationErrors.name !== '' ||
                  validationErrors.email !== '' ||
                  validationErrors.phone !== '' ||
                  validationErrors.password !== ''
                }
              >
                <span className='flex items-center justify-center space-x-2'>
                  {loading ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <span>👑</span>
                      <span>Crear Administrador</span>
                    </>
                  )}
                </span>
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          isOpen={isResetPasswordModalOpen}
          onClose={() => {
            setIsResetPasswordModalOpen(false);
            setSelectedAdminForReset(null);
            setResetPasswordData({ password: '', confirmPassword: '' });
          }}
          title={`Resetear Contraseña - ${selectedAdminForReset?.name}`}
          size='md'
        >
          <div className='space-y-4'>
            <div className='bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-3 text-sm'>
              <strong>Atención:</strong> Esto cambiará la contraseña de{' '}
              <strong>{selectedAdminForReset?.email}</strong> inmediatamente.
            </div>

            <form onSubmit={e => e.preventDefault()} className='space-y-4'>
              {/* Campo de usuario oculto para accesibilidad */}
              <input
                type='text'
                name='username'
                autoComplete='username'
                style={{ display: 'none' }}
                value={selectedAdminForReset?.email ?? ''}
                readOnly
              />

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Nueva Contraseña *
                </label>
                <Input
                  type='password'
                  className='w-full'
                  placeholder='Mínimo 6 caracteres'
                  value={resetPasswordData.password}
                  autoComplete='new-password'
                  onChange={e =>
                    setResetPasswordData({
                      ...resetPasswordData,
                      password: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirmar Contraseña *
                </label>
                <Input
                  type='password'
                  className='w-full'
                  placeholder='Repetir contraseña'
                  value={resetPasswordData.confirmPassword}
                  autoComplete='new-password'
                  onChange={e =>
                    setResetPasswordData({
                      ...resetPasswordData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </form>

            {error !== null && error !== undefined && (
              <div className='bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm'>
                {error}
              </div>
            )}

            {successMessage !== null && successMessage !== undefined && (
              <div className='bg-green-50 border border-green-200 text-green-600 rounded-lg p-3 text-sm'>
                {successMessage}
              </div>
            )}

            <div className='flex justify-end space-x-3 pt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsResetPasswordModalOpen(false);
                  setSelectedAdminForReset(null);
                  setResetPasswordData({ password: '', confirmPassword: '' });
                }}
              >
                Cancelar
              </Button>
              <Button
                className='bg-orange-600 hover:bg-orange-700 text-white'
                onClick={() => {
                  handleResetPassword().catch(resetError => {
                    // eslint-disable-next-line no-console
                    console.error('Error resetting password:', resetError);
                  });
                }}
                disabled={
                  loading ||
                  resetPasswordData.password === '' ||
                  resetPasswordData.confirmPassword === ''
                }
              >
                {loading ? 'Reseteando...' : 'Resetear Contraseña'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteConfirmModalOpen}
          onClose={() => {
            setIsDeleteConfirmModalOpen(false);
            setSelectedAdminForDelete(null);
            setDeleteConfirmText('');
          }}
          title={`Eliminar Administrador - ${selectedAdminForDelete?.name}`}
          size='md'
        >
          <div className='space-y-4'>
            <div className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm'>
              <div className='flex items-start space-x-2'>
                <span className='text-lg'>⚠️</span>
                <div>
                  <strong>¡ATENCIÓN! Esta acción es irreversible.</strong>
                  <p className='mt-1'>
                    Estás a punto de eliminar permanentemente al administrador:
                  </p>
                  <p className='mt-1 font-medium'>
                    📧 {selectedAdminForDelete?.email}
                  </p>
                  <p className='mt-2'>
                    • Se eliminará completamente del sistema
                    <br />
                    • No podrá volver a acceder con estas credenciales
                    <br />• Esta acción NO se puede deshacer
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Para confirmar, escribe exactamente:{' '}
                <span className='font-bold text-red-600'>ELIMINAR</span>
              </label>
              <Input
                type='text'
                className='w-full'
                placeholder='Escribe: ELIMINAR'
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
              />
            </div>

            {error !== null && error !== undefined && (
              <div className='bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm'>
                {error}
              </div>
            )}

            {successMessage !== null && successMessage !== undefined && (
              <div className='bg-green-50 border border-green-200 text-green-600 rounded-lg p-3 text-sm'>
                {successMessage}
              </div>
            )}

            <div className='flex justify-end space-x-3 pt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsDeleteConfirmModalOpen(false);
                  setSelectedAdminForDelete(null);
                  setDeleteConfirmText('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className='bg-red-600 hover:bg-red-700 text-white'
                onClick={() => {
                  handleDeleteAdmin().catch(deleteError => {
                    // eslint-disable-next-line no-console
                    console.error('Error deleting admin:', deleteError);
                  });
                }}
                disabled={
                  loading ||
                  deleteConfirmText !== 'ELIMINAR' ||
                  selectedAdminForDelete?.email === 'conectomail@gmail.com'
                }
              >
                {loading ? 'Eliminando...' : '🗑️ Eliminar Definitivamente'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
