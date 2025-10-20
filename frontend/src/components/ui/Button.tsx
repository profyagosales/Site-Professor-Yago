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
      'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition duration-fast',
      'disabled:cursor-not-allowed disabled:opacity-[var(--op-disabled)]',
      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:ring-offset-0',
    ].join(' ');

  const sizeStyles: Record<ButtonSize, string> = {
    md: 'h-10 px-4',
    sm: 'h-9 px-3 text-sm',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-brand-grad text-white shadow-soft hover:opacity-95 active:opacity-90',
    ghost: 'border border-border bg-surface text-text hover:bg-surface2',
    outline: 'border border-borderStrong bg-surface text-text hover:bg-surface2',
    link: 'h-auto rounded-lg border-none bg-transparent px-0 py-0 text-brand hover:text-brand-600 underline-offset-4 hover:underline focus-visible:ring-0',
  };

  const resolvedSize = variant === 'link' ? '' : sizeStyles[size];

  return (
    <button
      className={[baseClass, resolvedSize, variantStyles[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

