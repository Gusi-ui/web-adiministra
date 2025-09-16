'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navigation from '@/components/layout/Navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { logWorkerActivity } from '@/lib/activities-query';
import {
  createWorker,
  deleteWorker,
  getActiveWorkers,
  updateWorker,
} from '@/lib/workers-query';
import type { WorkerInsert, Worker as WorkerType, WorkerUpdate } from '@/types';
import { workerLogger } from '@/utils/logger';

// Usar el tipo de la base de datos
type Worker = WorkerType;

// Función helper para validar campos
const isValidField = (field: unknown): field is string =>
  typeof field === 'string' && field.length > 0;

export default function WorkersPage() {
  const { user } = useAuth();
  const currentUser = user;
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard');

  // Determinar la URL del dashboard según el rol del usuario
  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      setDashboardUrl('/super-dashboard');
    } else if (currentUser?.role === 'admin') {
      setDashboardUrl('/dashboard');
    } else if (currentUser?.role === 'worker') {
      setDashboardUrl('/worker-dashboard');
    }
  }, [currentUser?.role]);

  const [workers, setWorkers] = useState<WorkerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWorker, setSavingWorker] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingWorker, setEditingWorker] = useState<Partial<WorkerType>>({});
  const [workerAccessPassword, setWorkerAccessPassword] = useState<string>('');
  const [showWorkerPassword, setShowWorkerPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para modal de confirmación de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState(false);

  // Estados para validaciones del formulario de crear trabajadora
  const [workerValidationErrors, setWorkerValidationErrors] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    dni: '',
  });

  // Funciones de validación para trabajadoras
  const validateWorkerName = (name: string): string => {
    if (name.trim().length === 0) {
      return 'El nombre es obligatorio';
    }
    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(name.trim())) {
      return 'El nombre solo puede contener letras y espacios';
    }
    return '';
  };

  const validateWorkerSurname = (surname: string): string => {
    if (surname.trim().length === 0) {
      return 'Los apellidos son obligatorios';
    }
    if (surname.trim().length < 2) {
      return 'Los apellidos deben tener al menos 2 caracteres';
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(surname.trim())) {
      return 'Los apellidos solo pueden contener letras y espacios';
    }
    return '';
  };

  const validateWorkerEmail = (email: string): string => {
    if (email.trim().length === 0) {
      return 'El email es obligatorio';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Formato de email inválido';
    }
    return '';
  };

  const validateWorkerPhone = (phone: string): string => {
    if (phone.trim().length === 0) {
      return ''; // Teléfono es opcional
    }
    const phoneRegex =
      /^[67]\d{8}$|^[89]\d{8}$|^\+34[67]\d{8}$|^\+34[89]\d{8}$/;
    if (!phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
      return 'Formato de teléfono inválido (ej: 612345678 o +34612345678)';
    }
    return '';
  };

  const validateWorkerDni = (dni: string): string => {
    if (dni.trim().length === 0) {
      return 'El DNI es obligatorio';
    }

    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    if (!dniRegex.test(dni.trim())) {
      return 'Formato de DNI inválido (ej: 12345678A)';
    }

    // Validar letra del DNI
    const dniNumber = dni.trim().slice(0, 8);
    const dniLetter = dni.trim().slice(8).toUpperCase();
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';

    const expectedLetter = letters[parseInt(dniNumber) % 23];

    if (dniLetter !== expectedLetter) {
      return 'La letra del DNI no es correcta';
    }

    return '';
  };

  const validateWorkerForm = (): boolean => {
    const nameError = validateWorkerName(editingWorker.name ?? '');
    const surnameError = validateWorkerSurname(editingWorker.surname ?? '');
    const emailError = validateWorkerEmail(editingWorker.email ?? '');
    const phoneError = validateWorkerPhone(editingWorker.phone ?? '');
    const dniError = validateWorkerDni(editingWorker.dni ?? '');

    setWorkerValidationErrors({
      name: nameError,
      surname: surnameError,
      email: emailError,
      phone: phoneError,
      dni: dniError,
    });

    const isValid =
      nameError === '' &&
      surnameError === '' &&
      emailError === '' &&
      phoneError === '' &&
      dniError === '';

    return isValid;
  };

  // validateWorkerForm definida (sin log para evitar infinite re-renders)

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

  // Cargar trabajadoras desde Supabase
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        setLoading(true);
        const workersData = await getActiveWorkers();
        setWorkers(workersData);
      } catch {
        // Error loading workers
      } finally {
        setLoading(false);
      }
    };

    loadWorkers().catch(() => {
      // Error loading workers
    });
  }, []);

  // Filtrar trabajadoras basado en búsqueda y filtro
  const filteredWorkers = workers.filter(worker => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.surname ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.dni !== undefined &&
        worker.dni !== null &&
        worker.dni.length > 0 &&
        // Permitir buscar por últimos 3 dígitos sin exponer completo
        worker.dni.slice(-3).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' ||
      (worker.is_active === true && filterStatus === 'activa') ||
      (worker.is_active === false && filterStatus === 'inactiva');

    return matchesSearch && matchesStatus;
  });

  // Estadísticas calculadas
  const stats = {
    total: workers.length,
    active: workers.filter(w => w.is_active === true).length,
    inactive: workers.filter(w => w.is_active === false).length,
    vacation: 0, // No hay campo de vacaciones en el esquema actual
  };

  const handleAddWorker = () => {
    // Limpiar todos los estados antes de abrir el modal
    setEditingWorker({});
    setWorkerValidationErrors({
      name: '',
      surname: '',
      email: '',
      phone: '',
      dni: '',
    });
    setError(null);
    setSavingWorker(false);
    setIsAddModalOpen(true);
  };

  const generatePassword = (length = 12): string => {
    const charset =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-';
    const buf = new Uint32Array(length);
    if (
      typeof window !== 'undefined' &&
      typeof window.crypto !== 'undefined' &&
      typeof window.crypto.getRandomValues === 'function'
    ) {
      window.crypto.getRandomValues(buf);
    } else {
      for (let i = 0; i < length; i += 1) {
        buf[i] = Math.floor(Math.random() * 4294967296);
      }
    }
    let pwd = '';
    for (let i = 0; i < length; i += 1) {
      const v = buf[i] ?? 0;
      const idx = v % charset.length;
      pwd += charset.charAt(idx);
    }
    return pwd;
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setEditingWorker({ ...worker });
    // No generar contraseña automáticamente al abrir edición
    setWorkerAccessPassword('');
    setIsEditModalOpen(true);
  };

  const handleViewWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsViewModalOpen(true);
  };

  const copyWorkerCredentialsToClipboard = (
    email: string,
    password: string
  ): void => {
    const text = `Email: ${email}\nContraseña: ${password}`;
    const setOk = (): void =>
      setSuccessMessage('Credenciales copiadas al portapapeles.');
    const setErr = (): void =>
      setError('No se pudieron copiar las credenciales.');
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      navigator.clipboard.writeText(text).then(setOk).catch(setErr);
      return;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) setOk();
      else setErr();
    } catch {
      setErr();
    }
  };

  // generatePassword definido antes de su uso

  const handleSaveWorker = async () => {
    setSavingWorker(true);
    setError(null); // Limpiar errores previos

    try {
      if (isAddModalOpen) {
        // Validar formulario antes de enviar
        if (!validateWorkerForm()) {
          setError('Por favor, corrige los errores en el formulario.');
          setSavingWorker(false);
          return;
        }

        const workerData = {
          name: (editingWorker.name ?? '').trim(),
          surname: (editingWorker.surname ?? '').trim(),
          email: (editingWorker.email ?? '').trim(),
          phone: (editingWorker.phone ?? '').trim(),
          dni: (editingWorker.dni ?? '').trim(),
          worker_type: 'cuidadora', // Valor por defecto fijo
          is_active: editingWorker.is_active ?? true,
          weekly_contracted_hours: editingWorker.weekly_contracted_hours ?? 0,
          address: (editingWorker.address ?? '').trim(),
          postal_code: (editingWorker.postal_code ?? '').trim(),
          city: (editingWorker.city ?? '').trim(),
        } as WorkerInsert;

        // Debug: log the data being sent
        workerLogger.sendingData(workerData);

        const newWorker = await createWorker(workerData);
        workerLogger.created(newWorker);

        // Log de creación de trabajadora
        const nameMeta = user?.user_metadata?.name as string | undefined;
        const adminName =
          typeof nameMeta === 'string' && nameMeta.trim().length > 0
            ? nameMeta
            : 'Administrador';
        const adminEmail = typeof user?.email === 'string' ? user.email : '';

        await logWorkerActivity(
          adminName,
          adminEmail,
          'creó',
          `${newWorker.name} ${newWorker.surname}`,
          newWorker.id
        );

        setWorkers([...workers, newWorker]);
        setIsAddModalOpen(false);
        setEditingWorker({});
        setWorkerValidationErrors({
          name: '',
          surname: '',
          email: '',
          phone: '',
          dni: '',
        });
        setSuccessMessage('Trabajadora creada con éxito.');
      } else if (isEditModalOpen && selectedWorker) {
        // Validar campos requeridos antes de actualizar
        if (
          !isValidField(editingWorker.name) ||
          !isValidField(editingWorker.surname) ||
          !isValidField(editingWorker.email) ||
          !isValidField(editingWorker.dni)
        ) {
          setError('Los campos marcados con * son obligatorios.');
          setSavingWorker(false);
          return;
        }

        // Construir el objeto de actualización dinámicamente
        const workerData: WorkerUpdate = {};
        if (isValidField(editingWorker.name)) {
          workerData.name = editingWorker.name;
        }
        if (isValidField(editingWorker.surname)) {
          workerData.surname = editingWorker.surname;
        }
        if (isValidField(editingWorker.email)) {
          workerData.email = editingWorker.email;
        }
        if (isValidField(editingWorker.phone)) {
          workerData.phone = editingWorker.phone;
        }
        if (isValidField(editingWorker.dni)) {
          workerData.dni = editingWorker.dni;
        }
        if (isValidField(editingWorker.worker_type)) {
          workerData.worker_type = editingWorker.worker_type;
        }
        if (
          editingWorker.is_active !== undefined &&
          editingWorker.is_active !== null
        ) {
          workerData.is_active = editingWorker.is_active;
        }
        if (
          editingWorker.weekly_contracted_hours !== undefined &&
          editingWorker.weekly_contracted_hours !== null
        ) {
          workerData.weekly_contracted_hours =
            editingWorker.weekly_contracted_hours;
        }
        if (
          editingWorker.address !== undefined &&
          editingWorker.address !== null
        ) {
          workerData.address = editingWorker.address.trim();
        }
        if (
          editingWorker.postal_code !== undefined &&
          editingWorker.postal_code !== null
        ) {
          workerData.postal_code = editingWorker.postal_code.trim();
        }
        if (editingWorker.city !== undefined && editingWorker.city !== null) {
          workerData.city = editingWorker.city.trim();
        }

        // Debug: log de los datos que se van a enviar
        // console.log('🔍 DEBUG - Datos a actualizar:', workerData);
        // console.log('🔍 DEBUG - ID de trabajadora:', selectedWorker.id);

        const updatedWorker = await updateWorker(selectedWorker.id, workerData);
        if (updatedWorker) {
          // Log de actualización de trabajadora (antes de la actualización de contraseña)
          const nameMeta = user?.user_metadata?.name as string | undefined;
          const adminName =
            typeof nameMeta === 'string' && nameMeta.trim().length > 0
              ? nameMeta
              : 'Administrador';
          const adminEmail = typeof user?.email === 'string' ? user.email : '';

          try {
            await logWorkerActivity(
              adminName,
              adminEmail,
              'actualizó',
              `${updatedWorker.name} ${updatedWorker.surname}`,
              updatedWorker.id
            );
            // Actividad registrada correctamente (sin log en consola)
          } catch (logError) {
            workerLogger.error(
              'Error al registrar actividad de actualización:'
            );
            workerLogger.error(logError);
            // No fallar la operación principal por un error de logging
          }

          // Si el admin ha introducido una contraseña válida, también actualizamos el acceso de Supabase Auth
          const trimmedPassword = workerAccessPassword.trim();
          if (
            trimmedPassword.length >= 6 &&
            isValidField(updatedWorker.email) &&
            isValidField(updatedWorker.name)
          ) {
            try {
              const resp = await fetch('/api/workers/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: updatedWorker.email.trim(),
                  name: updatedWorker.name.trim(),
                  password: trimmedPassword,
                }),
              });
              const json = (await resp.json()) as {
                success: boolean;
                message: string;
              };
              if (!json.success) {
                setError(json.message ?? 'Error generando acceso');
              } else {
                setSuccessMessage(
                  'Trabajadora actualizada y acceso configurado.'
                );
              }
            } catch {
              setError('Error generando acceso');
            }
          }
          const updatedWorkers = workers.map(w => {
            if (w.id === selectedWorker.id) {
              return updatedWorker;
            }
            return w;
          });
          setWorkers(updatedWorkers);
          setIsEditModalOpen(false);
          setSuccessMessage('Trabajadora actualizada con éxito.');
        } else {
          workerLogger.error('No se pudo obtener la trabajadora actualizada');
        }
      }
      setEditingWorker({});
    } catch (err) {
      workerLogger.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al guardar: ${errorMessage}`);
    } finally {
      setSavingWorker(false);
    }
  };

  // Función para abrir modal de confirmación de eliminación
  const handleDeleteWorkerConfirm = (worker: Worker) => {
    setWorkerToDelete(worker);
    setIsDeleteModalOpen(true);
  };

  // Función para cerrar modal de eliminación
  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setWorkerToDelete(null);
    setDeletingWorker(false);
  };

  // Función para ejecutar la eliminación
  const handleDeleteWorker = async () => {
    if (workerToDelete === null) return;

    setDeletingWorker(true);
    try {
      await deleteWorker(workerToDelete.id);
      setWorkers(workers.filter(w => w.id !== workerToDelete.id));
      setSuccessMessage('Trabajadora eliminada con éxito.');

      // Log de eliminación de trabajadora
      const nameMeta = user?.user_metadata?.name as string | undefined;
      const adminName =
        typeof nameMeta === 'string' && nameMeta.trim().length > 0
          ? nameMeta
          : 'Administrador';
      const adminEmail = typeof user?.email === 'string' ? user.email : '';

      await logWorkerActivity(
        adminName,
        adminEmail,
        'eliminó',
        `${workerToDelete.name} ${workerToDelete.surname}`,
        workerToDelete.id
      );

      handleDeleteModalClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al eliminar: ${errorMessage}`);
      setDeletingWorker(false);
    }
  };

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen flex flex-col'>
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
                      id='mobileWorkersLogoGradient'
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
                    fill='url(#mobileWorkersLogoGradient)'
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
            <Link
              href={dashboardUrl}
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
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
              <span className='text-sm font-medium'>Volver al Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Contenido Principal */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 flex-1'>
          {/* Header Desktop */}
          <div className='hidden lg:block mb-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                  👥 Gestión de Trabajadoras
                </h1>
                <p className='text-gray-600 text-lg'>
                  Administra el equipo de servicios asistenciales domiciliarios
                </p>
              </div>
            </div>
          </div>

          {/* Header Mobile */}
          <div className='lg:hidden mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>
              👥 Gestión de Trabajadoras
            </h1>
            <p className='text-gray-600 text-sm'>
              Administra el equipo de servicios asistenciales
            </p>
          </div>

          {/* Mensajes de Éxito y Error */}
          {successMessage !== null && successMessage !== undefined && (
            <div className='mb-4 rounded-lg bg-green-100 p-4 text-center text-sm text-green-700'>
              {successMessage}
            </div>
          )}
          {error !== null && error !== undefined && (
            <div className='mb-4 rounded-lg bg-red-100 p-4 text-center text-sm text-red-700'>
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            <div
              onClick={() => setFilterStatus('all')}
              className='cursor-pointer'
            >
              <Card
                className={`p-4 lg:p-6 bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 hover:shadow-lg transition-all duration-200 ${
                  filterStatus === 'all' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>👥</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-800'>
                      Total Trabajadoras
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.total}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            <div
              onClick={() => setFilterStatus('activa')}
              className='cursor-pointer'
            >
              <Card
                className={`p-4 lg:p-6 bg-gradient-to-br from-green-100 to-green-200 border-green-300 hover:shadow-lg transition-all duration-200 ${
                  filterStatus === 'activa' ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>✅</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-800'>
                      Activas
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.active}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            <div
              onClick={() => setFilterStatus('inactiva')}
              className='cursor-pointer'
            >
              <Card
                className={`p-4 lg:p-6 bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300 hover:shadow-lg transition-all duration-200 ${
                  filterStatus === 'inactiva' ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>⏸️</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-800'>
                      Inactivas
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.inactive}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            <div
              onClick={() => setFilterStatus('vacaciones')}
              className='cursor-pointer'
            >
              <Card
                className={`p-4 lg:p-6 bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 hover:shadow-lg transition-all duration-200 ${
                  filterStatus === 'vacaciones' ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className='flex items-center'>
                  <div className='text-2xl lg:text-3xl mr-3'>🏖️</div>
                  <div>
                    <p className='text-sm lg:text-base font-medium text-gray-800'>
                      Vacaciones
                    </p>
                    <p className='text-xl lg:text-2xl font-bold text-gray-900'>
                      {stats.vacation}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Search and Actions */}
          <div className='mb-6 space-y-4'>
            {/* Search Bar */}
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <svg
                  className='h-5 w-5 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </div>
              <Input
                className='pl-10 w-full'
                placeholder='Buscar por nombre, email o DNI...'
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>

            {/* Actions */}
            <div className='flex flex-col sm:flex-row gap-3'>
              <Button
                className='bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200'
                onClick={handleAddWorker}
              >
                ➕ Agregar Trabajadora
              </Button>

              {/* Filter Status */}
              <select
                className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900'
                value={filterStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilterStatus(e.target.value)
                }
              >
                <option className='bg-white text-gray-900' value='all'>
                  Todos los estados
                </option>
                <option className='bg-white text-gray-900' value='activa'>
                  Activas
                </option>
                <option className='bg-white text-gray-900' value='inactiva'>
                  Inactivas
                </option>
                <option className='bg-white text-gray-900' value='vacaciones'>
                  Vacaciones
                </option>
              </select>

              {/* Chip de estado seleccionado */}
              {filterStatus !== 'all' && (
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${
                    filterStatus === 'activa'
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : filterStatus === 'inactiva'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                        : filterStatus === 'vacaciones'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : 'bg-blue-50 text-blue-700 border-blue-300'
                  }`}
                >
                  <span>
                    {filterStatus === 'activa'
                      ? 'Activas'
                      : filterStatus === 'inactiva'
                        ? 'Inactivas'
                        : filterStatus === 'vacaciones'
                          ? 'Vacaciones'
                          : 'Todos'}
                  </span>
                  <button
                    type='button'
                    aria-label='Limpiar filtro'
                    className='hover:opacity-80'
                    onClick={() => setFilterStatus('all')}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <p className='mt-2 text-gray-600'>Cargando trabajadoras...</p>
            </div>
          )}

          {/* Workers List - Mobile Cards */}
          {!loading && (
            <div className='md:hidden space-y-4'>
              {filteredWorkers.map(worker => (
                <Card
                  key={worker.id}
                  className='p-4 shadow-lg hover:shadow-xl transition-all duration-200'
                >
                  {/* Header con Avatar y Nombre */}
                  <div className='flex items-center space-x-3 mb-3'>
                    <div className='w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md'>
                      <span className='text-sm font-bold text-white'>
                        {worker.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-medium text-gray-900 text-lg'>
                        {worker.name} {worker.surname ?? ''}
                      </h3>
                      <span className='inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200'>
                        {worker.worker_type}
                      </span>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className='space-y-2 mb-4'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-gray-400 text-sm'>📧</span>
                      <span className='text-sm text-gray-700'>
                        {worker.email}
                      </span>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <span className='text-gray-400 text-sm'>📱</span>
                      <span className='text-sm text-gray-700'>
                        {worker.phone}
                      </span>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <span className='text-gray-400 text-sm'>🆔</span>
                      <span className='text-sm text-gray-700'>
                        DNI: {worker.dni?.replace(/.(?=.{3}$)/g, '*')}
                      </span>
                    </div>
                  </div>

                  {/* Estado y Acciones */}
                  <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
                    <div className='flex items-center space-x-2'>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ring-1 ring-inset ${
                          worker.is_active === true
                            ? 'bg-green-100 text-green-800 border border-green-300 ring-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300 ring-red-300'
                        }`}
                      >
                        {worker.is_active === true ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className='flex items-center space-x-3'>
                      <button
                        className='text-blue-600 hover:text-blue-900 transition-colors text-sm font-medium'
                        onClick={() => handleViewWorker(worker)}
                      >
                        👁️ Ver
                      </button>
                      <button
                        className='text-indigo-600 hover:text-indigo-900 transition-colors text-sm font-medium'
                        onClick={() => handleEditWorker(worker)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className='text-red-600 hover:text-red-900 transition-colors text-sm font-medium'
                        onClick={() => handleDeleteWorkerConfirm(worker)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Workers List - Tablet Hybrid Layout */}
          {!loading && (
            <div className='hidden md:block lg:hidden space-y-3'>
              {filteredWorkers.map(worker => (
                <Card
                  key={worker.id}
                  className='p-4 shadow-lg hover:shadow-xl transition-all duration-200'
                >
                  <div className='flex items-center gap-6'>
                    {/* Avatar y información principal */}
                    <div className='flex items-center space-x-4 flex-1'>
                      <div className='w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0'>
                        <span className='text-base font-bold text-white'>
                          {worker.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-semibold text-gray-900 mb-1'>
                          {worker.name} {worker.surname ?? ''}
                        </h3>
                        <span className='inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-1'>
                          {worker.worker_type}
                        </span>
                        <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
                          <span>📧 {worker.email}</span>
                          <span>📱 {worker.phone}</span>
                          <span>
                            🆔 {worker.dni?.replace(/.(?=.{3}$)/g, '*')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Estado y acciones */}
                    <div className='flex flex-col items-center gap-3 min-w-0'>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ring-1 ring-inset ${
                          worker.is_active === true
                            ? 'bg-green-100 text-green-800 border border-green-300 ring-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300 ring-red-300'
                        }`}
                      >
                        {worker.is_active === true ? 'Activa' : 'Inactiva'}
                      </span>

                      <div className='flex space-x-2'>
                        <button
                          className='px-3 py-1 text-xs text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors whitespace-nowrap'
                          onClick={() => handleViewWorker(worker)}
                        >
                          👁️ Ver
                        </button>
                        <button
                          className='px-3 py-1 text-xs text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors whitespace-nowrap'
                          onClick={() => handleEditWorker(worker)}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className='px-3 py-1 text-xs text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors whitespace-nowrap'
                          onClick={() => handleDeleteWorkerConfirm(worker)}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Workers Table - Desktop */}
          {!loading && (
            <div className='hidden lg:block'>
              <Card className='overflow-hidden shadow-lg'>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gradient-to-r from-gray-50 to-gray-100'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Trabajadora
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Email
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Teléfono
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Estado
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {filteredWorkers.map(worker => (
                        <tr
                          key={worker.id}
                          className='hover:bg-gray-50 transition-colors'
                        >
                          <td className='px-4 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <div className='w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-md'>
                                <span className='text-sm font-bold text-white'>
                                  {worker.name
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <div>
                                <div className='text-sm font-medium text-gray-900'>
                                  {worker.name} {worker.surname ?? ''}
                                </div>
                                <div className='text-sm text-gray-600'>
                                  DNI:{' '}
                                  <span className='font-medium text-gray-800'>
                                    {worker.dni?.replace(/.(?=.{3}$)/g, '*')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {worker.email}
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {worker.phone}
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap'>
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ring-1 ring-inset ${
                                worker.is_active === true
                                  ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 ring-green-300'
                                  : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 ring-red-300'
                              }`}
                            >
                              {worker.is_active === true
                                ? 'Activa'
                                : 'Inactiva'}
                            </span>
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2'>
                            <button
                              className='text-blue-600 hover:text-blue-900 transition-colors'
                              onClick={() => handleViewWorker(worker)}
                            >
                              👁️ Ver
                            </button>
                            <button
                              className='text-indigo-600 hover:text-indigo-900 transition-colors'
                              onClick={() => handleEditWorker(worker)}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              className='text-red-600 hover:text-red-900 transition-colors'
                              onClick={() => handleDeleteWorkerConfirm(worker)}
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* No Results */}
          {filteredWorkers.length === 0 && (
            <Card className='p-8 text-center'>
              <div className='text-gray-500'>
                <svg
                  className='mx-auto h-12 w-12 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900'>
                  No se encontraron trabajadoras
                </h3>
                <p className='mt-1 text-sm text-gray-500'>
                  {searchTerm
                    ? 'Intenta con otros términos de búsqueda.'
                    : 'No hay trabajadoras registradas.'}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Add Worker Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingWorker({});
            setWorkerValidationErrors({
              name: '',
              surname: '',
              email: '',
              phone: '',
              dni: '',
            });
            setError(null);
            setSavingWorker(false);
          }}
          title='👷‍♀️ Agregar Nueva Trabajadora'
          size='lg'
        >
          <div className='space-y-4 md:space-y-6'>
            {/* Banner informativo */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4'>
              <div className='flex items-start space-x-2'>
                <span className='text-blue-600 text-lg md:text-xl flex-shrink-0'>
                  ℹ️
                </span>
                <div>
                  <p className='text-sm md:text-base text-blue-800 font-medium'>
                    Nueva Trabajadora del Sistema
                  </p>
                  <p className='text-xs md:text-sm text-blue-700 mt-1'>
                    Las trabajadoras pueden gestionar servicios asistenciales
                    domiciliarios y registrar sus actividades.
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario responsive */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
              {/* Nombre */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>👤</span>
                  <span>Nombre *</span>
                </label>
                <Input
                  className={`w-full h-11 placeholder:text-gray-400 ${
                    workerValidationErrors.name !== ''
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder='María Carmen'
                  value={editingWorker.name ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setEditingWorker({
                      ...editingWorker,
                      name: newValue,
                    });
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Validar solo cuando se pierde el foco (más eficiente)
                    setWorkerValidationErrors(prev => ({
                      ...prev,
                      name: validateWorkerName(e.target.value),
                    }));
                  }}
                />
                {workerValidationErrors.name !== '' && (
                  <p className='text-xs md:text-sm text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{workerValidationErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Apellidos */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>👤</span>
                  <span>Apellidos *</span>
                </label>
                <Input
                  className={`w-full h-11 placeholder:text-gray-400 ${
                    workerValidationErrors.surname !== ''
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder='García López'
                  value={editingWorker.surname ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setEditingWorker({
                      ...editingWorker,
                      surname: newValue,
                    });
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Validar solo cuando se pierde el foco (más eficiente)
                    setWorkerValidationErrors(prev => ({
                      ...prev,
                      surname: validateWorkerSurname(e.target.value),
                    }));
                  }}
                />
                {workerValidationErrors.surname !== '' && (
                  <p className='text-xs md:text-sm text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{workerValidationErrors.surname}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>📧</span>
                  <span>Email *</span>
                </label>
                <Input
                  className={`w-full h-11 placeholder:text-gray-400 ${
                    workerValidationErrors.email !== ''
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder='maria.garcia@email.com'
                  type='email'
                  value={editingWorker.email ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setEditingWorker({
                      ...editingWorker,
                      email: newValue,
                    });
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Validar solo cuando se pierde el foco (más eficiente)
                    setWorkerValidationErrors(prev => ({
                      ...prev,
                      email: validateWorkerEmail(e.target.value),
                    }));
                  }}
                />
                {workerValidationErrors.email !== '' && (
                  <p className='text-xs md:text-sm text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{workerValidationErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>📱</span>
                  <span>Teléfono</span>
                </label>
                <Input
                  className={`w-full h-11 placeholder:text-gray-400 ${
                    workerValidationErrors.phone !== ''
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder='612345678 o +34612345678'
                  type='tel'
                  value={editingWorker.phone ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setEditingWorker({
                      ...editingWorker,
                      phone: newValue,
                    });
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Validar solo cuando se pierde el foco (más eficiente)
                    setWorkerValidationErrors(prev => ({
                      ...prev,
                      phone: validateWorkerPhone(e.target.value),
                    }));
                  }}
                />
                {workerValidationErrors.phone !== '' && (
                  <p className='text-xs md:text-sm text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{workerValidationErrors.phone}</span>
                  </p>
                )}
              </div>

              {/* DNI */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>🆔</span>
                  <span>DNI *</span>
                </label>
                <Input
                  className={`w-full h-11 placeholder:text-gray-400 ${
                    workerValidationErrors.dni !== ''
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder='12345678A'
                  type='text'
                  value={editingWorker.dni ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value.toUpperCase();
                    setEditingWorker({
                      ...editingWorker,
                      dni: newValue,
                    });
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Validar solo cuando se pierde el foco (más eficiente)
                    setWorkerValidationErrors(prev => ({
                      ...prev,
                      dni: validateWorkerDni(e.target.value),
                    }));
                  }}
                />
                {workerValidationErrors.dni !== '' && (
                  <p className='text-xs md:text-sm text-red-600 flex items-center space-x-1'>
                    <span>⚠️</span>
                    <span>{workerValidationErrors.dni}</span>
                  </p>
                )}
              </div>

              {/* Estado */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>⚡</span>
                  <span>Estado</span>
                </label>
                <select
                  className='w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base bg-white text-gray-900 shadow-sm min-h-[44px]'
                  value={
                    editingWorker.is_active === true
                      ? 'activa'
                      : editingWorker.is_active === false
                        ? 'inactiva'
                        : 'activa'
                  }
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEditingWorker({
                      ...editingWorker,
                      is_active: e.target.value === 'activa',
                    })
                  }
                >
                  <option value='activa'>✅ Activa</option>
                  <option value='inactiva'>❌ Inactiva</option>
                </select>
              </div>

              {/* Horas Contratadas Semanales */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>⏰</span>
                  <span>Horas Contratadas Semanales</span>
                </label>
                <Input
                  className='w-full h-11 placeholder:text-gray-400 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  type='number'
                  min='0'
                  max='80'
                  step='0.5'
                  placeholder='40'
                  value={editingWorker.weekly_contracted_hours ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    const next = { ...editingWorker } as Partial<Worker>;
                    if (value === '') {
                      delete next.weekly_contracted_hours;
                    } else {
                      next.weekly_contracted_hours = parseFloat(value);
                    }
                    setEditingWorker(next);
                  }}
                />
                <p className='text-xs text-gray-600'>
                  Horas totales contratadas por semana (ej: 40h = jornada
                  completa)
                </p>
              </div>

              {/* Dirección */}
              <div className='space-y-2 md:col-span-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>🏠</span>
                  <span>Dirección</span>
                </label>
                <Input
                  className='w-full h-11 placeholder:text-gray-400 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  placeholder='Calle Mayor, 123, 1º A'
                  value={editingWorker.address ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      address: e.target.value,
                    });
                  }}
                />
                <p className='text-xs text-gray-600'>
                  Dirección completa para el cálculo de rutas
                </p>
              </div>

              {/* Código Postal */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>📮</span>
                  <span>Código Postal</span>
                </label>
                <Input
                  className='w-full h-11 placeholder:text-gray-400 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  placeholder='28001'
                  value={editingWorker.postal_code ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      postal_code: e.target.value,
                    });
                  }}
                />
              </div>

              {/* Ciudad */}
              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm md:text-base font-medium text-gray-900'>
                  <span className='text-blue-600'>🏙️</span>
                  <span>Ciudad</span>
                </label>
                <Input
                  className='w-full h-11 placeholder:text-gray-400 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  placeholder='Madrid'
                  value={editingWorker.city ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      city: e.target.value,
                    });
                  }}
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className='flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 pt-4 md:pt-6'>
              <Button
                variant='outline'
                className='w-full md:w-auto py-3 md:py-2 text-sm md:text-base'
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingWorker({});
                  setWorkerValidationErrors({
                    name: '',
                    surname: '',
                    email: '',
                    phone: '',
                    dni: '',
                  });
                  setError(null);
                  setSavingWorker(false);
                }}
              >
                ❌ Cancelar
              </Button>
              <Button
                className={`w-full md:w-auto py-3 md:py-2 text-sm md:text-base bg-blue-600 hover:bg-blue-700 text-white ${
                  savingWorker ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => {
                  handleSaveWorker().catch(() => {
                    // Error saving worker
                  });
                }}
                disabled={
                  savingWorker ||
                  workerValidationErrors.name !== '' ||
                  workerValidationErrors.surname !== '' ||
                  workerValidationErrors.email !== '' ||
                  workerValidationErrors.phone !== '' ||
                  workerValidationErrors.dni !== '' ||
                  (editingWorker.name ?? '').trim() === '' ||
                  (editingWorker.surname ?? '').trim() === '' ||
                  (editingWorker.email ?? '').trim() === '' ||
                  (editingWorker.dni ?? '').trim() === ''
                }
              >
                {savingWorker ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  '👷‍♀️ Crear Trabajadora'
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Worker Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title='Editar Trabajadora'
          size='lg'
        >
          <div className='space-y-6'>
            {/* Encabezado con avatar y nombre */}
            <div className='flex flex-col items-center mb-2'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg mb-2'>
                <span className='text-2xl font-bold text-white'>
                  {editingWorker.name !== undefined &&
                  editingWorker.name !== null &&
                  editingWorker.name.trim().length > 0
                    ? editingWorker.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                    : '?'}
                </span>
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>
                {editingWorker.name ?? 'Nueva trabajadora'}
              </h3>
              {editingWorker.is_active !== undefined &&
                editingWorker.is_active !== null && (
                  <span
                    className={`mt-1 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      editingWorker.is_active === true
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {editingWorker.is_active === true ? 'Activa' : 'Inactiva'}
                  </span>
                )}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Nombre Completo *
                </label>
                <Input
                  className='w-full'
                  value={editingWorker.name ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      name: e.target.value,
                    });
                  }}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Email *
                </label>
                <Input
                  className='w-full'
                  type='email'
                  value={editingWorker.email ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      email: e.target.value,
                    });
                  }}
                />
              </div>
              <div className='sm:col-span-2'>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Contraseña de acceso (APP)
                </label>
                <form onSubmit={e => e.preventDefault()} className='space-y-2'>
                  {/* Campo de usuario oculto para accesibilidad */}
                  <input
                    type='text'
                    name='username'
                    autoComplete='username'
                    style={{ display: 'none' }}
                    value={editingWorker.email ?? ''}
                    readOnly
                  />
                  <Input
                    id='worker-password-input'
                    className='w-full h-11 bg-white text-gray-900 placeholder:text-gray-400'
                    type={showWorkerPassword ? 'text' : 'password'}
                    placeholder='Introduce o genera una contraseña'
                    value={workerAccessPassword}
                    autoComplete='new-password'
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setWorkerAccessPassword(e.target.value)
                    }
                  />
                  <div className='flex flex-col sm:flex-row gap-2'>
                    <Button
                      variant='outline'
                      onClick={() => setShowWorkerPassword(v => !v)}
                    >
                      {showWorkerPassword ? 'Ocultar' : 'Mostrar'}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() =>
                        setWorkerAccessPassword(generatePassword())
                      }
                    >
                      Generar
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => {
                        if (!isValidField(editingWorker.email)) {
                          setError('Email requerido para copiar credenciales.');
                          return;
                        }
                        copyWorkerCredentialsToClipboard(
                          editingWorker.email,
                          workerAccessPassword
                        );
                      }}
                    >
                      Copiar credenciales
                    </Button>
                  </div>
                </form>
                <p className='mt-1 text-xs text-gray-600'>
                  Mínimo 6 caracteres. Puedes editarla manualmente.
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Teléfono
                </label>
                <Input
                  className='w-full'
                  type='tel'
                  value={editingWorker.phone ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingWorker({
                      ...editingWorker,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  DNI *
                </label>
                <Input
                  className='w-full'
                  value={editingWorker.dni ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingWorker({
                      ...editingWorker,
                      dni: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Tipo de Trabajadora
                </label>
                <select
                  className='w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[44px]'
                  value={editingWorker.worker_type ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEditingWorker({
                      ...editingWorker,
                      worker_type: e.target.value as
                        | 'cuidadora'
                        | 'auxiliar'
                        | 'enfermera',
                    })
                  }
                >
                  <option value=''>Seleccionar tipo</option>
                  <option value='cuidadora'>Cuidadora</option>
                  <option value='auxiliar'>Auxiliar</option>
                  <option value='enfermera'>Enfermera</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Estado
                </label>
                <select
                  className='w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[44px]'
                  value={
                    editingWorker.is_active === true
                      ? 'activa'
                      : editingWorker.is_active === false
                        ? 'inactiva'
                        : ''
                  }
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEditingWorker({
                      ...editingWorker,
                      is_active: e.target.value === 'activa',
                    })
                  }
                >
                  <option value=''>Seleccionar estado</option>
                  <option value='activa'>Activa</option>
                  <option value='inactiva'>Inactiva</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Horas Contratadas Semanales
                </label>
                <Input
                  className='w-full'
                  type='number'
                  min='0'
                  max='80'
                  step='0.5'
                  placeholder='40'
                  value={editingWorker.weekly_contracted_hours ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    const next = { ...editingWorker } as Partial<Worker>;
                    if (value === '') {
                      delete next.weekly_contracted_hours;
                    } else {
                      next.weekly_contracted_hours = parseFloat(value);
                    }
                    setEditingWorker(next);
                  }}
                />
                <p className='text-xs text-gray-600 mt-1'>
                  Horas totales contratadas por semana (ej: 40h = jornada
                  completa)
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Dirección
                </label>
                <Input
                  className='w-full'
                  type='text'
                  placeholder='Calle, número, piso...'
                  value={editingWorker.address ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      address: e.target.value,
                    });
                  }}
                />
                <p className='text-xs text-gray-600 mt-1'>
                  Dirección completa de la trabajadora
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Código Postal
                </label>
                <Input
                  className='w-full'
                  type='text'
                  placeholder='28001'
                  value={editingWorker.postal_code ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      postal_code: e.target.value,
                    });
                  }}
                />
                <p className='text-xs text-gray-600 mt-1'>
                  Código postal de la dirección
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-900 mb-1'>
                  Ciudad
                </label>
                <Input
                  className='w-full'
                  type='text'
                  placeholder='Madrid'
                  value={editingWorker.city ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEditingWorker({
                      ...editingWorker,
                      city: e.target.value,
                    });
                  }}
                />
                <p className='text-xs text-gray-600 mt-1'>
                  Ciudad de residencia
                </p>
              </div>
            </div>
            <div className='flex justify-end space-x-3 pt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingWorker({});
                  setError(null);
                  setSavingWorker(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                className='bg-indigo-600 hover:bg-indigo-700 text-white'
                onClick={() => {
                  if (
                    !isValidField(editingWorker.email) ||
                    !isValidField(editingWorker.name)
                  ) {
                    setError(
                      'Email y nombre son obligatorios para generar acceso.'
                    );
                    return;
                  }
                  const pwd = workerAccessPassword;
                  if (pwd.trim().length < 6) {
                    setError('La contraseña debe tener al menos 6 caracteres.');
                    return;
                  }

                  (async () => {
                    try {
                      const resp = await fetch('/api/workers/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: editingWorker.email,
                          name: editingWorker.name,
                          password: pwd,
                        }),
                      });
                      const json = (await resp.json()) as {
                        success: boolean;
                        message: string;
                      };
                      if (json.success) {
                        setSuccessMessage('Acceso de trabajadora configurado.');
                      } else {
                        setError(json.message ?? 'Error generando acceso');
                      }
                    } catch {
                      setError('Error generando acceso');
                    }
                  })();
                }}
              >
                🔐 Generar/Resetear Acceso
              </Button>
              <Button
                className='bg-blue-600 hover:bg-blue-700 text-white'
                onClick={() => {
                  handleSaveWorker().catch(() => {
                    // Error saving worker
                  });
                }}
                disabled={
                  !isValidField(editingWorker.name) ||
                  !isValidField(editingWorker.email) ||
                  !isValidField(editingWorker.dni)
                }
              >
                Actualizar Trabajadora
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Worker Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title='Detalles de la Trabajadora'
          size='md'
        >
          <div className='space-y-6'>
            <div className='flex flex-col items-center mb-2'>
              <div className='w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg mb-2'>
                <span className='text-3xl font-bold text-white'>
                  {selectedWorker && isValidField(selectedWorker.name)
                    ? selectedWorker.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                    : '?'}
                </span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900'>
                {selectedWorker?.name ?? 'N/A'}
              </h3>
              {selectedWorker?.is_active !== undefined &&
                selectedWorker.is_active !== null && (
                  <span
                    className={`mt-1 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedWorker.is_active === true
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {selectedWorker.is_active === true ? 'Activa' : 'Inactiva'}
                  </span>
                )}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='flex items-center space-x-2'>
                <span className='text-gray-400 text-lg'>📧</span>
                <span className='text-sm text-gray-700'>
                  {selectedWorker?.email}
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                <span className='text-gray-400 text-lg'>📱</span>
                <span className='text-sm text-gray-700'>
                  {selectedWorker?.phone}
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                <span className='text-gray-400 text-lg'>🆔</span>
                <span className='text-sm text-gray-700'>
                  DNI: {selectedWorker?.dni?.replace(/.(?=.{3}$)/g, '*')}
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                <span className='text-gray-400 text-lg'>💼</span>
                <span className='text-sm text-gray-700'>
                  {selectedWorker?.worker_type}
                </span>
              </div>
            </div>
            <div className='flex justify-center pt-4'>
              <Button
                variant='outline'
                onClick={() => setIsViewModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteModalClose}
          title='Confirmar Eliminación'
          size='md'
        >
          <div className='space-y-6'>
            {/* Mensaje de advertencia */}
            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <div className='flex items-center mb-3'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-red-400'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <h3 className='ml-3 text-sm font-medium text-red-800'>
                  ⚠️ Acción Irreversible
                </h3>
              </div>
              <p className='text-sm text-red-700'>
                Esta acción no se puede deshacer. La trabajadora será eliminada
                permanentemente del sistema.
              </p>
            </div>

            {/* Información de la trabajadora */}
            {workerToDelete && (
              <div className='bg-gray-50 rounded-lg p-4'>
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg'>
                    <span className='text-lg font-bold text-white'>
                      {workerToDelete.name?.charAt(0) ?? '?'}
                      {workerToDelete.surname?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <div>
                    <h4 className='text-lg font-semibold text-gray-900'>
                      {workerToDelete.name} {workerToDelete.surname}
                    </h4>
                    <p className='text-sm text-gray-600'>
                      {workerToDelete.email}
                    </p>
                    <p className='text-xs text-gray-500'>
                      DNI: {workerToDelete.dni?.replace(/.(?=.{3}$)/g, '*')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pregunta de confirmación */}
            <div className='text-center'>
              <p className='text-gray-900 font-medium mb-2'>
                ¿Estás seguro de que deseas eliminar a esta trabajadora?
              </p>
              <p className='text-sm text-gray-600'>
                Esta acción eliminará permanentemente todos los datos asociados.
              </p>
            </div>

            {/* Botones de acción */}
            <div className='flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3'>
              <Button
                variant='outline'
                onClick={handleDeleteModalClose}
                disabled={deletingWorker}
                className='w-full sm:w-auto'
              >
                Cancelar
              </Button>
              <Button
                variant='danger'
                onClick={() => {
                  handleDeleteWorker().catch(() => {
                    // Error al eliminar trabajadora - en producción usar sistema de logging apropiado
                    // console.error('Error al eliminar trabajadora:', deleteError);
                  });
                }}
                disabled={deletingWorker}
                className='w-full sm:w-auto'
              >
                {deletingWorker ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  '🗑️ Eliminar Definitivamente'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>

      {/* Footer */}
      <footer className='border-t border-gray-200 bg-white py-8 mt-auto mb-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <p className='text-sm text-gray-600 mb-2 font-medium'>
              © 2025 SAD - Sistema de Gestión de Servicios Asistenciales
              Domiciliarios
            </p>
            <p className='text-xs text-gray-500'>
              Hecho con mucho ❤️ por{' '}
              <span className='font-bold text-gray-700'>Gusi</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Navegación Móvil */}
      <Navigation variant='mobile' />
    </ProtectedRoute>
  );
}
