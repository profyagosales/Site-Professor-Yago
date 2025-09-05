/**
 * Serviço unificado de anotações com debounce e atualização otimista
 *
 * Características:
 * - Debounce de 800ms para coalescer múltiplas edições
 * - Atualização otimista (UI atualiza antes da API)
 * - Rollback automático em caso de erro
 * - CORS-safe (headers mínimos)
 * - Tratamento de 204 como sucesso
 */

import { api } from './api';
import { useState, useEffect, useCallback } from 'react';
import { debouncePromise } from '@/utils/debouncePromise';
import type { Annotation } from '@/types/annotations';
import type { Anno } from '@/types/annotations';

// Tipos para o serviço
export interface AnnotationsPayload {
  annotations: Annotation[];
  richAnnotations?: Anno[];
}

export interface AnnotationsState {
  annotations: Annotation[];
  richAnnotations: Anno[];
  isOptimistic: boolean;
  lastSaved?: Date;
  error?: string;
}

// Cache de estados para rollback
const stateCache = new Map<string, AnnotationsState>();

// Cache de timeouts para debounce
const debounceTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Obtém anotações de uma redação
 */
export async function getAnnotations(
  essayId: string
): Promise<AnnotationsPayload> {
  try {
    const response = await api.get(`/essays/${essayId}/annotations`);
    return {
      annotations: response.data.annotations || [],
      richAnnotations: response.data.richAnnotations || [],
    };
  } catch (error: any) {
    console.error('Erro ao buscar anotações:', error);
    throw new Error('Falha ao carregar anotações');
  }
}

/**
 * Salva anotações com headers CORS-safe
 */
async function _saveAnnotations(
  essayId: string,
  payload: AnnotationsPayload
): Promise<void> {
  try {
    // Headers mínimos para evitar preflight
    const headers = {
      'Content-Type': 'application/json',
      // Authorization será adicionado automaticamente pelo interceptor
    };

    const response = await api.put(`/essays/${essayId}/annotations`, payload, {
      headers,
    });

    // Trata 204 como sucesso (alguns backends não retornam body)
    if (response.status === 204 || response.status === 200) {
      return;
    }

    throw new Error(`Status inesperado: ${response.status}`);
  } catch (error: any) {
    // Log específico para erros CORS
    if (
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('CORS') ||
      error.message?.includes('preflight')
    ) {
      console.warn(
        'Erro CORS detectado no saveAnnotations - verificar configuração do servidor:',
        error.message
      );
    } else {
      console.error('Erro ao salvar anotações:', error);
    }
    throw error;
  }
}

/**
 * Salva anotações com debounce
 */
export const saveAnnotations = debouncePromise(_saveAnnotations, 800);

/**
 * Cria uma nova anotação (se necessário no futuro)
 */
export async function createAnnotation(
  essayId: string,
  annotation: Annotation
): Promise<Annotation> {
  try {
    const response = await api.post(
      `/essays/${essayId}/annotations`,
      annotation
    );
    return response.data;
  } catch (error: any) {
    console.error('Erro ao criar anotação:', error);
    throw new Error('Falha ao criar anotação');
  }
}

/**
 * Hook para gerenciar estado otimista das anotações
 */
export function useOptimisticAnnotations(essayId: string) {
  const [state, setState] = useState<AnnotationsState>({
    annotations: [],
    richAnnotations: [],
    isOptimistic: false,
  });

  // Carrega anotações iniciais
  useEffect(() => {
    if (!essayId) return;

    getAnnotations(essayId)
      .then(data => {
        setState({
          annotations: data.annotations,
          richAnnotations: data.richAnnotations || [],
          isOptimistic: false,
          lastSaved: new Date(),
        });
      })
      .catch(error => {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
      });
  }, [essayId]);

  // Atualização otimista
  const updateOptimistic = useCallback(
    (annotations: Annotation[], richAnnotations?: Anno[]) => {
      // Salva estado atual para rollback
      stateCache.set(essayId, { ...state });

      // Atualiza UI imediatamente
      setState(prev => ({
        ...prev,
        annotations,
        richAnnotations: richAnnotations || prev.richAnnotations,
        isOptimistic: true,
        error: undefined,
      }));

      // Salva no servidor com debounce
      saveAnnotations(essayId, {
        annotations,
        richAnnotations: richAnnotations || state.richAnnotations,
      })
        .then(() => {
          setState(prev => ({
            ...prev,
            isOptimistic: false,
            lastSaved: new Date(),
          }));
        })
        .catch(error => {
          // Rollback em caso de erro
          const cachedState = stateCache.get(essayId);
          if (cachedState) {
            setState({
              ...cachedState,
              error: 'Não foi possível salvar anotações',
            });
          } else {
            setState(prev => ({
              ...prev,
              isOptimistic: false,
              error: 'Não foi possível salvar anotações',
            }));
          }

          // Limpa erro após 5 segundos
          setTimeout(() => {
            setState(prev => ({ ...prev, error: undefined }));
          }, 5000);
        });
    },
    [essayId, state]
  );

  // Força salvamento imediato (para submit)
  const forceSave = useCallback(async () => {
    if (state.isOptimistic) {
      // Cancela debounce e salva imediatamente
      const timeout = debounceTimeouts.get(essayId);
      if (timeout) {
        clearTimeout(timeout);
        debounceTimeouts.delete(essayId);
      }

      try {
        await _saveAnnotations(essayId, {
          annotations: state.annotations,
          richAnnotations: state.richAnnotations,
        });

        setState(prev => ({
          ...prev,
          isOptimistic: false,
          lastSaved: new Date(),
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao salvar anotações',
        }));
        throw error;
      }
    }
  }, [essayId, state]);

  return {
    ...state,
    updateOptimistic,
    forceSave,
  };
}

// Exporta funções individuais para compatibilidade
export { getAnnotations as getAnnotationsSync };
export { saveAnnotations as saveAnnotationsSync };
