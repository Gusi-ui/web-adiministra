'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/database';

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  users: {
    name: string | null;
    surname: string | null;
  } | null;
}

const NoteCard = ({
  assignment,
  onEdit,
}: {
  assignment: AssignmentRow;
  onEdit: (assignment: AssignmentRow) => void;
}): React.JSX.Element => {
  const userName = assignment.users?.name ?? '';
  const userSurname = assignment.users?.surname ?? '';
  const fullName = `${userName} ${userSurname}`.trim();
  const userLabel = fullName !== '' ? fullName : 'Usuario';

  const formatDate = (dateString: string | null): string => {
    if (dateString === null || dateString === '') {
      return 'Sin fecha';
    }
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='p-4 border-b border-gray-200'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='text-lg font-semibold text-gray-900'>{userLabel}</h3>
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
            {assignment.assignment_type}
          </span>
        </div>
        <div className='text-sm text-gray-600 space-y-1'>
          <p>📅 Desde: {formatDate(assignment.start_date)}</p>
          {assignment.end_date !== null && (
            <p>📅 Hasta: {formatDate(assignment.end_date)}</p>
          )}
        </div>
      </div>

      <div className='p-4'>
        {assignment.notes !== null && assignment.notes !== '' ? (
          <div className='bg-gray-50 rounded-lg p-3'>
            <p className='text-sm text-gray-700 whitespace-pre-wrap'>
              {assignment.notes}
            </p>
          </div>
        ) : (
          <div className='text-center py-4'>
            <p className='text-sm text-gray-500'>Sin notas</p>
          </div>
        )}
      </div>

      <div className='p-4 border-t border-gray-200 bg-gray-50'>
        <Button
          onClick={(): void => {
            onEdit(assignment);
          }}
          size='sm'
          className='w-full'
        >
          ✏️ Editar Nota
        </Button>
      </div>
    </div>
  );
};

const NoteEditor = ({
  assignment,
  onSave,
  onCancel,
}: {
  assignment: AssignmentRow | null;
  onSave: (assignmentId: string, content: string) => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element => {
  const [content, setContent] = useState<string>('');

  React.useEffect(() => {
    if (assignment) {
      setContent(assignment.notes ?? '');
    }
  }, [assignment]);

  const handleSave = async (): Promise<void> => {
    if (assignment === null) return;
    await onSave(assignment.id, content);
  };

  if (assignment === null) {
    return <div />;
  }

  const userName = assignment.users?.name ?? '';
  const userSurname = assignment.users?.surname ?? '';
  const fullName = `${userName} ${userSurname}`.trim();
  const userLabel = fullName !== '' ? fullName : 'Usuario';

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='p-4 border-b border-gray-200'>
        <h3 className='text-lg font-semibold text-gray-900'>
          Editar Nota - {userLabel}
        </h3>
        <p className='text-sm text-gray-600'>Notas para esta asignación</p>
      </div>

      <div className='p-4'>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder='Escribe las notas para esta asignación...'
          className='w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
      </div>

      <div className='p-4 border-t border-gray-200 bg-gray-50 flex space-x-3'>
        <Button
          onClick={(): void => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            handleSave();
          }}
          disabled={content.trim() === ''}
          size='sm'
          className='flex-1'
        >
          💾 Guardar
        </Button>
        <Button
          onClick={onCancel}
          variant='outline'
          size='sm'
          className='flex-1'
        >
          ❌ Cancelar
        </Button>
      </div>
    </div>
  );
};

export default function NotesPage(): React.JSX.Element {
  const { user } = useAuth();
  const currentUser = user;
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentRow | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (currentUser?.email === undefined || currentUser?.email === '') {
        setAssignments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar trabajadora por email
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .ilike('email', currentUser?.email)
          .maybeSingle();

        if (workerError !== null || workerData === null) {
          setAssignments([]);
          setLoading(false);
          return;
        }

        const workerId = (workerData as { id: string }).id;

        // Obtener todas las asignaciones activas de la trabajadora con notas
        const { data: assignmentRows, error: assignmentErr } = await supabase
          .from('assignments')
          .select(
            `
            id,
            assignment_type,
            schedule,
            start_date,
            end_date,
            notes,
            users!inner(name, surname)
          `
          )
          .eq('worker_id', workerId)
          .eq('status', 'active');

        if (assignmentErr === null && assignmentRows !== null) {
          const filtered = assignmentRows.filter(a => {
            const assignmentType =
              typeof a.assignment_type === 'string' ? a.assignment_type : '';
            const t = assignmentType.toLowerCase();
            return t === 'laborables' || t === 'flexible' || t === 'festivos';
          });
          setAssignments(filtered as unknown as AssignmentRow[]);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [currentUser?.email]);

  const handleSaveNote = async (
    assignmentId: string,
    content: string
  ): Promise<void> => {
    try {
      // Actualizar la nota en la asignación
      const { error } = await supabase
        .from('assignments')
        .update({
          notes: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Actualizar estado local
      setAssignments(prev =>
        prev.map(assignment => {
          if (assignment.id === assignmentId) {
            return {
              ...assignment,
              notes: content,
            };
          }
          return assignment;
        })
      );

      setEditingAssignment(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving note:', error);
      // eslint-disable-next-line no-alert
      alert('Error al guardar la nota. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className='min-h-screen bg-gray-50 p-4 sm:p-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='mb-6'>
              <Link href='/worker-dashboard'>
                <Button variant='outline' size='sm'>
                  ← Volver al Dashboard
                </Button>
              </Link>
            </div>

            <div className='text-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
              <p className='text-gray-600'>Cargando notas...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gray-50 p-4 sm:p-6'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='mb-6'>
            <Link href='/worker-dashboard'>
              <Button variant='outline' size='sm'>
                ← Volver al Dashboard
              </Button>
            </Link>
          </div>

          <div className='mb-8'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-2'>
              📝 Notas de Asignaciones
            </h1>
            <p className='text-gray-600 text-sm sm:text-base'>
              Gestiona las notas de tus asignaciones activas
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className='text-center py-12'>
              <div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
                <span className='text-2xl'>📝</span>
              </div>
              <p className='text-gray-600 mb-2 text-sm sm:text-base'>
                No tienes asignaciones activas
              </p>
              <p className='text-xs sm:text-sm text-gray-500'>
                Las notas aparecerán aquí cuando tengas asignaciones
              </p>
            </div>
          ) : (
            <div className='space-y-6'>
              {editingAssignment !== null ? (
                <NoteEditor
                  assignment={editingAssignment}
                  onSave={handleSaveNote}
                  onCancel={() => setEditingAssignment(null)}
                />
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
                  {assignments.map(assignment => (
                    <NoteCard
                      key={assignment.id}
                      assignment={assignment}
                      onEdit={setEditingAssignment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
