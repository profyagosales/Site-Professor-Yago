/**
 * Hook para gerenciamento do diário (caderno)
 * 
 * Funcionalidades:
 * - Carregamento de dados do diário
 * - Autosave com debounce de 1s
 * - Histórico de lançamentos
 * - Validação de dados
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  getDiary, 
  saveDiaryDebounced,
  getDiaryHistory,
  getClassStudents,
  validateDiaryData,
  createDefaultDiaryData,
  type DiaryData,
  type DiaryEntry,
  type Student,
  type DiaryHistoryItem,
  type GetDiaryParams,
  type SaveDiaryParams,
  type GetDiaryHistoryParams
} from '@/services/diary';
import { logger } from '@/lib/logger';

export interface UseDiaryOptions {
  classId: string;
  date: string;
  // TTL do cache em ms (padrão 30s)
  cacheTtlMs?: number;
  // Se deve mostrar toasts de sucesso/erro
  showToasts?: boolean;
  // Se deve fazer log de ações
  enableLogging?: boolean;
  // Se deve fazer autosave
  enableAutosave?: boolean;
}

export interface UseDiaryReturn {
  // Dados
  diaryData: DiaryData | null;
  students: Student[];
  entries: DiaryEntry[];
  history: DiaryHistoryItem[];
  
  // Estados
  isLoading: boolean;
  isSaving: boolean;
  isHistoryLoading: boolean;
  error: string | null;
  
  // Ações
  updateEntry: (studentId: string, updates: Partial<DiaryEntry>) => void;
  saveDiary: () => Promise<void>;
  loadHistory: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Utilitários
  getEntry: (studentId: string) => DiaryEntry | null;
  validateData: () => { isValid: boolean; errors: string[] };
  
  // Controles
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
}

export function useDiary(options: UseDiaryOptions): UseDiaryReturn {
  const {
    classId,
    date,
    cacheTtlMs = 30000, // 30 segundos
    showToasts = true,
    enableLogging = true,
    enableAutosave = true,
  } = options;

  // Estados
  const [diaryData, setDiaryData] = useState<DiaryData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<DiaryHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Cache de valores otimistas
  const [optimisticEntries, setOptimisticEntries] = useState<Map<string, DiaryEntry>>(new Map());
  
  // Refs para controle de autosave
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // Dados derivados
  const entries = diaryData?.entries || [];

  // Carregar dados do diário
  const loadDiaryData = useCallback(async () => {
    if (!classId || !date) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Carrega dados do diário e lista de alunos em paralelo
      const [diaryResponse, studentsResponse] = await Promise.all([
        getDiary({ classId, date }).catch(() => null), // Pode não existir ainda
        getClassStudents(classId),
      ]);
      
      setStudents(studentsResponse);
      
      if (diaryResponse) {
        setDiaryData(diaryResponse);
        setLastSavedDataRef(JSON.stringify(diaryResponse.entries));
      } else {
        // Cria dados padrão se não existir
        const defaultData = createDefaultDiaryData(classId, date, studentsResponse);
        setDiaryData(defaultData);
        setLastSavedDataRef(JSON.stringify(defaultData.entries));
      }
      
      setOptimisticEntries(new Map()); // Limpa cache otimista
      setHasUnsavedChanges(false);
      
      if (enableLogging) {
        logger.info('Diary data loaded successfully', {
          action: 'diary',
          classId,
          date,
          studentsCount: studentsResponse.length,
          entriesCount: diaryResponse?.entries.length || 0,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar diário';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to load diary data', {
          action: 'diary',
          classId,
          date,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [classId, date, enableLogging, showToasts]);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    if (!classId) return;

    try {
      setIsHistoryLoading(true);
      
      const { dateFrom, dateTo } = getLast7DaysRange();
      const historyData = await getDiaryHistory({ classId, dateFrom, dateTo });
      
      setHistory(historyData);
      
      if (enableLogging) {
        logger.info('Diary history loaded successfully', {
          action: 'diary',
          classId,
          dateFrom,
          dateTo,
          historyCount: historyData.length,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      
      if (enableLogging) {
        logger.error('Failed to load diary history', {
          action: 'diary',
          classId,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsHistoryLoading(false);
    }
  }, [classId, enableLogging, showToasts]);

  // Salvar diário
  const saveDiary = useCallback(async () => {
    if (!diaryData || !enableAutosave) return;

    try {
      setIsSaving(true);
      
      const validation = validateDiaryData(diaryData);
      if (!validation.isValid) {
        if (showToasts) {
          toast.error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }
        return;
      }

      const savedData = await saveDiaryDebounced({
        classId: diaryData.classId,
        date: diaryData.date,
        entries: diaryData.entries,
      });
      
      setDiaryData(savedData);
      setLastSavedDataRef(JSON.stringify(savedData.entries));
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      
      if (enableLogging) {
        logger.info('Diary saved successfully', {
          action: 'diary',
          classId,
          date,
          entriesCount: savedData.entries.length,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar diário';
      
      if (enableLogging) {
        logger.error('Failed to save diary', {
          action: 'diary',
          classId,
          date,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  }, [diaryData, enableAutosave, showToasts, enableLogging, classId, date]);

  // Atualizar entrada com autosave
  const updateEntry = useCallback((studentId: string, updates: Partial<DiaryEntry>) => {
    if (!diaryData) return;

    // Atualização otimista
    setDiaryData(prev => {
      if (!prev) return prev;
      
      const updatedEntries = prev.entries.map(entry => 
        entry.studentId === studentId 
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry
      );
      
      return {
        ...prev,
        entries: updatedEntries,
      };
    });
    
    setHasUnsavedChanges(true);
    
    // Cancela autosave anterior
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Agenda novo autosave
    if (enableAutosave) {
      autosaveTimeoutRef.current = setTimeout(() => {
        saveDiary();
      }, 1000); // 1 segundo de debounce
    }
  }, [diaryData, enableAutosave, saveDiary]);

  // Obter entrada (otimista ou real)
  const getEntry = useCallback((studentId: string): DiaryEntry | null => {
    // Verifica cache otimista primeiro
    if (optimisticEntries.has(studentId)) {
      return optimisticEntries.get(studentId)!;
    }
    
    // Senão, busca nos dados reais
    return entries.find(entry => entry.studentId === studentId) || null;
  }, [entries, optimisticEntries]);

  // Validar dados
  const validateData = useCallback(() => {
    if (!diaryData) {
      return { isValid: false, errors: ['Dados do diário não carregados'] };
    }
    
    return validateDiaryData(diaryData);
  }, [diaryData]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar automaticamente
  useEffect(() => {
    loadDiaryData();
  }, [loadDiaryData]);

  // Cleanup do autosave
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Verificar mudanças não salvas
  useEffect(() => {
    if (diaryData) {
      const currentData = JSON.stringify(diaryData.entries);
      setHasUnsavedChanges(currentData !== lastSavedDataRef.current);
    }
  }, [diaryData]);

  return {
    // Dados
    diaryData,
    students,
    entries,
    history,
    
    // Estados
    isLoading,
    isSaving,
    isHistoryLoading,
    error,
    
    // Ações
    updateEntry,
    saveDiary,
    loadHistory,
    refresh: loadDiaryData,
    clearError,
    
    // Utilitários
    getEntry,
    validateData,
    
    // Controles
    hasUnsavedChanges,
    lastSavedAt,
  };
}
