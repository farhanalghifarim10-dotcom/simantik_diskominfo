import type { ReactNode } from 'react';
import { AlertCircleIcon, RefreshCwIcon } from './icons';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Gagal Memuat Data',
  description = 'Terjadi kendala saat menghubungkan ke sistem layanan. Silakan coba kembali atau hubungi administrator.',
  onRetry,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-200 bg-red-50/40 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3 border border-red-200">
        <AlertCircleIcon size={24} />
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-sm text-slate-600 leading-normal">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-3">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCwIcon size={14} />}
          >
            Coba Lagi
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
