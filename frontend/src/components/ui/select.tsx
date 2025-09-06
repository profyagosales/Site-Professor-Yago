import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  className?: string;
}

export function Select({ children, className = "", ...props }: SelectProps) {
  return (
    <select 
      className={`block w-full px-3 py-2 border border-ys-line rounded-lg bg-white text-ys-ink focus:outline-none focus:ring-2 focus:ring-ys-primary focus:border-transparent ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ✅ compatibilidade: permite importar como named OU default
export default Select;
