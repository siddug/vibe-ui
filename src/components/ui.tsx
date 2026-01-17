'use client';

import { ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

// Button component
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Input component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Textarea component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

// Card component
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`px-4 py-3 border-b border-[var(--card-border)] ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

// Badge component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status badge helper
export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    running: 'info',
    completed: 'success',
    failed: 'error',
    killed: 'warning',
  };

  return <Badge variant={variantMap[status] || 'default'}>{status}</Badge>;
}

// Provider badge helper - shows the AI provider with distinct styling
interface ProviderBadgeProps {
  provider: string;
  className?: string;
}

export function ProviderBadge({ provider, className = '' }: ProviderBadgeProps) {
  // Map connector names to display info
  const providerStyles: Record<string, { bg: string; text: string; label: string }> = {
    claude: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      label: 'Claude',
    },
    vibe: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
      label: 'Mistral Vibe',
    },
  };

  const style = providerStyles[provider] || {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    label: provider,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
}

// AI Logo component - shows the appropriate logo based on connector type
interface AILogoProps {
  provider: string;
  className?: string;
}

export function AILogo({ provider, className = '' }: AILogoProps) {
  // Map connector names to appropriate logos
  const getLogo = () => {
    switch (provider.toLowerCase()) {
      case 'claude':
        return (
          <div className={`w-6 h-6 flex items-center justify-center ${className}`}>
            <img src="/claude.svg" alt="Claude" className="w-full h-full object-contain" />
          </div>
        );
      case 'vibe':
      case 'mistral':
        return (
          <div className={`w-6 h-6 flex items-center justify-center ${className}`}>
            <img src="/m-rainbow.png" alt="Mistral Vibe" className="w-full h-full object-contain" />
          </div>
        );
      default:
        return (
          <div className={`w-6 h-6 flex items-center justify-center text-xl ${className}`}>
            🤖
          </div>
        );
    }
  };

  return getLogo();
}

// User Avatar component - shows a generic person icon
interface UserAvatarProps {
  className?: string;
}

export function UserAvatar({ className = '' }: UserAvatarProps) {
  return (
    <div className={`w-6 h-6 flex items-center justify-center text-xl ${className}`}>
      👤
    </div>
  );
}

// Modal/Dialog component
interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Dialog({ open, onClose, children, title }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-[var(--card-bg)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
        {title && (
          <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Loading spinner
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
