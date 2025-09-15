'use client';

import React from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onLogoutHref?: string;
}

const AppHeader = ({
  title,
  subtitle,
  onLogoutHref = '/auth',
}: AppHeaderProps): React.JSX.Element => (
  <header className='bg-white shadow-sm border-b'>
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold text-sm'>SAD</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-lg font-semibold text-gray-900'>{title}</span>
            {subtitle !== undefined && subtitle.trim() !== '' && (
              <span className='text-xs text-gray-500'>{subtitle}</span>
            )}
          </div>
        </div>
        <div className='flex items-center space-x-4'>
          <Link href={onLogoutHref} className='flex items-center'>
            <Button
              size='sm'
              variant='outline'
              className='flex items-center space-x-2'
            >
              <span>🔒</span>
              <span>Cerrar Sesión</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  </header>
);

export default AppHeader;
