'use client';

import React, { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  href: string;
  icon: string;
  name: string;
  badge?: number;
}

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation: SidebarItem[] = [
    { href: '/dashboard', icon: '📊', name: 'Dashboard' },
    { href: '/workers', icon: '👥', name: 'Trabajadores' },
    { href: '/users', icon: '👤', name: 'Clientes' },
    { href: '/assignments', icon: '📋', name: 'Asignaciones' },
    { href: '/planning', icon: '📅', name: 'Planificación' },
    { href: '/balances', icon: '⏰', name: 'Balances' },
    { href: '/settings', icon: '⚙️', name: 'Configuración' },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <button
          className='p-2 rounded-md bg-white shadow-lg hover:bg-gray-50 transition-colors'
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <div className='w-6 h-6 bg-blue-600 rounded flex items-center justify-center'>
            <span className='text-white font-bold text-xs'>SAD</span>
          </div>
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40'
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:transform-none ${
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className='flex flex-col h-full'>
          {/* Header */}
          <div className='p-6 border-b border-gray-200'>
            <div className='flex items-center space-x-2'>
              <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-sm'>SAD</span>
              </div>
              <span className='text-lg font-bold text-gray-900'>SAD</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className='flex-1 p-4 space-y-2'>
            {navigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  href={item.href}
                  key={item.name}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className='text-lg'>{item.icon}</span>
                  <span className='flex-1'>{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className='bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full'>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className='p-4 border-t border-gray-200'>
            <div className='text-xs text-gray-500 text-center'>
              Sistema SAD v1.0.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
