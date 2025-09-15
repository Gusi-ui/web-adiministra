'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/database';

export default function TestSupabase() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test básico de conexión
        const { error } = await supabase
          .from('auth_users')
          .select('count')
          .limit(1);

        if (error) {
          setStatus('error');
          setMessage(`Error de conexión: ${error.message}`);
        } else {
          setStatus('success');
          setMessage('✅ Conexión a Supabase exitosa!');
        }
      } catch (err) {
        setStatus('error');
        setMessage(
          `Error inesperado: ${
            err instanceof Error ? err.message : 'Error desconocido'
          }`
        );
      }
    };

    void testConnection();
  }, []);

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-md max-w-md w-full'>
        <h1 className='text-2xl font-bold text-gray-900 mb-4'>
          🔧 Test de Conexión Supabase
        </h1>

        <div className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <div
              className={`w-3 h-3 rounded-full ${
                status === 'loading'
                  ? 'bg-yellow-400'
                  : status === 'success'
                    ? 'bg-green-400'
                    : 'bg-red-400'
              }`}
            />
            <span className='text-sm font-medium'>
              {status === 'loading'
                ? 'Probando conexión...'
                : status === 'success'
                  ? 'Conexión exitosa'
                  : 'Error de conexión'}
            </span>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                status === 'success'
                  ? 'bg-green-50 text-green-700'
                  : status === 'error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              {message}
            </div>
          )}

          <div className='text-xs text-gray-500 space-y-1'>
            <p>
              <strong>URL:</strong> {process.env['NEXT_PUBLIC_SUPABASE_URL']}
            </p>
            <p>
              <strong>Clave anónima:</strong>{' '}
              {process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']?.substring(0, 20)}
              ...
            </p>
          </div>
        </div>

        <div className='mt-6 pt-4 border-t border-gray-200'>
          <Link
            className='text-blue-600 hover:text-blue-800 text-sm font-medium'
            href='/'
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
