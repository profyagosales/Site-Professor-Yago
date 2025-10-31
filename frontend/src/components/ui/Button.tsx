import React from 'react';

export type ButtonSize = 'md' | 'sm' | 'xs';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tamanho do botão */
  size?: ButtonSize;
  /** Variante visual do botão */
  variant?: ButtonVariant;
  /** Faz o botão ocupar toda a largura do container (equivalente a w-full) */
  block?: boolean;
}

const baseClass = [
  'btn',
  'inline-flex items-center justify-center gap-1 align-middle',
  'rounded-2xl',
  'text-sm font-semibold leading-tight',
  'transition duration-fast',
  // truncation seguro dentro de cards estreitos/rails
  'truncate whitespace-nowrap min-w-0 overflow-hidden',
  // sem margem externa inesperada
  'm-0 select-none',
  // foco visível acessível
  'focus:outline-none focus-visible:ring-2 focus:ring-orange-500/60',
  // estados desabilitado
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

const sizeStyles: Record<ButtonSize, string> = {
  md: 'h-10 px-4',
  sm: 'h-9 px-3 text-sm',
  xs: 'h-8 px-2.5 text-xs',
};

const variantStyles: Record<ButtonVariant, string> = {
  solid: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 border border-orange-600/0',
  soft: 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 active:bg-orange-500/20 border border-orange-200',
  outline: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-transparent',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size = 'md', variant = 'solid', block = false, className, type, ...props }, ref) => {
    const btnType = type ?? 'button';
    return (
      <button
        ref={ref}
        type={btnType}
        data-variant={variant}
        className={cx(baseClass, sizeStyles[size], variantStyles[variant], block && 'w-full', className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
