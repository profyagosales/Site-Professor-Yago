/**
 * Hook para gerenciamento de estudantes com busca e paginação
 * 
 * Funcionalidades:
 * - Lista com busca e paginação
 * - Cache e atualização otimista
 * - Integração com query-string
 * - Convite por e-mail
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  listStudents, 
  createStudent, 
  updateStudent, 
  removeStudent,
  inviteStudent,
  validateStudentData,
  validateInviteData,
  type Student,
  type StudentListParams,
  type CreateStudentPayload,
  type InviteStudentParams
} from '@/services/students';
import { logger } from '@/lib/logger';

export interface UseStudentsOptions {
  classId: string;
  // TTL do cache em ms (padrão 30s)
  cacheTtlMs?: number;
  // Se deve mostrar toasts de sucesso/erro
  showToasts?: boolean;
  // Se deve fazer log de ações
  enableLogging?: boolean;
  // Se deve sincronizar com query-string
  syncWithUrl?: boolean;
}

export interface UseStudentsReturn {
  // Dados
  students: Student[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  
  // Estados
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isInviting: boolean;
  error: string | null;
  
  // Busca
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Paginação
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Ações CRUD
  createStudent: (payload: CreateStudentPayload) => Promise<Student | null>;
  updateStudent: (id: string, payload: Partial<CreateStudentPayload>) => Promise<Student | null>;
  deleteStudent: (id: string) => Promise<boolean>;
  inviteStudent: (email: string) => Promise<string | null>;
  
  // Utilitários
  refresh: () => Promise<void>;
  clearError: () => void;
  validateStudent: (payload: CreateStudentPayload) => { isValid: boolean; errors: Record<string, string> };
  validateInvite: (email: string) => { isValid: boolean; errors: Record<string, string> };
}

export function useStudents(options: UseStudentsOptions): UseStudentsReturn {
  const {
    classId,
    cacheTtlMs = 30000, // 30 segundos
    showToasts = true,
    enableLogging = true,
    syncWithUrl = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca
  const [searchQuery, setSearchQueryState] = useState('');

  // Sincronizar com URL
  useEffect(() => {
    if (!syncWithUrl) return;

    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
    const urlQuery = searchParams.get('q') || '';

    setCurrentPage(urlPage);
    setPageSizeState(urlPageSize);
    setSearchQueryState(urlQuery);
  }, [searchParams, syncWithUrl]);

  // Atualizar URL quando parâmetros mudarem
  const updateUrl = useCallback((updates: { page?: number; pageSize?: number; q?: string }) => {
    if (!syncWithUrl) return;

    const newParams = new URLSearchParams(searchParams);
    
    if (updates.page !== undefined) {
      newParams.set('page', updates.page.toString());
    }
    if (updates.pageSize !== undefined) {
      newParams.set('pageSize', updates.pageSize.toString());
    }
    if (updates.q !== undefined) {
      if (updates.q) {
        newParams.set('q', updates.q);
      } else {
        newParams.delete('q');
      }
    }

    setSearchParams(newParams);
  }, [searchParams, setSearchParams, syncWithUrl]);

  // Carregar estudantes
  const loadStudents = useCallback(async () => {
    if (!classId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const params: StudentListParams = {
        classId,
        q: searchQuery || undefined,
        page: currentPage,
        pageSize: pageSize,
      };
      
      const data = await listStudents(params);
      setStudents(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      
      if (enableLogging) {
        logger.info('Students loaded successfully', {
          action: 'students',
          classId,
          count: data.items.length,
          total: data.total,
          page: currentPage,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estudantes';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to load students', {
          action: 'students',
          classId,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [classId, searchQuery, currentPage, pageSize, enableLogging, showToasts]);

  // Carregar automaticamente quando parâmetros mudarem
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Debounce para busca
  useEffect(() => {
    if (!syncWithUrl) return;

    const timeoutId = setTimeout(() => {
      updateUrl({ q: searchQuery, page: 1 });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateUrl, syncWithUrl]);

  // Criar estudante
  const handleCreateStudent = useCallback(async (payload: CreateStudentPayload): Promise<Student | null> => {
    // Validação
    const validation = validateStudentData(payload);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newStudent = await createStudent(classId, payload);
      
      // Atualizar lista local
      setStudents(prev => [newStudent, ...prev]);
      setTotal(prev => prev + 1);
      
      if (enableLogging) {
        logger.info('Student created successfully', {
          action: 'students',
          classId,
          studentId: newStudent.id,
          name: payload.name,
        });
      }
      
      if (showToasts) {
        toast.success(`Estudante ${payload.name} criado com sucesso!`);
      }
      
      return newStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar estudante';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to create student', {
          action: 'students',
          classId,
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
  }, [classId, showToasts, enableLogging]);

  // Atualizar estudante
  const handleUpdateStudent = useCallback(async (id: string, payload: Partial<CreateStudentPayload>): Promise<Student | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const updatedStudent = await updateStudent(classId, id, payload);
      
      // Atualizar lista local
      setStudents(prev => prev.map(s => s.id === id || s._id === id ? updatedStudent : s));
      
      if (enableLogging) {
        logger.info('Student updated successfully', {
          action: 'students',
          classId,
          studentId: id,
          name: payload.name,
        });
      }
      
      if (showToasts) {
        toast.success(`Estudante ${payload.name || 'atualizado'} com sucesso!`);
      }
      
      return updatedStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar estudante';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to update student', {
          action: 'students',
          classId,
          studentId: id,
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
  }, [classId, showToasts, enableLogging]);

  // Deletar estudante
  const handleDeleteStudent = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await removeStudent(classId, id);
      
      // Atualizar lista local
      setStudents(prev => prev.filter(s => s.id !== id && s._id !== id));
      setTotal(prev => prev - 1);
      
      if (enableLogging) {
        logger.info('Student deleted successfully', {
          action: 'students',
          classId,
          studentId: id,
        });
      }
      
      if (showToasts) {
        toast.success('Estudante removido com sucesso!');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover estudante';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to delete student', {
          action: 'students',
          classId,
          studentId: id,
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
  }, [classId, showToasts, enableLogging]);

  // Convidar estudante
  const handleInviteStudent = useCallback(async (email: string): Promise<string | null> => {
    // Validação
    const validation = validateInviteData(email);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      return null;
    }

    setIsInviting(true);
    setError(null);

    try {
      const result = await inviteStudent({ classId, email });
      
      if (enableLogging) {
        logger.info('Student invited successfully', {
          action: 'students',
          classId,
          email,
        });
      }
      
      if (showToasts) {
        toast.success(`Convite enviado para ${email}!`);
      }
      
      return result.inviteUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar convite';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to invite student', {
          action: 'students',
          classId,
          email,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsInviting(false);
    }
  }, [classId, showToasts, enableLogging]);

  // Navegação de páginas
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    updateUrl({ page });
  }, [updateUrl]);

  // Alterar tamanho da página
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
    updateUrl({ pageSize: size, page: 1 });
  }, [updateUrl]);

  // Alterar busca
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Dados
    students,
    total,
    totalPages,
    currentPage,
    pageSize,
    
    // Estados
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isInviting,
    error,
    
    // Busca
    searchQuery,
    setSearchQuery,
    
    // Paginação
    goToPage,
    setPageSize,
    
    // Ações CRUD
    createStudent: handleCreateStudent,
    updateStudent: handleUpdateStudent,
    deleteStudent: handleDeleteStudent,
    inviteStudent: handleInviteStudent,
    
    // Utilitários
    refresh: loadStudents,
    clearError,
    validateStudent: validateStudentData,
    validateInvite: validateInviteData,
  };
}
