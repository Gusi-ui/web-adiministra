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
import { supabase } from '@/lib/database';

interface Holiday {
  id: string;
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
  created_at: string;
  updated_at: string;
}

interface CreateHolidayData {
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
}

export default function HolidaysPage(): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState<CreateHolidayData>({
    day: 1,
    month: 1,
    year: new Date().getFullYear(),
    name: '',
    type: 'national',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Cargar festivos
  const loadHolidays = async (year: number): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true })
        .order('day', { ascending: true });

      if (error !== null && error !== undefined) {
        setToastMessage({ message: 'Error cargando festivos', type: 'error' });
        return;
      }

      setHolidays((data as Holiday[]) ?? []);
    } catch (err: unknown) {
      setToastMessage({
        message: `Error inesperado al cargar festivos: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo festivo
  const createHoliday = async (): Promise<void> => {
    try {
      const { error } = await supabase.from('holidays').insert([newHoliday]);

      if (error !== null && error !== undefined) {
        setToastMessage({ message: 'Error creando festivo', type: 'error' });
        return;
      }

      setNewHoliday({
        day: 1,
        month: 1,
        year: selectedYear,
        name: '',
        type: 'national',
      });
      setShowAddForm(false);
      setToastMessage({
        message: 'Festivo creado exitosamente',
        type: 'success',
      });
      await loadHolidays(selectedYear);
    } catch (err: unknown) {
      setToastMessage({
        message: `Error inesperado al crear festivo: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error',
      });
    }
  };

  // Actualizar festivo
  const updateHoliday = async (): Promise<void> => {
    if (editingHoliday === null) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .update({
          day: editingHoliday.day,
          month: editingHoliday.month,
          year: editingHoliday.year,
          name: editingHoliday.name,
          type: editingHoliday.type,
        })
        .eq('id', editingHoliday.id);

      if (error !== null && error !== undefined) {
        setToastMessage({
          message: 'Error actualizando festivo',
          type: 'error',
        });
        return;
      }

      setEditingHoliday(null);
      setToastMessage({
        message: 'Festivo actualizado exitosamente',
        type: 'success',
      });
      await loadHolidays(selectedYear);
    } catch (err: unknown) {
      setToastMessage({
        message: `Error inesperado al actualizar festivo: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error',
      });
    }
  };

  // Eliminar festivo
  const deleteHoliday = async (): Promise<void> => {
    if (holidayToDelete === null) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayToDelete);

      if (error !== null && error !== undefined) {
        setToastMessage({ message: 'Error eliminando festivo', type: 'error' });
        return;
      }

      setHolidayToDelete(null);
      setShowDeleteModal(false);
      setToastMessage({
        message: 'Festivo eliminado exitosamente',
        type: 'success',
      });
      await loadHolidays(selectedYear);
    } catch (err: unknown) {
      setToastMessage({
        message: `Error inesperado al eliminar festivo: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error',
      });
    }
  };

  // Cargar festivos al cambiar el año
  useEffect(() => {
    loadHolidays(selectedYear).catch(() => {
      // Error loading month holidays
      setToastMessage({ type: 'error', message: 'Error cargando festivos' });
    });
    return undefined; // ensure effect returns void
  }, [selectedYear]);

  // Limpiar mensaje de toast después de 5 segundos
  useEffect(() => {
    if (toastMessage !== null) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined; // ensure effect returns void on all paths
  }, [toastMessage]);

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'national':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'regional':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'local':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'national':
        return 'Nacional';
      case 'regional':
        return 'Regional';
      case 'local':
        return 'Local';
      default:
        return type;
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return months[month - 1] ?? '';
  };

  const groupedHolidays = holidays.reduce<Record<number, Holiday[]>>(
    (acc, holiday) => {
      const month = holiday.month;
      acc[month] ??= [];
      acc[month].push(holiday);
      return acc;
    },
    {}
  );

  return (
    <ProtectedRoute requiredRole='admin'>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
        {/* Header - Mobile First */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6'>
            {/* Mobile Header */}
            <div className='md:hidden'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h1 className='text-xl font-bold text-gray-900'>
                    🎯 Festivos
                  </h1>
                  <p className='text-sm text-gray-600 mt-1'>
                    Gestión de festivos
                  </p>
                </div>
                <Link
                  href='/dashboard'
                  className='inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm'
                >
                  <svg
                    className='w-3 h-3 mr-1'
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
                  Volver
                </Link>
              </div>
            </div>

            {/* Tablet/Desktop Header */}
            <div className='hidden md:flex items-center justify-between'>
              <div>
                <h1 className='text-2xl lg:text-3xl font-bold text-gray-900'>
                  🎯 Administración de Festivos
                </h1>
                <p className='mt-2 text-gray-600'>
                  Gestiona los festivos oficiales de Mataró
                </p>
              </div>
              <div className='flex items-center space-x-4'>
                <Link
                  href='/dashboard'
                  className='inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm'
                >
                  <svg
                    className='w-4 h-4 mr-2'
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
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8'>
          {/* Controls Section - Mobile First */}
          <div className='mb-6 md:mb-8'>
            {/* Mobile Controls */}
            <div className='md:hidden space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <label className='text-sm font-semibold text-gray-800 bg-white px-3 py-2 rounded-lg border-2 border-gray-300 shadow-sm'>
                    Año:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className='bg-white border-2 border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm'
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() + i
                    ).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <span className='text-sm font-semibold text-gray-800 bg-white px-3 py-2 rounded-lg border-2 border-gray-300 shadow-sm'>
                  {holidays.length} festivos
                </span>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                className='w-full bg-green-600 hover:bg-green-700 text-sm font-semibold'
              >
                ➕ Añadir Festivo
              </Button>
            </div>

            {/* Tablet/Desktop Controls */}
            <div className='hidden md:flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <label className='text-lg font-semibold text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm'>
                  Año:
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className='bg-white border-2 border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors'
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() + i
                  ).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className='text-gray-700 font-medium bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm'>
                  {holidays.length} festivos encontrados
                </span>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                className='bg-green-600 hover:bg-green-700'
              >
                ➕ Añadir Festivo
              </Button>
            </div>
          </div>

          {/* Toast Message */}
          {toastMessage !== null && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                toastMessage.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : toastMessage.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : toastMessage.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
              }`}
            >
              {toastMessage.message}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className='text-center py-8 md:py-12'>
              <div className='animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto'></div>
              <p className='mt-3 md:mt-4 text-sm md:text-base font-medium text-gray-700'>
                Cargando festivos...
              </p>
            </div>
          )}

          {/* Lista de festivos por mes */}
          {!loading && (
            <div className='space-y-6 md:space-y-8'>
              {Object.keys(groupedHolidays).length === 0 ? (
                <Card className='p-6 md:p-8 text-center'>
                  <div className='text-4xl md:text-6xl mb-4'>📅</div>
                  <h3 className='text-lg md:text-xl font-semibold text-gray-900 mb-2'>
                    No hay festivos para {selectedYear}
                  </h3>
                  <p className='text-sm md:text-base text-gray-600 mb-4'>
                    No se han encontrado festivos registrados para este año.
                  </p>
                </Card>
              ) : (
                Object.entries(groupedHolidays).map(
                  ([month, monthHolidays]) => (
                    <Card key={month} className='p-4 md:p-6'>
                      <h3 className='text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4'>
                        📅 {getMonthName(Number(month))}
                      </h3>
                      <div className='space-y-3 md:space-y-4'>
                        {monthHolidays.map(holiday => (
                          <div
                            key={holiday.id}
                            className='flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 md:space-y-0'
                          >
                            <div className='flex items-center space-x-3 md:space-x-4'>
                              <div className='text-xl md:text-2xl font-bold text-gray-900 min-w-[2.5rem] md:min-w-[3rem]'>
                                {holiday.day}
                              </div>
                              <div className='flex-1'>
                                <h4 className='font-medium text-gray-900 text-sm md:text-base'>
                                  {holiday.name}
                                </h4>
                                <p className='text-xs md:text-sm text-gray-500'>
                                  {holiday.day} de {getMonthName(holiday.month)}{' '}
                                  de {holiday.year}
                                </p>
                              </div>
                              <span
                                className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(
                                  holiday.type
                                )}`}
                              >
                                {getTypeLabel(holiday.type)}
                              </span>
                            </div>
                            <div className='flex space-x-2 md:ml-4'>
                              <Button
                                onClick={() => setEditingHoliday(holiday)}
                                className='flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 px-3 md:px-3 py-2 md:py-1 text-sm md:text-sm font-semibold'
                              >
                                <span className='md:hidden'>
                                  <svg
                                    className='w-5 h-5 text-white'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                    />
                                  </svg>
                                </span>
                                <span className='hidden md:inline'>
                                  ✏️ Editar
                                </span>
                              </Button>
                              <Button
                                onClick={() => {
                                  setHolidayToDelete(holiday.id);
                                  setShowDeleteModal(true);
                                }}
                                className='flex-1 md:flex-none bg-red-600 hover:bg-red-700 px-3 md:px-3 py-2 md:py-1 text-sm md:text-sm font-semibold'
                              >
                                <span className='md:hidden'>
                                  <svg
                                    className='w-5 h-5 text-white'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                                    />
                                  </svg>
                                </span>
                                <span className='hidden md:inline'>
                                  🗑️ Eliminar
                                </span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                )
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showAddForm || editingHoliday !== null}
          onClose={() => {
            setShowAddForm(false);
            setEditingHoliday(null);
          }}
          title={editingHoliday !== null ? 'Editar Festivo' : 'Añadir Festivo'}
        >
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='holiday-name'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Nombre del Festivo:
              </label>
              <Input
                id='holiday-name'
                type='text'
                value={
                  editingHoliday !== null
                    ? editingHoliday.name
                    : newHoliday.name
                }
                onChange={e => {
                  if (editingHoliday !== null) {
                    setEditingHoliday({
                      ...editingHoliday,
                      name: e.target.value,
                    });
                  } else {
                    setNewHoliday({ ...newHoliday, name: e.target.value });
                  }
                }}
                placeholder='Ej: Día de la Constitución'
                className='w-full'
              />
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div>
                <label
                  htmlFor='holiday-day'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Día:
                </label>
                <Input
                  id='holiday-day'
                  type='number'
                  min='1'
                  max='31'
                  value={
                    editingHoliday !== null
                      ? editingHoliday.day
                      : newHoliday.day
                  }
                  onChange={e => {
                    if (editingHoliday !== null) {
                      setEditingHoliday({
                        ...editingHoliday,
                        day: Number(e.target.value),
                      });
                    } else {
                      setNewHoliday({
                        ...newHoliday,
                        day: Number(e.target.value),
                      });
                    }
                  }}
                  className='w-full'
                />
              </div>

              <div>
                <label
                  htmlFor='holiday-month'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Mes:
                </label>
                <select
                  id='holiday-month'
                  value={
                    editingHoliday !== null
                      ? editingHoliday.month
                      : newHoliday.month
                  }
                  onChange={e => {
                    if (editingHoliday !== null) {
                      setEditingHoliday({
                        ...editingHoliday,
                        month: Number(e.target.value),
                      });
                    } else {
                      setNewHoliday({
                        ...newHoliday,
                        month: Number(e.target.value),
                      });
                    }
                  }}
                  className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor='holiday-year'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Año:
                </label>
                <Input
                  id='holiday-year'
                  type='number'
                  value={
                    editingHoliday !== null
                      ? editingHoliday.year
                      : newHoliday.year
                  }
                  onChange={e => {
                    if (editingHoliday !== null) {
                      setEditingHoliday({
                        ...editingHoliday,
                        year: Number(e.target.value),
                      });
                    } else {
                      setNewHoliday({
                        ...newHoliday,
                        year: Number(e.target.value),
                      });
                    }
                  }}
                  className='w-full'
                />
              </div>
            </div>

            <div>
              <label
                htmlFor='holiday-type'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Tipo:
              </label>
              <select
                id='holiday-type'
                value={
                  editingHoliday !== null
                    ? editingHoliday.type
                    : newHoliday.type
                }
                onChange={e => {
                  if (editingHoliday !== null) {
                    setEditingHoliday({
                      ...editingHoliday,
                      type: e.target.value as 'national' | 'regional' | 'local',
                    });
                  } else {
                    setNewHoliday({
                      ...newHoliday,
                      type: e.target.value as 'national' | 'regional' | 'local',
                    });
                  }
                }}
                className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value='national'>Nacional</option>
                <option value='regional'>Regional</option>
                <option value='local'>Local</option>
              </select>
            </div>

            <div className='flex justify-end space-x-3 pt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowAddForm(false);
                  setEditingHoliday(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingHoliday !== null) {
                    updateHoliday().catch(() => {
                      // Error updating holiday
                      setToastMessage({
                        type: 'error',
                        message: 'Error actualizando festivo',
                      });
                    });
                  } else {
                    createHoliday().catch(() => {
                      // Error creating holiday
                      setToastMessage({
                        type: 'error',
                        message: 'Error creando festivo',
                      });
                    });
                  }
                }}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                {editingHoliday !== null ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title='Confirmar Eliminación'
        >
          <div className='space-y-4'>
            <p className='text-gray-600'>
              ¿Estás seguro de que quieres eliminar este festivo? Esta acción no
              se puede deshacer.
            </p>
            <div className='flex justify-end space-x-3 pt-4'>
              <Button
                variant='outline'
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  deleteHoliday().catch(() => {
                    // Error deleting holiday
                    setToastMessage({
                      type: 'error',
                      message: 'Error eliminando festivo',
                    });
                  });
                }}
                variant='danger'
                className='bg-red-600 hover:bg-red-700 text-white'
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Toast Message Fixed */}
        {toastMessage && (
          <div
            className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white ${
              toastMessage.type === 'success'
                ? 'bg-green-500'
                : toastMessage.type === 'error'
                  ? 'bg-red-500'
                  : toastMessage.type === 'info'
                    ? 'bg-blue-500'
                    : 'bg-yellow-500'
            }`}
            role='alert'
          >
            {toastMessage.message}
          </div>
        )}

        {/* Footer - Mobile First */}
        <footer className='border-t border-gray-200 bg-white py-6 md:py-8 mt-auto mb-16 md:mb-0'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <p className='text-xs md:text-sm text-gray-600 mb-1 md:mb-2 font-medium'>
                © 2025 SAD - Sistema de Gestión
              </p>
              <p className='text-xs text-gray-500'>
                Administración de Festivos - Mataró
              </p>
            </div>
          </div>
        </footer>

        {/* Navegación móvil fija */}
        <Navigation variant='mobile' />
      </div>
    </ProtectedRoute>
  );
}
