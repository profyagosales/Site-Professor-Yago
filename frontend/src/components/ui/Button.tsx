import React from 'react';

export type ButtonSize = 'md' | 'sm' | 'xs';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tamanho do botão */
  size?: ButtonSize;
  /** Faz o botão ocupar toda a largura do container (equivalente a w-full) */
  block?: boolean;
}

const baseClass = [
  'btn',
  'inline-flex items-center justify-center gap-1.5 align-middle',
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size = 'md', block = false, className, type, ...props }, ref) => {
    const btnType = type ?? 'button';
    return (
      <button
        ref={ref}
        type={btnType}
        className={cx(baseClass, sizeStyles[size], block && 'w-full', className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
