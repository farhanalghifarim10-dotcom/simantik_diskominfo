import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  useId,
} from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; transform: string }>({
    top: 0,
    left: 0,
    transform: '',
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 10;

    let top = 0;
    let left = 0;
    let transform = '';

    switch (position) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        transform = 'translateY(-50%)';
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        transform = 'translate(-100%, -50%)';
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
        break;
      case 'top':
      default:
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, -100%)';
        break;
    }

    setCoords({ top, left, transform });
  }, [position]);

  const handleShow = () => {
    updateCoords();
    setIsVisible(true);
  };

  const handleHide = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    updateCoords();
    const handleScrollOrResize = () => {
      updateCoords();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, updateCoords]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
    >
      <div aria-describedby={isVisible ? id : undefined} className="w-full">
        {children}
      </div>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.transform,
            }}
            className="fixed z-[9999] whitespace-nowrap rounded-lg bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 text-xs font-semibold shadow-2xl pointer-events-none transition-opacity duration-150"
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}
