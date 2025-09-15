'use client';

import React, { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getUserDisplayName = (): string => {
    if (!user) return 'Usuario';
    return user.email?.split('@')[0] ?? 'Usuario';
  };

  return (
    <>
      <header className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            {/* Logo */}
            <div className='flex items-center'>
              <Link className='flex items-center space-x-2' href='/dashboard'>
                <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
                  <span className='text-white font-bold text-sm'>SAD</span>
                </div>
                <span className='text-xl font-bold text-gray-900 hidden sm:block'>
                  SAD
                </span>
              </Link>
            </div>

            {/* User menu */}
            <div className='flex items-center space-x-2 sm:space-x-4'>
              {user && (
                <span className='text-sm text-gray-700 hidden md:block'>
                  Hola, {getUserDisplayName()}
                </span>
              )}
              <Button
                size='sm'
                variant='ghost'
                className='hidden sm:flex'
                onClick={() => setIsProfileModalOpen(true)}
              >
                <span className='hidden sm:inline'>👤 Mi Perfil</span>
                <span className='sm:hidden'>👤</span>
              </Button>
              <Button
                onClick={() => {
                  void handleSignOut();
                }}
                size='sm'
                variant='outline'
              >
                <span className='hidden sm:inline'>🚪 Cerrar Sesión</span>
                <span className='sm:hidden'>🚪</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title='Mi Perfil'
        size='md'
      >
        <div className='space-y-4'>
          <div className='flex items-center space-x-4'>
            <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center'>
              <span className='text-2xl font-bold text-blue-600'>A</span>
            </div>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                {getUserDisplayName()}
              </h3>
              <p className='text-gray-500'>{user?.email}</p>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nombre Completo
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                defaultValue={getUserDisplayName()}
                type='text'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                defaultValue={user?.email ?? ''}
                type='email'
                disabled
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Rol
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50'
                defaultValue='Administrador'
                type='text'
                disabled
              />
            </div>
          </div>

          <div className='flex justify-end space-x-3 pt-4'>
            <Button
              variant='outline'
              onClick={() => setIsProfileModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button className='bg-blue-600 hover:bg-blue-700 text-white'>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;
