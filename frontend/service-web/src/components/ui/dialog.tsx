import {
  useEffect,
  type ReactNode,
  useId,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { XIcon } from './icons';
import { backdropVariants, modalVariants } from './motion';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}: DialogProps) {
  const titleId = useId();
  const descId = useId();

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
        >
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            variants={modalVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`relative w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col z-10 ${sizeStyles[size]} ${className}`}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  {title && (
                    <h3
                      id={titleId}
                      className="text-lg font-bold text-slate-900 leading-snug"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p
                      id={descId}
                      className="text-sm text-slate-500 mt-1 leading-normal"
                    >
                      {description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup dialog"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <XIcon size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto leading-normal text-slate-700 text-sm">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
