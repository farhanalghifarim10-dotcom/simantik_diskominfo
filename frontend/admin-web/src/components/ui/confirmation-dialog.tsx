import type { ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { AlertTriangleIcon } from './icons';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'primary',
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'danger'
              ? 'bg-red-100 text-red-600'
              : 'bg-sky-100 text-sky-700'
          }`}
        >
          <AlertTriangleIcon size={20} />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {title}
          </h3>
          <div className="mt-1.5 text-sm text-slate-600 leading-normal">
            {description}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
