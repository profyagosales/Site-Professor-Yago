/**
 * Componente de input numérico para notas
 * 
 * Funcionalidades:
 * - Validação 0-10 com passo 0.1
 * - Máscara de entrada
 * - Navegação por teclado
 * - Estados visuais (loading, erro)
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface GradeInputProps {
  value: number | null;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  className?: string;
  placeholder?: string;
  'data-testid'?: string;
}

export default function GradeInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  disabled = false,
  loading = false,
  error = false,
  className = '',
  placeholder = '',
  'data-testid': testId,
}: GradeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar com valor externo
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value !== null ? value.toFixed(1) : '');
    }
  }, [value, isFocused]);

  // Validação de entrada
  const validateInput = useCallback((input: string): boolean => {
    if (!input.trim()) return true; // Vazio é válido
    
    const num = parseFloat(input);
    if (isNaN(num)) return false;
    
    if (num < 0 || num > 10) return false;
    
    // Verifica se tem no máximo 1 casa decimal
    const decimalPlaces = (input.split('.')[1] || '').length;
    if (decimalPlaces > 1) return false;
    
    return true;
  }, []);

  // Formatação de entrada
  const formatInput = useCallback((input: string): string => {
    if (!input.trim()) return '';
    
    // Remove caracteres não numéricos exceto ponto
    let formatted = input.replace(/[^0-9.]/g, '');
    
    // Remove pontos extras
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limita a 1 casa decimal
    if (parts.length === 2 && parts[1].length > 1) {
      formatted = parts[0] + '.' + parts[1].substring(0, 1);
    }
    
    return formatted;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatInput(rawValue);
    
    if (validateInput(formatted)) {
      setInputValue(formatted);
      onChange(formatted);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    // Formatar valor final
    const finalValue = inputValue.trim();
    if (finalValue) {
      const num = parseFloat(finalValue);
      if (!isNaN(num)) {
        setInputValue(num.toFixed(1));
      }
    }
    
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navegação por teclado
    if (e.key === 'Enter') {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      onKeyDown?.(e);
    } else if (e.key === 'Tab') {
      onKeyDown?.(e);
    }
    
    // Bloquear caracteres inválidos
    if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const getInputClasses = () => {
    const baseClasses = 'w-full px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (error) {
      return `${baseClasses} border-red-300 bg-red-50`;
    }
    
    if (loading) {
      return `${baseClasses} border-yellow-300 bg-yellow-50`;
    }
    
    if (isFocused) {
      return `${baseClasses} border-blue-300 bg-blue-50`;
    }
    
    return `${baseClasses} border-gray-300`;
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={getInputClasses()}
        data-testid={testId}
        inputMode="decimal"
        pattern="[0-9]*[.]?[0-9]?"
        maxLength={4} // Máximo: 10.0
      />
      
      {/* Indicador de loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Indicador de erro */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-red-500 text-xs">!</div>
        </div>
      )}
    </div>
  );
}
