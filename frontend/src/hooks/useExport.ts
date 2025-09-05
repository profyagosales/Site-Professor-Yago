/**
 * Hook para gerenciamento de exportações
 * 
 * Funcionalidades:
 * - Estados de loading e erro
 * - Funções de exportação específicas
 * - Feedback visual para o usuário
 * - Configurações de exportação
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  toCSV, 
  toXLSX, 
  exportGradesMatrix,
  exportAttendance,
  exportEssays,
  exportCombinedData,
  type ExportRow,
  type ExportSheet,
  type ExportOptions
} from '@/lib/export';
import { logger } from '@/lib/logger';

export interface UseExportOptions {
  showToasts?: boolean;
  enableLogging?: boolean;
  defaultOptions?: ExportOptions;
}

export interface UseExportReturn {
  // Estados
  isExporting: boolean;
  error: string | null;
  
  // Ações
  exportToCSV: (filename: string, rows: ExportRow[], options?: ExportOptions) => Promise<void>;
  exportToXLSX: (filename: string, sheets: ExportSheet[], options?: ExportOptions) => Promise<void>;
  exportGrades: (students: any[], assessments: any[], grades: any[], className: string, term: string) => Promise<void>;
  exportAttendance: (students: any[], entries: any[], className: string, date: string) => Promise<void>;
  exportEssays: (essays: any[], className?: string, status?: string) => Promise<void>;
  exportCombined: (data: any, className: string, term?: string) => Promise<void>;
  clearError: () => void;
}

export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const {
    showToasts = true,
    enableLogging = true,
    defaultOptions = {},
  } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exportar para CSV
  const exportToCSV = useCallback(async (
    filename: string, 
    rows: ExportRow[], 
    options: ExportOptions = {}
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      const finalOptions = { ...defaultOptions, ...options };
      
      toCSV(filename, rows, finalOptions);
      
      if (enableLogging) {
        logger.info('CSV exportado com sucesso', {
          filename,
          rows: rows.length,
          options: finalOptions,
        });
      }
      
      if (showToasts) {
        toast.success(`CSV "${filename}" exportado com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar CSV';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar CSV', {
          filename,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [defaultOptions, showToasts, enableLogging]);

  // Exportar para XLSX
  const exportToXLSX = useCallback(async (
    filename: string, 
    sheets: ExportSheet[], 
    options: ExportOptions = {}
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      const finalOptions = { ...defaultOptions, ...options };
      
      toXLSX(filename, sheets, finalOptions);
      
      if (enableLogging) {
        logger.info('XLSX exportado com sucesso', {
          filename,
          sheets: sheets.length,
          totalRows: sheets.reduce((sum, sheet) => sum + sheet.data.length, 0),
          options: finalOptions,
        });
      }
      
      if (showToasts) {
        toast.success(`XLSX "${filename}" exportado com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar XLSX';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar XLSX', {
          filename,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [defaultOptions, showToasts, enableLogging]);

  // Exportar notas
  const exportGrades = useCallback(async (
    students: any[],
    assessments: any[],
    grades: any[],
    className: string,
    term: string
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      exportGradesMatrix(students, assessments, grades, className, term);
      
      if (enableLogging) {
        logger.info('Notas exportadas com sucesso', {
          className,
          term,
          students: students.length,
          assessments: assessments.length,
          grades: grades.length,
        });
      }
      
      if (showToasts) {
        toast.success(`Notas da turma ${className} exportadas com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar notas';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar notas', {
          className,
          term,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [showToasts, enableLogging]);

  // Exportar presença
  const exportAttendance = useCallback(async (
    students: any[],
    entries: any[],
    className: string,
    date: string
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      exportAttendance(students, entries, className, date);
      
      if (enableLogging) {
        logger.info('Presença exportada com sucesso', {
          className,
          date,
          students: students.length,
          entries: entries.length,
        });
      }
      
      if (showToasts) {
        toast.success(`Presença da turma ${className} exportada com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar presença';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar presença', {
          className,
          date,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [showToasts, enableLogging]);

  // Exportar redações
  const exportEssays = useCallback(async (
    essays: any[],
    className?: string,
    status?: string
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      exportEssays(essays, className, status);
      
      if (enableLogging) {
        logger.info('Redações exportadas com sucesso', {
          className,
          status,
          essays: essays.length,
        });
      }
      
      if (showToasts) {
        toast.success(`Redações exportadas com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar redações';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar redações', {
          className,
          status,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [showToasts, enableLogging]);

  // Exportar dados combinados
  const exportCombined = useCallback(async (
    data: any,
    className: string,
    term?: string
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      exportCombinedData(data, className, term);
      
      if (enableLogging) {
        logger.info('Dados combinados exportados com sucesso', {
          className,
          term,
          hasGrades: !!data.grades,
          hasAttendance: !!data.attendance,
          hasEssays: !!data.essays,
        });
      }
      
      if (showToasts) {
        toast.success(`Dados completos da turma ${className} exportados com sucesso`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar dados combinados';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Erro ao exportar dados combinados', {
          className,
          term,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  }, [showToasts, enableLogging]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estados
    isExporting,
    error,
    
    // Ações
    exportToCSV,
    exportToXLSX,
    exportGrades,
    exportAttendance,
    exportEssays,
    exportCombined,
    clearError,
  };
}
