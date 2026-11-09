import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';
import { CheckIcon } from './icons';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  errorMessage?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id: customId,
      label,
      description,
      indeterminate = false,
      errorMessage,
      disabled,
      checked,
      className = '',
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId ?? generatedId;
    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const target = (ref as React.RefObject<HTMLInputElement>)?.current || innerRef.current;
      if (target) {
        target.indeterminate = indeterminate;
      }
    }, [indeterminate, ref]);

    return (
      <div className={`flex flex-col ${className}`}>
        <label
          htmlFor={id}
          className={`group flex items-start gap-2.5 select-none ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              ref={ref || innerRef}
              type="checkbox"
              id={id}
              disabled={disabled}
              checked={checked}
              onChange={onChange}
              className="peer sr-only"
              {...props}
            />

            <div
              className={`h-4.5 w-4.5 rounded border transition-colors duration-150 flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1b5040] ${
                errorMessage
                  ? 'border-red-500'
                  : 'border-slate-300 peer-hover:border-slate-400'
              } peer-checked:bg-[#1b5040] peer-checked:border-[#1b5040] peer-checked:text-white bg-white`}
            >
              {indeterminate ? (
                <div className="h-0.5 w-2 bg-[#1b5040] rounded-sm" />
              ) : checked ? (
                <CheckIcon size={12} className="stroke-[3]" />
              ) : null}
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className="text-sm font-medium text-slate-800 leading-snug">
                  {label}
                </span>
              )}
              {description && (
                <span className="text-xs text-slate-500 mt-0.5 leading-normal">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {errorMessage && (
          <p className="text-xs text-red-600 mt-1 font-medium pl-7">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
