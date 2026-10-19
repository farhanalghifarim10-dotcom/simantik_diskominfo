import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SpinnerIcon } from './icons';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5040]';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#1b5040] text-white hover:bg-[#143d31] active:bg-[#0d2820] border border-transparent shadow-xs',
    secondary:
      'bg-[#2e8a6e] text-white hover:bg-[#246854] active:bg-[#1b5040] border border-transparent shadow-xs',
    outline:
      'bg-white text-[#1b5040] border border-slate-300 hover:bg-[#caf3e4]/30 hover:border-[#2e8a6e] active:bg-[#caf3e4] shadow-xs',
    ghost:
      'bg-transparent text-slate-700 hover:bg-[#caf3e4]/40 hover:text-[#1b5040] active:bg-[#caf3e4] border border-transparent',
    danger:
      'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-transparent shadow-xs',
    link:
      'bg-transparent text-[#1b5040] hover:text-[#2e8a6e] hover:underline p-0 h-auto font-semibold border-none',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <SpinnerIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
          <span>Memproses...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
