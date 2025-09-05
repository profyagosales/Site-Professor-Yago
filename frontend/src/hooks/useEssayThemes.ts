/**
 * Hook para gerenciamento de temas de redação
 * 
 * Funcionalidades:
 * - Listagem de temas com filtros
 * - CRUD completo com otimização
 * - Cache inteligente
 * - Estados de loading e erro
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  listThemes,
  createTheme,
  updateTheme,
  toggleActive,
  deleteTheme,
  validateThemeData,
  type EssayTheme,
  type CreateThemeParams,
  type UpdateThemeParams,
  type ListThemesParams
} from '@/services/essayThemes';
import { logger } from '@/lib/logger';

export interface UseEssayThemesOptions {
  // Filtros padrão
  onlyActive?: boolean;
  type?: 'ENEM' | 'PAS' | 'OUTRO';
  search?: string;
  
  // Paginação
  page?: number;
  pageSize?: number;
  
  // Comportamento
  autoLoad?: boolean;
  showToasts?: boolean;
  enableLogging?: boolean;
}

export interface UseEssayThemesReturn {
  // Dados
  themes: EssayTheme[];
  activeThemes: EssayTheme[];
  filteredThemes: EssayTheme[];
  
  // Estados
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Paginação
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  
  // Ações
  loadThemes: (params?: ListThemesParams) => Promise<void>;
  createNewTheme: (params: CreateThemeParams) => Promise<EssayTheme | null>;
  updateExistingTheme: (id: string, params: UpdateThemeParams) => Promise<EssayTheme | null>;
  toggleThemeActive: (id: string) => Promise<void>;
  deleteExistingTheme: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Filtros
  setSearch: (search: string) => void;
  setType: (type: 'ENEM' | 'PAS' | 'OUTRO' | undefined) => void;
  setOnlyActive: (onlyActive: boolean) => void;
  
  // Utilitários
  getThemeById: (id: string) => EssayTheme | undefined;
  validateTheme: (data: Partial<CreateThemeParams>) => { isValid: boolean; errors: string[] };
}

export function useEssayThemes(options: UseEssayThemesOptions = {}): UseEssayThemesReturn {
  const {
    onlyActive = false,
    type,
    search = '',
    page = 1,
    pageSize = 50,
    autoLoad = true,
    showToasts = true,
    enableLogging = true,
  } = options;

  // Estados
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginação
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filtros
  const [currentSearch, setCurrentSearch] = useState(search);
  const [currentType, setCurrentType] = useState(type);
  const [currentOnlyActive, setCurrentOnlyActive] = useState(onlyActive);

  // Dados derivados
  const activeThemes = themes.filter(theme => theme.active);
  const filteredThemes = themes.filter(theme => {
    if (currentOnlyActive && !theme.active) return false;
    if (currentType && theme.type !== currentType) return false;
    if (currentSearch && !theme.name.toLowerCase().includes(currentSearch.toLowerCase())) return false;
    return true;
  });

  // Carregar temas
  const loadThemes = useCallback(async (params?: ListThemesParams) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = {
        onlyActive: currentOnlyActive,
        type: currentType,
        search: currentSearch,
        page: currentPage,
        pageSize: currentPageSize,
        ...params,
      };
      
      const response = await listThemes(queryParams);
      
      setThemes(response.themes);
      setTotal(response.total);
      setCurrentPage(response.page);
      setCurrentPageSize(response.pageSize);
      setTotalPages(response.totalPages);
      
      if (enableLogging) {
        logger.info('Essay themes loaded successfully', {
          action: 'essayThemes',
          count: response.themes.length,
          total: response.total,
          page: response.page,
          filters: {
            onlyActive: currentOnlyActive,
            type: currentType,
            search: currentSearch,
          },
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar temas';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to load essay themes', {
          action: 'essayThemes',
          error: errorMessage,
          filters: {
            onlyActive: currentOnlyActive,
            type: currentType,
            search: currentSearch,
          },
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentOnlyActive, currentType, currentSearch, currentPage, currentPageSize, enableLogging, showToasts]);

  // Criar tema
  const createNewTheme = useCallback(async (params: CreateThemeParams): Promise<EssayTheme | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      const validation = validateThemeData(params);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        setError(errorMessage);
        if (showToasts) {
          toast.error(errorMessage);
        }
        return null;
      }
      
      const newTheme = await createTheme(params);
      
      // Atualiza lista local
      setThemes(prev => [newTheme, ...prev]);
      setTotal(prev => prev + 1);
      
      if (enableLogging) {
        logger.info('Essay theme created successfully', {
          action: 'essayThemes',
          themeId: newTheme.id,
          name: newTheme.name,
          type: newTheme.type,
        });
      }
      
      if (showToasts) {
        toast.success(`Tema "${newTheme.name}" criado com sucesso`);
      }
      
      return newTheme;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar tema';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to create essay theme', {
          action: 'essayThemes',
          params,
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
  }, [enableLogging, showToasts]);

  // Atualizar tema
  const updateExistingTheme = useCallback(async (id: string, params: UpdateThemeParams): Promise<EssayTheme | null> => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedTheme = await updateTheme(id, params);
      
      // Atualiza lista local
      setThemes(prev => prev.map(theme => 
        theme.id === id ? updatedTheme : theme
      ));
      
      if (enableLogging) {
        logger.info('Essay theme updated successfully', {
          action: 'essayThemes',
          themeId: id,
          params,
        });
      }
      
      if (showToasts) {
        toast.success(`Tema "${updatedTheme.name}" atualizado com sucesso`);
      }
      
      return updatedTheme;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar tema';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to update essay theme', {
          action: 'essayThemes',
          id,
          params,
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
  }, [enableLogging, showToasts]);

  // Alternar estado ativo
  const toggleThemeActive = useCallback(async (id: string) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedTheme = await toggleActive(id);
      
      // Atualiza lista local
      setThemes(prev => prev.map(theme => 
        theme.id === id ? updatedTheme : theme
      ));
      
      if (enableLogging) {
        logger.info('Essay theme active status toggled', {
          action: 'essayThemes',
          themeId: id,
          active: updatedTheme.active,
        });
      }
      
      if (showToasts) {
        toast.success(`Tema "${updatedTheme.name}" ${updatedTheme.active ? 'ativado' : 'desativado'}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status do tema';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to toggle theme active status', {
          action: 'essayThemes',
          id,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [enableLogging, showToasts]);

  // Deletar tema
  const deleteExistingTheme = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await deleteTheme(id);
      
      // Remove da lista local
      setThemes(prev => prev.filter(theme => theme.id !== id));
      setTotal(prev => prev - 1);
      
      if (enableLogging) {
        logger.info('Essay theme deleted successfully', {
          action: 'essayThemes',
          themeId: id,
        });
      }
      
      if (showToasts) {
        toast.success('Tema removido com sucesso');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover tema';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to delete essay theme', {
          action: 'essayThemes',
          id,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  }, [enableLogging, showToasts]);

  // Obter tema por ID
  const getThemeById = useCallback((id: string): EssayTheme | undefined => {
    return themes.find(theme => theme.id === id);
  }, [themes]);

  // Validar tema
  const validateTheme = useCallback((data: Partial<CreateThemeParams>) => {
    return validateThemeData(data);
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Atualizar filtros
  const setSearch = useCallback((search: string) => {
    setCurrentSearch(search);
  }, []);

  const setType = useCallback((type: 'ENEM' | 'PAS' | 'OUTRO' | undefined) => {
    setCurrentType(type);
  }, []);

  const setOnlyActive = useCallback((onlyActive: boolean) => {
    setCurrentOnlyActive(onlyActive);
  }, []);

  // Carregar automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadThemes();
    }
  }, [autoLoad, loadThemes]);

  // Recarregar quando filtros mudam
  useEffect(() => {
    if (autoLoad) {
      loadThemes();
    }
  }, [currentOnlyActive, currentType, currentSearch, autoLoad, loadThemes]);

  return {
    // Dados
    themes,
    activeThemes,
    filteredThemes,
    
    // Estados
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    
    // Paginação
    total,
    page: currentPage,
    pageSize: currentPageSize,
    totalPages,
    
    // Ações
    loadThemes,
    createNewTheme,
    updateExistingTheme,
    toggleThemeActive,
    deleteExistingTheme,
    refresh: loadThemes,
    clearError,
    
    // Filtros
    setSearch,
    setType,
    setOnlyActive,
    
    // Utilitários
    getThemeById,
    validateTheme,
  };
}
