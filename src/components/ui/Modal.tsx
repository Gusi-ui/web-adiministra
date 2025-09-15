import React from 'react';

import Card from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm md:max-w-md',
    md: 'max-w-md md:max-w-lg',
    lg: 'max-w-lg md:max-w-2xl',
  };

  return (
    <div className='fixed inset-0 z-[9999] overflow-y-auto'>
      <div className='flex items-end md:items-center justify-center min-h-screen p-4 md:pt-4 md:pb-20 text-center'>
        {/* Background overlay */}
        <div
          className='fixed inset-0 bg-black bg-opacity-50 transition-opacity'
          onClick={onClose}
        />

        {/* Modal panel - Mobile: slide up from bottom, Desktop: center */}
        <div className='relative inline-block w-full text-left align-bottom md:align-middle transition-all transform bg-white shadow-xl rounded-t-2xl md:rounded-lg'>
          <div className={`${sizeClasses[size]} mx-auto`}>
            <Card className='p-0 shadow-none border-0'>
              {/* Header */}
              <div className='flex items-center justify-between p-4 md:p-6 border-b border-gray-200'>
                {/* Mobile: Handle bar */}
                <div className='md:hidden absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full'></div>

                <h3 className='text-base md:text-lg font-medium text-gray-900 mt-2 md:mt-0 pr-8 md:pr-0'>
                  {title}
                </h3>
                <button
                  className='text-gray-400 hover:text-gray-600 transition-colors p-1 md:p-0'
                  onClick={onClose}
                  type='button'
                >
                  <svg
                    className='w-6 h-6 md:w-5 md:h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className='p-4 md:p-6 max-h-[80vh] md:max-h-none overflow-y-auto'>
                {children}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
