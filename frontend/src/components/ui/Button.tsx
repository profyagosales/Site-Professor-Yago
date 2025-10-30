import React from 'react';

export type ButtonSize = 'md' | 'sm' | 'xs';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
}

const baseClass = 'btn inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition duration-fast truncate min-w-0';

const sizeStyles: Record<ButtonSize, string> = {
  md: 'h-10 px-4',
  sm: 'h-9 px-3 text-sm',
  xs: 'h-8 px-2.5 text-xs',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Button({ size = 'md', className, ...props }: ButtonProps) {
  return (
    <button {...props} className={cx(baseClass, sizeStyles[size], className)} />
  );
}

export default Button;
