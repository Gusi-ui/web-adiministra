'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  variant?: 'mobile' | 'tablet' | 'desktop';
}

export default function Navigation({ variant = 'mobile' }: NavigationProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: '/workers',
      icon: '👷‍♀️',
      label: 'Trabajadoras',
      mobileIcon: '👷‍♀️',
    },
    {
      href: '/users',
      icon: '👤',
      label: 'Usuarios',
      mobileIcon: '👤',
    },
    {
      href: '/assignments',
      icon: '📋',
      label: 'Asignaciones',
      mobileIcon: '📋',
    },
    {
      href: '/planning',
      icon: '📅',
      label: 'Planning',
      mobileIcon: '📅',
    },
    {
      href: '/balances',
      icon: '⏰',
      label: 'Balance de Horas',
      mobileIcon: '⏰',
    },
  ];

  const isActive = (href: string): boolean => pathname === href;

  if (variant === 'mobile') {
    return (
      <nav className='fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-300 shadow-2xl z-50 h-20'>
        <div className='flex justify-around items-center h-full px-2'>
          {navigationItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 py-2 ${
                isActive(item.href)
                  ? 'text-blue-600 bg-blue-50 rounded-xl shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl'
              }`}
            >
              <span className='text-3xl mb-1'>{item.mobileIcon}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  if (variant === 'tablet') {
    return (
      <nav className='hidden md:block lg:hidden bg-white border-b-2 border-blue-300 shadow-lg'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6'>
          <div className='flex justify-center items-center h-14 space-x-6'>
            {navigationItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 min-w-[80px] ${
                  isActive(item.href)
                    ? 'text-blue-600 bg-blue-50 border-2 border-blue-200 shadow-md'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-2 border-transparent'
                }`}
              >
                <span className='text-2xl mb-1'>{item.mobileIcon}</span>
                <span className='text-xs font-medium'>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Desktop navigation
  return (
    <nav className='hidden lg:block bg-white border-b border-gray-200 shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-center items-center h-16 space-x-8'>
          {navigationItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? 'text-blue-600 bg-blue-50 border border-blue-200'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className='text-lg'>{item.icon}</span>
              <span className='font-medium'>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
