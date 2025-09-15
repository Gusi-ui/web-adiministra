'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  helperText?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const StatCard = ({
  label,
  value,
  helperText,
  icon,
  onClick,
}: StatCardProps): React.JSX.Element => {
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`$${onClick ? 'hover:shadow transition text-left' : ''} bg-white rounded-xl p-6 shadow-sm`}
    >
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-600'>{label}</p>
          <p className='text-2xl font-bold text-gray-900'>{value}</p>
          {helperText !== undefined &&
            helperText !== null &&
            helperText !== '' && (
              <p className='text-xs text-gray-500 mt-1'>{helperText}</p>
            )}
        </div>
        <div className='w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center'>
          <span className='text-2xl'>{icon}</span>
        </div>
      </div>
    </Wrapper>
  );
};

export default StatCard;
