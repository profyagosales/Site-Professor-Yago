/**
 * Sistema de Feature Flags e Kill Switches
 *
 * Permite ligar/desligar recursos em runtime sem redeploy.
 * Útil para incidentes, testes A/B e rollouts graduais.
 */

import React from 'react';

export interface FeatureFlags {
  pdf_inline_viewer: boolean;
  annotations_enabled: boolean;
  new_menu_styles: boolean;
}

// Flags padrão (fallback)
const DEFAULT_FLAGS: FeatureFlags = {
  pdf_inline_viewer: true,
  annotations_enabled: true,
  new_menu_styles: true,
};

// Chave para localStorage
const STORAGE_KEY = 'flags';

/**
 * Helper para acessar variáveis de ambiente de forma compatível com Jest
 */
function getEnvFlagValue(name: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = `VITE_FLAG_${name.toUpperCase()}`;
    return import.meta.env[envKey];
  }
  return undefined;
}

/**
 * Obtém o valor de uma flag específica
 *
 * Prioridade:
 * 1. localStorage['flags'] (JSON)
 * 2. import.meta.env (variáveis de ambiente)
 * 3. Valor padrão fornecido
 * 4. DEFAULT_FLAGS
 */
export function getFlag<K extends keyof FeatureFlags>(
  name: K,
  defaultValue: FeatureFlags[K] = DEFAULT_FLAGS[name]
): FeatureFlags[K] {
  try {
    // 1. Tentar ler do localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const flags = JSON.parse(stored) as Partial<FeatureFlags>;
      if (flags[name] !== undefined) {
        return flags[name] as FeatureFlags[K];
      }
    }
  } catch (error) {
    console.warn('Erro ao ler flags do localStorage:', error);
  }

  // 2. Tentar ler de variáveis de ambiente
  const envKey = `VITE_FLAG_${name.toUpperCase()}`;
  const envValue = getEnvFlagValue(name);
  if (envValue !== undefined) {
    // Converter string para boolean
    if (typeof defaultValue === 'boolean') {
      return (envValue === 'true' || envValue === '1') as FeatureFlags[K];
    }
    return envValue as FeatureFlags[K];
  }

  // 3. Retornar valor padrão
  return defaultValue;
}

/**
 * Define o valor de uma flag no localStorage
 *
 * @param name Nome da flag
 * @param value Novo valor
 */
export function setFlag<K extends keyof FeatureFlags>(
  name: K,
  value: FeatureFlags[K]
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const flags = stored ? (JSON.parse(stored) as Partial<FeatureFlags>) : {};

    flags[name] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));

    // Disparar evento customizado para notificar mudanças
    window.dispatchEvent(
      new CustomEvent('flagsChanged', {
        detail: { name, value },
      })
    );
  } catch (error) {
    console.error('Erro ao salvar flag no localStorage:', error);
  }
}

/**
 * Obtém todas as flags atuais
 */
export function getAllFlags(): FeatureFlags {
  const flags: Partial<FeatureFlags> = {};

  for (const key of Object.keys(DEFAULT_FLAGS) as Array<keyof FeatureFlags>) {
    flags[key] = getFlag(key);
  }

  return flags as FeatureFlags;
}

/**
 * Reseta todas as flags para os valores padrão
 */
export function resetFlags(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('flagsChanged', {
        detail: { reset: true },
      })
    );
  } catch (error) {
    console.error('Erro ao resetar flags:', error);
  }
}

/**
 * Hook para reatividade às mudanças de flags
 *
 * @param name Nome da flag
 * @param defaultValue Valor padrão
 * @returns [valor atual, setter, loading]
 */
export function useFlag<K extends keyof FeatureFlags>(
  name: K,
  defaultValue?: FeatureFlags[K]
): [FeatureFlags[K], (value: FeatureFlags[K]) => void, boolean] {
  const [value, setValue] = React.useState(() => getFlag(name, defaultValue));
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function handleFlagsChanged(event: CustomEvent) {
      const { name: changedName, reset } = event.detail;

      if (reset || changedName === name) {
        setLoading(true);
        const newValue = getFlag(name, defaultValue);
        setValue(newValue);

        // Simular um pequeno delay para mostrar loading
        setTimeout(() => setLoading(false), 100);
      }
    }

    window.addEventListener(
      'flagsChanged',
      handleFlagsChanged as EventListener
    );
    return () =>
      window.removeEventListener(
        'flagsChanged',
        handleFlagsChanged as EventListener
      );
  }, [name, defaultValue]);

  const setFlagValue = React.useCallback(
    (newValue: FeatureFlags[K]) => {
      setFlag(name, newValue);
    },
    [name]
  );

  return [value, setFlagValue, loading];
}

// Re-export para compatibilidade
export { getFlag as getFeatureFlag };
export { setFlag as setFeatureFlag };
