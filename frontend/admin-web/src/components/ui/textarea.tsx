import {
  forwardRef,
  type TextareaHTMLAttributes,
  useId,
} from 'react';
import { FormErrorMessage, FormHelperText, FormLabel } from './input';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: customId,
      label,
      helperText,
      errorMessage,
      isRequired,
      showCount,
      maxLength,
      value,
      defaultValue,
      disabled,
      className = '',
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId ?? generatedId;
    const hasError = Boolean(errorMessage);
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = errorMessage ? `${id}-error` : undefined;

    const currentLength =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
        ? defaultValue.length
        : 0;

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={id} required={isRequired}>
            {label}
          </FormLabel>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? errorId : helperId}
          className={`w-full rounded-md border bg-white p-3 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
            hasError
              ? 'border-red-500 focus-visible:outline-red-600'
              : 'border-slate-300 hover:border-slate-400 focus-visible:outline-[#1b5040]'
          } ${className}`}
          {...props}
        />

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex-1">
            {errorMessage ? (
              <FormErrorMessage id={errorId}>{errorMessage}</FormErrorMessage>
            ) : helperText ? (
              <FormHelperText id={helperId}>{helperText}</FormHelperText>
            ) : null}
          </div>

          {showCount && maxLength && (
            <span className="text-[11px] text-slate-400 font-mono shrink-0">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
