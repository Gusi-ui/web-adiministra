'use client';

import React, { useEffect, useState } from 'react';

import type { Worker } from '@/lib/database';
import { getAllWorkers, getWorkersStats } from '@/lib/workers-query';
import { securityLogger } from '@/utils/security-config';

interface WorkersStats {
  total: number;
  active: number;
  inactive: number;
  cuidadoras: number;
  auxiliares: number;
  enfermeras: number;
}

export const WorkersList: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<WorkersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workersData, statsData] = await Promise.all([
          getAllWorkers(),
          getWorkersStats(),
        ]);

        setWorkers(workersData);
        setStats(statsData);
      } catch (err) {
        setError('Error al cargar los workers');
        securityLogger.error('Error fetching workers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch(fetchError => {
      securityLogger.error('Error in fetchData:', fetchError);
    });
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-lg'>Cargando workers...</div>
      </div>
    );
  }

  if (error !== null && error !== undefined && error !== '') {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-red-600 text-lg'>{error}</div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Estadísticas */}
      {stats !== null && stats !== undefined && (
        <div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
          <div className='bg-blue-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-blue-600'>
              {stats.total}
            </div>
            <div className='text-sm text-gray-600'>Total</div>
          </div>
          <div className='bg-green-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-green-600'>
              {stats.active}
            </div>
            <div className='text-sm text-gray-600'>Activos</div>
          </div>
          <div className='bg-yellow-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-yellow-600'>
              {stats.cuidadoras}
            </div>
            <div className='text-sm text-gray-600'>Cuidadoras</div>
          </div>
          <div className='bg-purple-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-purple-600'>
              {stats.auxiliares}
            </div>
            <div className='text-sm text-gray-600'>Auxiliares</div>
          </div>
          <div className='bg-red-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-red-600'>
              {stats.enfermeras}
            </div>
            <div className='text-sm text-gray-600'>Enfermeras</div>
          </div>
          <div className='bg-gray-50 p-4 rounded-lg'>
            <div className='text-2xl font-bold text-gray-600'>
              {stats.inactive}
            </div>
            <div className='text-sm text-gray-600'>Inactivos</div>
          </div>
        </div>
      )}

      {/* Lista de Workers */}
      <div className='bg-white rounded-lg shadow'>
        <div className='px-6 py-4 border-b border-gray-200'>
          <h2 className='text-xl font-semibold text-gray-900'>
            Workers ({workers.length})
          </h2>
        </div>

        {workers.length === 0 ? (
          <div className='p-8 text-center text-gray-500'>
            No hay workers registrados
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Nombre
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Email
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Teléfono
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Tipo
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Estado
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {workers.map(worker => (
                  <tr key={worker.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-10 w-10'>
                          <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                            <span className='text-sm font-medium text-blue-600'>
                              {worker.name.charAt(0)}
                              {worker.surname?.charAt(0) ?? ''}
                            </span>
                          </div>
                        </div>
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900'>
                            {worker.name} {worker.surname}
                          </div>
                          <div className='text-sm text-gray-500'>
                            DNI: {worker.dni?.replace(/.(?=.{3}$)/g, '*')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {worker.email}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {worker.phone}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          worker.worker_type === 'cuidadora'
                            ? 'bg-green-100 text-green-800'
                            : worker.worker_type === 'auxiliar'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {worker.worker_type}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          worker.is_active === true
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {worker.is_active === true ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {worker.created_at !== null &&
                      worker.created_at !== undefined
                        ? new Date(worker.created_at).toLocaleDateString(
                            'es-ES'
                          )
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
