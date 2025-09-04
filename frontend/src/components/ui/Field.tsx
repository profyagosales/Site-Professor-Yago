import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, className = '', ...props }: InputProps) {
  return (
    <label className={`block ${className}`}>
      <span className='block text-sm font-medium text-ys-ink mb-1'>
        {label}
      </span>
      <input
        {...props}
        className='w-full rounded-xl border border-ys-line bg-white px-3 py-2 text-ys-ink placeholder:text-ys-ink-3 outline-none focus:ring-2 focus:ring-ys-amber/50 focus:border-ys-amber transition-colors'
      />
      {error && (
        <span className='mt-1 block text-xs text-red-600'>{error}</span>
      )}
    </label>
  );
}
