/**
 * Componente de botão de exportação reutilizável
 * 
 * Funcionalidades:
 * - Botão com loading e estados visuais
 * - Suporte a diferentes tipos de exportação
 * - Feedback visual para o usuário
 * - Configurações personalizáveis
 */

import { useState } from 'react';
import { useExport } from '@/hooks/useExport';

export interface ExportButtonProps {
  // Tipo de exportação
  type: 'csv' | 'xlsx' | 'grades' | 'attendance' | 'essays' | 'combined';
  
  // Dados para exportação
  data: any;
  
  // Configurações
  filename: string;
  className?: string;
  term?: string;
  status?: string;
  date?: string;
  
  // Opções de exportação
  exportOptions?: {
    includeTimestamp?: boolean;
    includeClass?: string;
    dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
  };
  
  // Props do botão
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children?: React.ReactNode;
  
  // Callbacks
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function ExportButton({
  type,
  data,
  filename,
  className,
  term,
  status,
  date,
  exportOptions = {},
  variant = 'outline',
  size = 'md',
  disabled = false,
  children,
  onSuccess,
  onError,
}: ExportButtonProps) {
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  
  const {
    isExporting,
    error,
    exportToCSV,
    exportToXLSX,
    exportGrades,
    exportAttendance,
    exportEssays,
    exportCombined,
    clearError,
  } = useExport({
    showToasts: true,
    enableLogging: true,
    defaultOptions: exportOptions,
  });

  const isLoading = isExporting || isLocalLoading;

  const handleExport = async () => {
    if (isLoading || disabled) return;

    try {
      setIsLocalLoading(true);
      clearError();

      switch (type) {
        case 'csv':
          await exportToCSV(filename, data.rows || data, exportOptions);
          break;
        
        case 'xlsx':
          await exportToXLSX(filename, data.sheets || data, exportOptions);
          break;
        
        case 'grades':
          await exportGrades(
            data.students,
            data.assessments,
            data.grades,
            className || '',
            term || '1'
          );
          break;
        
        case 'attendance':
          await exportAttendance(
            data.students,
            data.entries,
            className || '',
            date || new Date().toISOString().split('T')[0]
          );
          break;
        
        case 'essays':
          await exportEssays(
            data.essays || data,
            className,
            status
          );
          break;
        
        case 'combined':
          await exportCombined(
            data,
            className || '',
            term
          );
          break;
        
        default:
          throw new Error(`Tipo de exportação não suportado: ${type}`);
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na exportação';
      onError?.(errorMessage);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Variantes
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    };
    
    // Tamanhos
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
  };

  const getIcon = () => {
    if (isLoading) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getButtonText = () => {
    if (isLoading) {
      return 'Exportando...';
    }
    
    if (children) {
      return children;
    }
    
    const typeText = {
      csv: 'CSV',
      xlsx: 'XLSX',
      grades: 'Notas',
      attendance: 'Presença',
      essays: 'Redações',
      combined: 'Dados Completos',
    };
    
    return `Exportar ${typeText[type]}`;
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isLoading}
      className={getButtonClasses()}
      title={`Exportar ${filename}`}
    >
      {getIcon()}
      {getButtonText()}
    </button>
  );
}
