/**
 * Serviços para gerenciamento de temas de redação
 * 
 * Funcionalidades:
 * - CRUD completo de temas
 * - Gerenciamento de estado ativo
 * - Integração com modal de nova redação
 * - Validações e tratamento de erros
 */

import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

export interface EssayTheme {
  id: string;
  name: string;
  type: 'ENEM' | 'PAS' | 'OUTRO';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThemeParams {
  name: string;
  type: 'ENEM' | 'PAS' | 'OUTRO';
  active?: boolean;
}

export interface UpdateThemeParams {
  name?: string;
  type?: 'ENEM' | 'PAS' | 'OUTRO';
  active?: boolean;
}

export interface ListThemesParams {
  onlyActive?: boolean;
  type?: 'ENEM' | 'PAS' | 'OUTRO';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListThemesResponse {
  themes: EssayTheme[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Lista temas de redação
 */
export async function listThemes(params: ListThemesParams = {}): Promise<ListThemesResponse> {
  try {
    const { onlyActive, type, search, page = 1, pageSize = 50 } = params;
    
    const response = await api.get('/essays/themes', {
      params: {
        active: onlyActive ? true : undefined,
        type,
        search,
        page,
        pageSize,
      },
    });
    
    const data = pickData(response);
    
    // Normaliza a resposta para formato consistente
    return {
      themes: data.themes || data.data || [],
      total: data.total || 0,
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      totalPages: data.totalPages || Math.ceil((data.total || 0) / pageSize),
    };
  } catch (error) {
    logger.error('Failed to list essay themes', {
      action: 'essayThemes',
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém tema por ID
 */
export async function getThemeById(id: string): Promise<EssayTheme> {
  try {
    const response = await api.get(`/essays/themes/${id}`);
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get theme by ID', {
      action: 'essayThemes',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Cria novo tema
 */
export async function createTheme(params: CreateThemeParams): Promise<EssayTheme> {
  try {
    const { name, type, active = true } = params;
    
    const response = await api.post('/essays/themes', {
      name: name.trim(),
      type,
      active,
    });
    
    logger.info('Essay theme created successfully', {
      action: 'essayThemes',
      name: name.trim(),
      type,
      active,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to create essay theme', {
      action: 'essayThemes',
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Atualiza tema existente
 */
export async function updateTheme(id: string, params: UpdateThemeParams): Promise<EssayTheme> {
  try {
    const response = await api.patch(`/essays/themes/${id}`, {
      ...params,
      name: params.name?.trim(),
    });
    
    logger.info('Essay theme updated successfully', {
      action: 'essayThemes',
      id,
      params,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to update essay theme', {
      action: 'essayThemes',
      id,
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Alterna estado ativo do tema
 */
export async function toggleActive(id: string): Promise<EssayTheme> {
  try {
    // Primeiro obtém o tema atual
    const currentTheme = await getThemeById(id);
    
    // Atualiza o estado ativo
    const updatedTheme = await updateTheme(id, {
      active: !currentTheme.active,
    });
    
    logger.info('Essay theme active status toggled', {
      action: 'essayThemes',
      id,
      previousActive: currentTheme.active,
      newActive: updatedTheme.active,
    });
    
    return updatedTheme;
  } catch (error) {
    logger.error('Failed to toggle theme active status', {
      action: 'essayThemes',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove tema
 */
export async function deleteTheme(id: string): Promise<void> {
  try {
    await api.delete(`/essays/themes/${id}`);
    
    logger.info('Essay theme deleted successfully', {
      action: 'essayThemes',
      id,
    });
  } catch (error) {
    logger.error('Failed to delete essay theme', {
      action: 'essayThemes',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Valida dados do tema
 */
export function validateThemeData(data: Partial<CreateThemeParams>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || !data.name.trim()) {
    errors.push('Nome do tema é obrigatório');
  } else if (data.name.trim().length < 3) {
    errors.push('Nome do tema deve ter pelo menos 3 caracteres');
  } else if (data.name.trim().length > 200) {
    errors.push('Nome do tema deve ter no máximo 200 caracteres');
  }
  
  if (!data.type) {
    errors.push('Tipo do tema é obrigatório');
  } else if (!['ENEM', 'PAS', 'OUTRO'].includes(data.type)) {
    errors.push('Tipo do tema deve ser ENEM, PAS ou OUTRO');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formata tipo do tema para exibição
 */
export function formatThemeType(type: 'ENEM' | 'PAS' | 'OUTRO'): string {
  switch (type) {
    case 'ENEM':
      return 'ENEM';
    case 'PAS':
      return 'PAS';
    case 'OUTRO':
      return 'Outro';
    default:
      return type;
  }
}

/**
 * Obtém cor do tipo do tema
 */
export function getThemeTypeColor(type: 'ENEM' | 'PAS' | 'OUTRO'): string {
  switch (type) {
    case 'ENEM':
      return 'bg-blue-100 text-blue-800';
    case 'PAS':
      return 'bg-green-100 text-green-800';
    case 'OUTRO':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Filtra temas por tipo
 */
export function filterThemesByType(themes: EssayTheme[], type?: 'ENEM' | 'PAS' | 'OUTRO'): EssayTheme[] {
  if (!type) return themes;
  return themes.filter(theme => theme.type === type);
}

/**
 * Filtra temas ativos
 */
export function filterActiveThemes(themes: EssayTheme[]): EssayTheme[] {
  return themes.filter(theme => theme.active);
}

/**
 * Busca temas por nome
 */
export function searchThemes(themes: EssayTheme[], query: string): EssayTheme[] {
  if (!query.trim()) return themes;
  
  const searchTerm = query.toLowerCase().trim();
  return themes.filter(theme => 
    theme.name.toLowerCase().includes(searchTerm)
  );
}

/**
 * Ordena temas por nome
 */
export function sortThemesByName(themes: EssayTheme[]): EssayTheme[] {
  return [...themes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Ordena temas por tipo
 */
export function sortThemesByType(themes: EssayTheme[]): EssayTheme[] {
  const typeOrder = { 'ENEM': 1, 'PAS': 2, 'OUTRO': 3 };
  return [...themes].sort((a, b) => {
    const aOrder = typeOrder[a.type] || 999;
    const bOrder = typeOrder[b.type] || 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

// Manter compatibilidade com código existente
export const fetchThemes = listThemes;
export const createThemeApi = createTheme;
export const updateThemeApi = updateTheme;

export default {
  listThemes,
  getThemeById,
  createTheme,
  updateTheme,
  toggleActive,
  deleteTheme,
  validateThemeData,
  formatThemeType,
  getThemeTypeColor,
  filterThemesByType,
  filterActiveThemes,
  searchThemes,
  sortThemesByName,
  sortThemesByType,
  // Compatibilidade
  fetchThemes,
  createThemeApi,
  updateThemeApi,
};
