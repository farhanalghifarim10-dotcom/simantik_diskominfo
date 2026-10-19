import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from 'react';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  label,
  name,
  value,
  defaultValue,
  onChange,
  options,
  errorMessage,
  disabled,
  className = '',
}: RadioGroupProps) {
  return (
    <fieldset className={`w-full ${className}`}>
      {label && (
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
          {label}
        </legend>
      )}

      <div className="space-y-2">
        {options.map((option) => {
          const isChecked = value !== undefined ? value === option.value : undefined;
          const isDefault = defaultValue !== undefined ? defaultValue === option.value : undefined;

          return (
            <Radio
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              description={option.description}
              checked={isChecked}
              defaultChecked={isDefault}
              disabled={disabled || option.disabled}
              onChange={(e) => {
                if (e.target.checked && onChange) {
                  onChange(option.value);
                }
              }}
            />
          );
        })}
      </div>

      {errorMessage && (
        <p className="text-xs font-medium text-red-600 mt-1.5" role="alert">
          {errorMessage}
        </p>
      )}
    </fieldset>
  );
}

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      id: customId,
      label,
      description,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId ?? generatedId;

    return (
      <label
        htmlFor={id}
        className={`group flex items-start gap-2.5 select-none ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5 shrink-0">
          <input
            ref={ref}
            type="radio"
            id={id}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />

          <div className="h-4.5 w-4.5 rounded-full border border-slate-300 bg-white transition-colors duration-150 flex items-center justify-center peer-hover:border-slate-400 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1b5040] peer-checked:border-[#1b5040] peer-checked:bg-[#1b5040]">
            <div className="h-1.5 w-1.5 rounded-full bg-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800 leading-snug">
            {label}
          </span>
          {description && (
            <span className="text-xs text-slate-500 mt-0.5 leading-normal">
              {description}
            </span>
          )}
        </div>
      </label>
    );
  },
);

Radio.displayName = 'Radio';
