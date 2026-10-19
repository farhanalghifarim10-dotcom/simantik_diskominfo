import { useState, type ReactNode } from 'react';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
} from './icons';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  isDismissable?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  isDismissable = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleClose = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const variantConfig: Record<
    AlertVariant,
    { container: string; text: string; icon: ReactNode }
  > = {
    info: {
      container: 'bg-[#caf3e4]/60 border-[#98f7d9] text-[#000408]',
      text: 'text-[#1b5040]',
      icon: <InfoIcon size={20} className="text-[#1b5040] shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      text: 'text-emerald-800',
      icon: <CheckCircleIcon size={20} className="text-emerald-700 shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-950',
      text: 'text-amber-800',
      icon: <AlertTriangleIcon size={20} className="text-amber-700 shrink-0 mt-0.5" />,
    },
    danger: {
      container: 'bg-red-50 border-red-200 text-red-950',
      text: 'text-red-800',
      icon: <AlertCircleIcon size={20} className="text-red-700 shrink-0 mt-0.5" />,
    },
  };

  const { container, text, icon } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 rounded-lg border p-4 text-sm ${container} ${className}`}
    >
      {icon}

      <div className="flex-1">
        {title && (
          <h4 className="font-semibold text-sm leading-tight text-slate-900 mb-1">
            {title}
          </h4>
        )}
        <div className={`leading-normal ${text}`}>{children}</div>
      </div>

      {isDismissable && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup pemberitahuan"
          className="text-slate-500 hover:text-slate-800 transition-colors p-1 rounded-md cursor-pointer hover:bg-black/5"
        >
          <XIcon size={16} />
        </button>
      )}
    </div>
  );
}
