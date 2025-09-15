'use client';

import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useNotifications } from '@/hooks/useNotifications';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/worker-dashboard', icon: '🏠' },
  { label: 'Rutas', href: '/worker-dashboard/route', icon: '🚗' },
  { label: 'Planilla', href: '/worker-dashboard/schedule', icon: '📋' },
  { label: 'Balance', href: '/worker-dashboard/balances', icon: '⏱️' },
];

// Componente separado para manejar las notificaciones
function NotificationBadge({ href }: { href: string }) {
  const { unreadCount } = useNotifications({ autoRefresh: false });

  if (href === '/worker-dashboard' && unreadCount > 0) {
    return (
      <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-sm border-2 border-white'>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    );
  }
  return null;
}

export default function WorkerBottomNav(): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/worker-dashboard') return pathname === '/worker-dashboard';
    return pathname?.startsWith(href) ?? false;
  };

  const getItemStyles = (href: string, active: boolean) => {
    if (href === '/worker-dashboard/schedule') {
      // Planilla - Verde para organización y eficiencia
      return active
        ? 'text-green-600 bg-green-50 shadow-md'
        : 'text-gray-600 hover:text-green-600 hover:bg-green-50';
    }
    // Resto de elementos - Azul por defecto
    return active
      ? 'text-blue-600 bg-blue-50 shadow-md'
      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50';
  };

  return (
    <>
      {/* Mobile: solo iconos, estilo como en panel administrativo */}
      <nav
        className='fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-300 shadow-2xl z-50 h-20 sm:hidden'
        role='navigation'
        aria-label='Navegación principal trabajadora'
      >
        <div className='flex justify-around items-center h-full px-2'>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 py-2 rounded-xl ${getItemStyles(
                  item.href,
                  active
                )}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className='text-3xl relative'>
                  {item.icon}
                  <NotificationBadge href={item.href} />
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Tablet: icono + etiqueta en columna, fijo inferior, ancho completo */}
      <nav
        className='hidden md:flex lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-300 shadow-2xl z-50 h-20'
        role='navigation'
        aria-label='Navegación principal trabajadora'
      >
        <div className='mx-auto flex w-full max-w-4xl items-center justify-around px-3'>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-16 w-20 flex-col items-center justify-center rounded-xl transition-all ${getItemStyles(
                  item.href,
                  active
                )
                  .replace('text-blue-600', 'text-blue-700')
                  .replace('bg-blue-50', 'bg-blue-50 border border-blue-200')}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className='text-2xl leading-none relative'>
                  {item.icon}
                  <NotificationBadge href={item.href} />
                </span>
                <span className='mt-1 text-[10px] font-medium tracking-wide'>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop/Tablet: icono + etiqueta, ancho completo, fijo inferior */}
      <nav
        className='hidden lg:flex fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-40 h-16'
        role='navigation'
        aria-label='Navegación principal trabajadora'
      >
        <div className='mx-auto flex w-full max-w-5xl items-center justify-between px-4'>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${getItemStyles(
                  item.href,
                  active
                )
                  .replace('text-blue-600', 'text-blue-700')
                  .replace('bg-blue-50', 'bg-blue-50 border border-blue-200')}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className='text-xl relative'>
                  {item.icon}
                  <NotificationBadge href={item.href} />
                </span>
                <span className='text-sm font-medium'>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
