import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from 'react';

export interface FormLabelProps {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormLabel({
  htmlFor,
  required,
  children,
  className = '',
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-red-600 ml-1 font-bold" aria-hidden="true">*</span>}
    </label>
  );
}

export interface FormHelperTextProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FormHelperText({
  id,
  children,
  className = '',
}: FormHelperTextProps) {
  return (
    <p id={id} className={`text-xs text-slate-500 mt-1.5 leading-normal ${className}`}>
      {children}
    </p>
  );
}

export interface FormErrorMessageProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FormErrorMessage({
  id,
  children,
  className = '',
}: FormErrorMessageProps) {
  return (
    <p
      id={id}
      role="alert"
      className={`text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1 ${className}`}
    >
      <span className="inline-block h-1 w-1 rounded-full bg-red-600" aria-hidden="true" />
      {children}
    </p>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: customId,
      label,
      helperText,
      errorMessage,
      leftAddon,
      rightAddon,
      isRequired,
      disabled,
      className = '',
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
          {leftAddon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? errorId : helperId}
            className={`w-full h-10 rounded-md border bg-white px-3.5 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              leftAddon ? 'pl-10' : ''
            } ${rightAddon ? 'pr-10' : ''} ${
              hasError
                ? 'border-red-500 focus-visible:outline-red-600'
                : 'border-slate-300 hover:border-slate-400 focus-visible:outline-slate-900'
            } ${className}`}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3 flex items-center text-slate-400">
              {rightAddon}
            </div>
          )}
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

Input.displayName = 'Input';
