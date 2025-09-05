import { ReactNode } from 'react';

interface SelectProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Select({ 
  id, 
  value, 
  onChange, 
  children, 
  className = '', 
  required = false,
  disabled = false 
}: SelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </select>
  );
}
