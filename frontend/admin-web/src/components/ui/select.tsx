import {
  forwardRef,
  type SelectHTMLAttributes,
  useId,
} from 'react';
import { ChevronDownIcon } from './icons';
import { FormErrorMessage, FormHelperText, FormLabel } from './input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id: customId,
      label,
      helperText,
      errorMessage,
      isRequired,
      options = [],
      placeholder,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId ?? generatedId;
    const hasError = Boolean(errorMessage);
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = errorMessage ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={id} required={isRequired}>
            {label}
          </FormLabel>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? errorId : helperId}
            className={`w-full h-10 appearance-none rounded-md border bg-white px-3.5 pr-10 text-sm text-slate-900 transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              hasError
                ? 'border-red-500 focus-visible:outline-red-600'
                : 'border-slate-300 hover:border-slate-400 focus-visible:outline-slate-900'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>

          <div className="pointer-events-none absolute right-3 flex items-center text-slate-500">
            <ChevronDownIcon size={16} />
          </div>
        </div>

        {errorMessage ? (
          <FormErrorMessage id={errorId}>{errorMessage}</FormErrorMessage>
        ) : helperText ? (
          <FormHelperText id={helperId}>{helperText}</FormHelperText>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
