/**
 * Hook para gerenciar preferências do usuário no localStorage
 *
 * Funcionalidades:
 * - Armazenamento persistente de preferências
 * - Validação de valores
 * - Fallback para valores padrão
 * - Sincronização entre abas
 */

import { useCallback, useEffect, useState } from 'react';

export interface Preferences {
  pageSize: number;
  theme: 'light' | 'dark';
  language: string;
  [key: string]: any;
}

export interface UsePreferencesOptions {
  // Chave base para o localStorage
  key?: string;
  // Valores padrão
  defaults?: Partial<Preferences>;
  // Função para validar valores
  validate?: (key: string, value: any) => boolean;
  // Função para transformar valores ao carregar
  transform?: (key: string, value: any) => any;
}

export interface UsePreferencesReturn {
  // Preferências atuais
  preferences: Preferences;

  // Funções para manipular preferências
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => void;
  setPreferences: (updates: Partial<Preferences>) => void;
  removePreference: (key: keyof Preferences) => void;
  clearPreferences: () => void;

  // Funções utilitárias
  getPreference: <K extends keyof Preferences>(
    key: K
  ) => Preferences[K] | undefined;
  hasPreference: (key: keyof Preferences) => boolean;

  // Estado de loading
  isLoading: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  pageSize: 10,
  theme: 'light',
  language: 'pt-BR',
};

export function usePreferences(
  options: UsePreferencesOptions = {}
): UsePreferencesReturn {
  const {
    key = 'app_preferences',
    defaults = {},
    validate,
    transform,
  } = options;

  const [preferences, setPreferencesState] = useState<Preferences>({
    ...DEFAULT_PREFERENCES,
    ...defaults,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Função para carregar preferências do localStorage
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        const transformed: Preferences = {};

        Object.entries(parsed).forEach(([k, v]) => {
          const transformedValue = transform ? transform(k, v) : v;
          if (!validate || validate(k, transformedValue)) {
            transformed[k] = transformedValue;
          }
        });

        setPreferencesState(prev => ({ ...prev, ...transformed }));
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage', error);
    } finally {
      setIsLoading(false);
    }
  }, [key, validate, transform]);

  // Função para salvar preferências no localStorage
  const savePreferences = useCallback(
    (newPreferences: Preferences) => {
      try {
        localStorage.setItem(key, JSON.stringify(newPreferences));
      } catch (error) {
        console.warn('Failed to save preferences to localStorage', error);
      }
    },
    [key]
  );

  // Carrega preferências na inicialização
  useEffect(() => {
    loadPreferences();
  }, [key, validate, transform]);

  // Salva preferências quando mudam
  useEffect(() => {
    if (!isLoading) {
      savePreferences(preferences);
    }
  }, [preferences, savePreferences, isLoading]);

  // Escuta mudanças no localStorage de outras abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newPreferences = JSON.parse(e.newValue);
          setPreferencesState(prev => ({ ...prev, ...newPreferences }));
        } catch (error) {
          console.warn('Failed to parse preferences from storage event', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // Função para definir uma preferência
  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      if (validate && !validate(key, value)) {
        console.warn(`Invalid value for preference ${key}:`, value);
        return;
      }

      setPreferencesState(prev => ({ ...prev, [key]: value }));
    },
    [validate]
  );

  // Função para definir múltiplas preferências
  const setPreferences = useCallback(
    (updates: Partial<Preferences>) => {
      const validatedUpdates: Partial<Preferences> = {};

      Object.entries(updates).forEach(([k, v]) => {
        if (!validate || validate(k, v)) {
          validatedUpdates[k] = v;
        } else {
          console.warn(`Invalid value for preference ${k}:`, v);
        }
      });

      setPreferencesState(prev => ({ ...prev, ...validatedUpdates }));
    },
    [validate]
  );

  // Função para remover uma preferência
  const removePreference = useCallback((key: keyof Preferences) => {
    setPreferencesState(prev => {
      const newPreferences = { ...prev };
      delete newPreferences[key];
      return newPreferences;
    });
  }, []);

  // Função para limpar todas as preferências
  const clearPreferences = useCallback(() => {
    setPreferencesState({ ...DEFAULT_PREFERENCES, ...defaults });
  }, [defaults]);

  // Função para obter uma preferência
  const getPreference = useCallback(
    <K extends keyof Preferences>(key: K): Preferences[K] | undefined => {
      return preferences[key];
    },
    [preferences]
  );

  // Função para verificar se uma preferência existe
  const hasPreference = useCallback(
    (key: keyof Preferences): boolean => {
      return key in preferences && preferences[key] !== undefined;
    },
    [preferences]
  );

  return {
    preferences,
    setPreference,
    setPreferences,
    removePreference,
    clearPreferences,
    getPreference,
    hasPreference,
    isLoading,
  };
}

/**
 * Hook especializado para preferências de lista
 */
export function useListPreferences() {
  const { preferences, setPreference, isLoading } = usePreferences({
    key: 'list_preferences',
    defaults: {
      pageSize: 10,
    },
    validate: (key, value) => {
      switch (key) {
        case 'pageSize':
          return typeof value === 'number' && value > 0 && value <= 100;
        default:
          return true;
      }
    },
  });

  return {
    pageSize: preferences.pageSize || 10,
    setPageSize: (pageSize: number) => setPreference('pageSize', pageSize),
    isLoading,
  };
}
