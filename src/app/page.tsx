'use client';

import Link from 'next/link';

import { Button } from '@/components/ui';

export default function Home() {
  const handleContactClick = () => {
    const subject = encodeURIComponent(
      'Mándanos tus datos y nos pondremosen contacto contigo'
    );
    const body = encodeURIComponent(
      'Hola,\n\nMe interesa conocer más sobre SAD.\n\nSaludos,'
    );
    window.location.href = `mailto:info@alamia.es?subject=${subject}&body=${body}`;
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
      {/* Header/Navigation */}
      <header className='relative z-10'>
        <nav className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 64 64'
                  width='40'
                  height='40'
                  className='w-full h-full'
                >
                  <defs>
                    <linearGradient
                      id='headerLogoGradient'
                      x1='0%'
                      y1='0%'
                      x2='100%'
                      y2='100%'
                    >
                      <stop offset='0%' stopColor='#3b82f6' />
                      <stop offset='100%' stopColor='#22c55e' />
                    </linearGradient>
                  </defs>
                  <circle
                    cx='32'
                    cy='32'
                    r='30'
                    fill='url(#headerLogoGradient)'
                  />
                  <path
                    d='M32 50C32 50 12 36.36 12 24.5C12 17.6 17.6 12 24.5 12C28.09 12 31.36 13.94 32 16.35C32.64 13.94 35.91 12 39.5 12C46.4 12 52 17.6 52 24.5C52 36.36 32 50 32 50Z'
                    fill='white'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className='text-xl font-bold text-gray-900 hidden sm:block'>
                Sistema de Ayuda a Domicilio
              </span>
              <span className='text-lg font-bold text-gray-900 sm:hidden'>
                SAD
              </span>
            </div>
            <div className='flex items-center space-x-4'>
              <Link href='/auth' className='md:hidden'>
                <Button size='sm' variant='outline'>
                  Iniciar Sesión
                </Button>
              </Link>
              <div className='hidden md:flex items-center space-x-6'>
                <Link href='/auth'>
                  <Button size='sm' variant='outline'>
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className='relative overflow-hidden'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20'>
          <div className='text-center lg:text-left lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center'>
            <div className='mb-12 lg:mb-0'>
              <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight'>
                Gestión Inteligente de{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'>
                  Servicios de Ayuda a Domicilio
                </span>
              </h1>
              <p className='text-lg md:text-xl text-gray-600 mb-8 leading-relaxed'>
                Optimiza la gestión de trabajadoras, usuarios y planificaciones
                personalizadas para servicios asistenciales domiciliarios con
                tecnología moderna y eficiente.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'>
                <Link href='/auth'>
                  <Button size='lg' className='w-full sm:w-auto'>
                    🔐 Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </div>
            <div className='relative'>
              <div className='bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl p-8 shadow-2xl'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center'>
                    <div className='text-4xl mb-3'>👥</div>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Trabajadoras
                    </h3>
                    <p className='text-sm text-gray-600'>Gestión completa</p>
                  </div>
                  <div className='bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center'>
                    <div className='text-4xl mb-3'>👤</div>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Usuarios
                    </h3>
                    <p className='text-sm text-gray-600'>
                      Asistencia personalizada
                    </p>
                  </div>
                  <div className='bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center'>
                    <div className='text-4xl mb-3'>📅</div>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Planificación
                    </h3>
                    <p className='text-sm text-gray-600'>Horarios flexibles</p>
                  </div>
                  <div className='bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center'>
                    <div className='text-4xl mb-3'>⏰</div>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Control
                    </h3>
                    <p className='text-sm text-gray-600'>Gestión de horas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-16 lg:py-24 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-gray-900 mb-6'>
              ¿Por qué elegir SAD?
            </h2>
            <p className='text-lg text-gray-600 max-w-3xl mx-auto'>
              Nuestra plataforma está diseñada específicamente para optimizar la
              gestión de servicios asistenciales domiciliarios con las mejores
              prácticas del sector.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {/* Gestión de Trabajadoras */}
            <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>👥</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Gestión de Trabajadoras
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Administra cuidadoras, auxiliares y enfermeras con perfiles
                detallados, horarios flexibles y seguimiento de rendimiento.
              </p>
            </div>

            {/* Gestión de Usuarios */}
            <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>👤</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Gestión de Usuarios
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Gestiona usuarios con necesidades específicas, historial médico
                y contactos de emergencia para atención personalizada.
              </p>
            </div>

            {/* Planificación Personalizada */}
            <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>📅</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Planificación Personalizada
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Crea asignaciones inteligentes con horarios flexibles,
                prioridades y seguimiento en tiempo real.
              </p>
            </div>

            {/* Control de Horas */}
            <div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>⏰</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Control de Horas
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Seguimiento preciso de horas trabajadas, balances mensuales y
                gestión de festivos y vacaciones.
              </p>
            </div>

            {/* Acceso Seguro */}
            <div className='bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>🔒</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Acceso Seguro
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Sistema de autenticación robusto con roles diferenciados y
                acceso controlado a la información.
              </p>
            </div>

            {/* Tecnología Moderna */}
            <div className='bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center'>
              <div className='w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>💻</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                Tecnología Moderna
              </h3>
              <p className='text-gray-600 text-sm leading-relaxed'>
                Desarrollado con las últimas tecnologías para garantizar
                rendimiento, seguridad y escalabilidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-16 lg:py-24 bg-gradient-to-br from-blue-600 to-indigo-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl md:text-4xl font-bold text-white mb-6'>
            ¿Listo para optimizar tu gestión?
          </h2>
          <p className='text-xl text-blue-100 mb-8 max-w-2xl mx-auto'>
            Únete a organizaciones que ya confían en nosotros para gestionar sus
            servicios asistenciales domiciliarios de manera eficiente.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button
              size='lg'
              className='bg-blue-500 text-white hover:bg-blue-600 font-bold shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-400'
              onClick={handleContactClick}
            >
              <span className='text-2xl mr-2'>📧</span>
              Contactar Ahora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='bg-gray-900 text-white py-12'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div className='col-span-1 md:col-span-2'>
              <div className='flex items-center space-x-3 mb-4'>
                <div className='w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 64 64'
                    width='40'
                    height='40'
                    className='w-full h-full'
                  >
                    <defs>
                      <linearGradient
                        id='footerLogoGradient'
                        x1='0%'
                        y1='0%'
                        x2='100%'
                        y2='100%'
                      >
                        <stop offset='0%' stopColor='#3b82f6' />
                        <stop offset='100%' stopColor='#22c55e' />
                      </linearGradient>
                    </defs>
                    <circle
                      cx='32'
                      cy='32'
                      r='30'
                      fill='url(#footerLogoGradient)'
                    />
                    <path
                      d='M32 50C32 50 12 36.36 12 24.5C12 17.6 17.6 12 24.5 12C28.09 12 31.36 13.94 32 16.35C32.64 13.94 35.91 12 39.5 12C46.4 12 52 17.6 52 24.5C52 36.36 32 50 32 50Z'
                      fill='white'
                      stroke='white'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <span className='text-xl font-bold'>
                  Sistema de Ayuda a Domicilio
                </span>
              </div>
              <p className='text-gray-400 mb-4 max-w-md'>
                Sistema de gestión inteligente para servicios asistenciales
                domiciliarios. Optimiza tu organización con tecnología moderna.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Funcionalidades</h3>
              <ul className='space-y-2 text-gray-400'>
                <li>• Gestión de Trabajadoras</li>
                <li>• Gestión de Usuarios</li>
                <li>• Planificación Personalizada</li>
                <li>• Control de Horas</li>
              </ul>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Acceso</h3>
              <div className='space-y-3'>
                <Link href='/auth'>
                  <Button size='sm' variant='outline' className='w-full'>
                    🔐 Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className='border-t border-gray-800 mt-8 pt-8 text-center'>
            <p className='text-gray-400'>
              © 2025 SAD - Sistema de Gestión de Servicios Asistenciales
              Domiciliarios
            </p>
            <p className='text-gray-400 mt-2'>
              Hecho con mucho ❤️ por{' '}
              <span className='font-medium text-white'>Gusi</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
