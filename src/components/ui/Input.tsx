import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      error,
      helperText,
      id,
      label,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses =
      'block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base text-gray-900 placeholder-gray-400 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

    const errorClasses =
      error !== undefined && error !== ''
        ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
        : '';

    const iconClasses =
      leftIcon !== undefined ? 'pl-10' : rightIcon !== undefined ? 'pr-10' : '';

    const inputClasses = [baseClasses, errorClasses, iconClasses, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className='w-full'>
        {label !== undefined && (
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor={inputId}
          >
            {label}
          </label>
        )}
        <div className='relative'>
          {leftIcon !== undefined && (
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <div className='h-5 w-5 text-gray-400'>{leftIcon}</div>
            </div>
          )}
          <input className={inputClasses} id={inputId} ref={ref} {...props} />
          {rightIcon !== undefined && (
            <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
              <div className='h-5 w-5 text-gray-400'>{rightIcon}</div>
            </div>
          )}
        </div>
        {error !== undefined && error !== '' && (
          <p className='mt-1 text-sm text-red-600' id={`${inputId}-error`}>
            {error}
          </p>
        )}
        {helperText !== undefined &&
          helperText !== '' &&
          error === undefined && (
            <p
              className='mt-1 text-sm text-gray-500'
              id={`${inputId}-description`}
            >
              {helperText}
            </p>
          )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
