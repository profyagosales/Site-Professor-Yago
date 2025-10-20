import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'link';
type ButtonSize = 'md' | 'sm';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: Props) {
  const baseClass = [
    'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ys-brand)]',
  ].join(' ');

  const sizeStyles: Record<ButtonSize, string> = {
    md: 'px-4 py-2',
    sm: 'px-3 py-1.5 text-sm',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--ys-brand)] text-white shadow-[0_12px_28px_rgba(255,122,0,0.35)] hover:brightness-110',
    ghost: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    link: 'h-auto rounded-lg border-none bg-transparent px-0 py-0 text-orange-600 underline-offset-4 hover:text-orange-700 hover:underline focus-visible:no-underline',
  };

  const resolvedSize = variant === 'link' ? '' : sizeStyles[size];

  return (
    <button
      className={[baseClass, resolvedSize, variantStyles[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

