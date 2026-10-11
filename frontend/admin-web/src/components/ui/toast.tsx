import {
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
} from './icons';
import { ToastContext, type ToastItem } from './use-toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 4000,
    }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}

      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastComponent
              key={t.id}
              item={t}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastComponent({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const icons = {
    info: <InfoIcon size={18} className="text-sky-600 shrink-0 mt-0.5" />,
    success: <CheckCircleIcon size={18} className="text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangleIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />,
    danger: <AlertCircleIcon size={18} className="text-red-600 shrink-0 mt-0.5" />,
  };

  const borders = {
    info: 'border-sky-200',
    success: 'border-emerald-200',
    warning: 'border-amber-200',
    danger: 'border-red-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3.5 shadow-lg ${borders[item.type]}`}
    >
      {icons[item.type]}

      <div className="flex-1">
        <h5 className="text-sm font-semibold text-slate-900 leading-tight">
          {item.title}
        </h5>
        {item.message && (
          <p className="text-xs text-slate-600 mt-1 leading-normal">
            {item.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <XIcon size={14} />
      </button>
    </motion.div>
  );
}
