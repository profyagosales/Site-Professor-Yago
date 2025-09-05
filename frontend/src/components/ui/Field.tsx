import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({
  label,
  error,
  className = '',
  id,
  ...props
}: InputProps) {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={`block ${className}`}>
      <label
        htmlFor={fieldId}
        className='block text-sm font-medium text-ys-ink mb-1'
      >
        {label}
        {props.required && (
          <span className='text-red-500 ml-1' aria-label='obrigatório'>
            *
          </span>
        )}
      </label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        className='w-full rounded-xl border border-ys-line bg-white px-3 py-2 text-ys-ink placeholder:text-ys-ink-3 outline-none focus:ring-2 focus:ring-ys-amber/50 focus:border-ys-amber transition-colors'
      />
      {error && (
        <span
          id={errorId}
          className='mt-1 block text-xs text-red-600'
          role='alert'
        >
          {error}
        </span>
      )}
    </div>
  );
}
