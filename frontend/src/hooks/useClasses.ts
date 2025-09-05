/**
 * Hook para gerenciamento de turmas com atualização otimista
 * 
 * Funcionalidades:
 * - CRUD completo com cache local
 * - Atualização otimista para melhor UX
 * - Rollback automático em caso de erro
 * - Validações integradas
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  listClasses, 
  createClass, 
  updateClass, 
  deleteClass,
  canDeleteClass,
  validateClassData,
  generateClassName,
  type Class,
  type CreateClassPayload,
  type UpdateClassPayload
} from '@/services/classes';
import { logger } from '@/lib/logger';

export interface UseClassesOptions {
  // Se deve carregar automaticamente na inicialização
  autoLoad?: boolean;
  // Se deve mostrar toasts de sucesso/erro
  showToasts?: boolean;
  // Se deve fazer log de ações
  enableLogging?: boolean;
}

export interface UseClassesReturn {
  // Dados
  classes: Class[];
  
  // Estados
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Ações CRUD
  createClass: (payload: CreateClassPayload) => Promise<Class | null>;
  updateClass: (id: string, payload: CreateClassPayload) => Promise<Class | null>;
  deleteClass: (id: string) => Promise<boolean>;
  
  // Utilitários
  refresh: () => Promise<void>;
  clearError: () => void;
  validateClass: (payload: CreateClassPayload) => { isValid: boolean; errors: Record<string, string> };
  canDelete: (id: string) => Promise<boolean>;
  generateName: (series: number, letter: string) => string;
}

export function useClasses(options: UseClassesOptions = {}): UseClassesReturn {
  const {
    autoLoad = true,
    showToasts = true,
    enableLogging = true,
  } = options;

  // Estados
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar turmas
  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await listClasses();
      setClasses(data);
      
      if (enableLogging) {
        logger.info('Classes loaded successfully', {
          action: 'classes',
          count: data.length,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to load classes', {
          action: 'classes',
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enableLogging, showToasts]);

  // Carregar automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadClasses();
    }
  }, [autoLoad, loadClasses]);

  // Criar turma com atualização otimista
  const handleCreateClass = useCallback(async (payload: CreateClassPayload): Promise<Class | null> => {
    // Validação
    const validation = validateClassData(payload);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return null;
    }

    // Dados otimistas
    const optimisticClass: Class = {
      id: `temp-${Date.now()}`,
      series: payload.series,
      letter: payload.letter,
      discipline: payload.discipline,
      schedule: payload.schedule,
      name: generateClassName(payload.series, payload.letter),
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Atualização otimista
    setClasses(prev => [optimisticClass, ...prev]);
    setIsCreating(true);
    setError(null);

    try {
      const newClass = await createClass(payload);
      
      // Substituir dados otimistas pelos reais
      setClasses(prev => prev.map(c => c.id === optimisticClass.id ? newClass : c));
      
      if (enableLogging) {
        logger.info('Class created successfully', {
          action: 'classes',
          classId: newClass.id,
          series: payload.series,
          letter: payload.letter,
        });
      }
      
      if (showToasts) {
        toast.success(`Turma ${generateClassName(payload.series, payload.letter)} criada com sucesso!`);
      }
      
      return newClass;
    } catch (err) {
      // Rollback
      setClasses(prev => prev.filter(c => c.id !== optimisticClass.id));
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar turma';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to create class', {
          action: 'classes',
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [showToasts, enableLogging]);

  // Atualizar turma com atualização otimista
  const handleUpdateClass = useCallback(async (id: string, payload: CreateClassPayload): Promise<Class | null> => {
    // Validação
    const validation = validateClassData(payload);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return null;
    }

    // Encontrar turma atual
    const currentClass = classes.find(c => c.id === id || c._id === id);
    if (!currentClass) {
      const errorMessage = 'Turma não encontrada';
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return null;
    }

    // Dados otimistas
    const optimisticClass: Class = {
      ...currentClass,
      series: payload.series,
      letter: payload.letter,
      discipline: payload.discipline,
      schedule: payload.schedule,
      name: generateClassName(payload.series, payload.letter),
      updatedAt: new Date().toISOString(),
    };

    // Atualização otimista
    setClasses(prev => prev.map(c => (c.id === id || c._id === id) ? optimisticClass : c));
    setIsUpdating(true);
    setError(null);

    try {
      const updatedClass = await updateClass(id, payload);
      
      // Substituir dados otimistas pelos reais
      setClasses(prev => prev.map(c => (c.id === id || c._id === id) ? updatedClass : c));
      
      if (enableLogging) {
        logger.info('Class updated successfully', {
          action: 'classes',
          classId: id,
          series: payload.series,
          letter: payload.letter,
        });
      }
      
      if (showToasts) {
        toast.success(`Turma ${generateClassName(payload.series, payload.letter)} atualizada com sucesso!`);
      }
      
      return updatedClass;
    } catch (err) {
      // Rollback
      setClasses(prev => prev.map(c => (c.id === id || c._id === id) ? currentClass : c));
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar turma';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to update class', {
          action: 'classes',
          classId: id,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [classes, showToasts, enableLogging]);

  // Deletar turma
  const handleDeleteClass = useCallback(async (id: string): Promise<boolean> => {
    // Verificar se pode deletar
    try {
      const canDelete = await canDeleteClass(id);
      if (!canDelete) {
        const errorMessage = 'Não é possível excluir turma que possui alunos';
        setError(errorMessage);
        if (showToasts) {
          toast.error(errorMessage);
        }
        return false;
      }
    } catch (err) {
      const errorMessage = 'Erro ao verificar se turma pode ser excluída';
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return false;
    }

    // Encontrar turma atual
    const currentClass = classes.find(c => c.id === id || c._id === id);
    if (!currentClass) {
      const errorMessage = 'Turma não encontrada';
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return false;
    }

    // Atualização otimista
    setClasses(prev => prev.filter(c => c.id !== id && c._id !== id));
    setIsDeleting(true);
    setError(null);

    try {
      await deleteClass(id);
      
      if (enableLogging) {
        logger.info('Class deleted successfully', {
          action: 'classes',
          classId: id,
        });
      }
      
      if (showToasts) {
        toast.success(`Turma ${currentClass.name || generateClassName(currentClass.series, currentClass.letter)} excluída com sucesso!`);
      }
      
      return true;
    } catch (err) {
      // Rollback
      setClasses(prev => [currentClass, ...prev]);
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir turma';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to delete class', {
          action: 'classes',
          classId: id,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
      
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [classes, showToasts, enableLogging]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Dados
    classes,
    
    // Estados
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    
    // Ações CRUD
    createClass: handleCreateClass,
    updateClass: handleUpdateClass,
    deleteClass: handleDeleteClass,
    
    // Utilitários
    refresh: loadClasses,
    clearError,
    validateClass: validateClassData,
    canDelete: canDeleteClass,
    generateName: generateClassName,
  };
}
