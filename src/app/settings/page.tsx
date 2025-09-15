'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole='admin'>
      <Layout>
        <div className='p-4 lg:p-6'>
          <div className='max-w-7xl mx-auto'>
            {/* Header */}
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                ⚙️ Configuración del Sistema
              </h1>
              <p className='text-gray-600'>
                Administra la configuración del sistema SAD LAS
              </p>
            </div>

            {/* Settings Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* General Settings */}
              <Card className='p-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  🔧 Configuración General
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Nombre de la Organización
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      defaultValue='SAD LAS'
                      type='text'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Zona Horaria
                    </label>
                    <select className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'>
                      <option value='Europe/Madrid'>Europe/Madrid</option>
                      <option value='UTC'>UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Idioma
                    </label>
                    <select className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'>
                      <option value='es'>Español</option>
                      <option value='en'>English</option>
                    </select>
                  </div>
                  <Button className='bg-blue-600 hover:bg-blue-700 text-white'>
                    Guardar Cambios
                  </Button>
                </div>
              </Card>

              {/* User Settings */}
              <Card className='p-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  👤 Configuración de Usuario
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Nombre Completo
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      defaultValue='Administrador'
                      type='text'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Email
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      defaultValue='admin@sadlas.com'
                      type='email'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Notificaciones
                    </label>
                    <div className='space-y-2'>
                      <label className='flex items-center'>
                        <input
                          className='mr-2'
                          type='checkbox'
                          defaultChecked
                        />
                        <span className='text-sm text-gray-700'>
                          Notificaciones por email
                        </span>
                      </label>
                      <label className='flex items-center'>
                        <input
                          className='mr-2'
                          type='checkbox'
                          defaultChecked
                        />
                        <span className='text-sm text-gray-700'>
                          Notificaciones push
                        </span>
                      </label>
                    </div>
                  </div>
                  <Button className='bg-blue-600 hover:bg-blue-700 text-white'>
                    Actualizar Perfil
                  </Button>
                </div>
              </Card>

              {/* Security Settings */}
              <Card className='p-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  🔒 Configuración de Seguridad
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Contraseña Actual
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      type='password'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Nueva Contraseña
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      type='password'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      type='password'
                    />
                  </div>
                  <Button className='bg-blue-600 hover:bg-blue-700 text-white'>
                    Cambiar Contraseña
                  </Button>
                </div>
              </Card>

              {/* System Info */}
              <Card className='p-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  ℹ️ Información del Sistema
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Versión</span>
                    <span className='text-sm font-medium text-gray-900'>
                      1.0.0
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>
                      Última Actualización
                    </span>
                    <span className='text-sm font-medium text-gray-900'>
                      Hoy
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Estado</span>
                    <span className='text-sm font-medium text-green-600'>
                      Operativo
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Base de Datos</span>
                    <span className='text-sm font-medium text-green-600'>
                      Conectada
                    </span>
                  </div>
                </div>
                <div className='mt-4 pt-4 border-t border-gray-200'>
                  <Button variant='outline' className='w-full'>
                    Verificar Actualizaciones
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
