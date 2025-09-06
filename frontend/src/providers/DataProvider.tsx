/**
 * Data Provider - Controle Global de Revalidações
 * 
 * Este provider controla as revalidações de dados globalmente para evitar
 * picos de rede ao abrir DevTools ou alternar abas.
 * 
 * Características:
 * - Desabilita revalidação no foco por padrão
 * - Mantém revalidação na reconexão
 * - Permite ativação local onde necessário
 * - Configuração centralizada
 * - Performance otimizada
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

// Configurações globais de revalidação
export interface DataProviderConfig {
  // Revalidação no foco da janela (desabilitado por padrão)
  refetchOnWindowFocus: boolean;
  // Revalidação na reconexão (habilitado por padrão)
  refetchOnReconnect: boolean;
  // Revalidação no mount (habilitado por padrão)
  refetchOnMount: boolean;
  // TTL padrão para cache (30 segundos)
  defaultTtlMs: number;
  // Debug de revalidações
  enableDebugLogging: boolean;
}

// Configuração padrão otimizada
const DEFAULT_CONFIG: DataProviderConfig = {
  refetchOnWindowFocus: false, // Desabilitado para evitar picos de rede
  refetchOnReconnect: true,    // Habilitado para sincronizar dados
  refetchOnMount: true,        // Habilitado para dados frescos
  defaultTtlMs: 30000,         // 30 segundos
  enableDebugLogging: import.meta.env.DEV || localStorage.getItem('debug') === '1',
};

// Context para configurações
const DataProviderContext = createContext<DataProviderConfig>(DEFAULT_CONFIG);

// Hook para acessar configurações
export function useDataConfig(): DataProviderConfig {
  return useContext(DataProviderContext);
}

// Hook para configurações específicas de revalidação
export function useRevalidationConfig() {
  const config = useDataConfig();
  
  return useMemo(() => ({
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnReconnect: config.refetchOnReconnect,
    refetchOnMount: config.refetchOnMount,
  }), [config]);
}

// Hook para debug de revalidações
export function useRevalidationDebug() {
  const config = useDataConfig();
  
  const logRevalidation = React.useCallback((source: string, key: string, reason: string) => {
    if (config.enableDebugLogging) {
      console.info(`[DataRevalidation] ${source}: ${key} - ${reason}`);
    }
  }, [config.enableDebugLogging]);
  
  return { logRevalidation };
}

// Provider principal
interface DataProviderProps {
  children: ReactNode;
  config?: Partial<DataProviderConfig>;
}

export function DataProvider({ children, config: customConfig }: DataProviderProps) {
  // Merge da configuração customizada com a padrão
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...customConfig,
  }), [customConfig]);

  // Log de configuração em desenvolvimento
  React.useEffect(() => {
    if (config.enableDebugLogging) {
      console.info('[DataProvider] Configuração carregada:', {
        refetchOnWindowFocus: config.refetchOnWindowFocus,
        refetchOnReconnect: config.refetchOnReconnect,
        refetchOnMount: config.refetchOnMount,
        defaultTtlMs: config.defaultTtlMs,
      });
    }
  }, [config]);

  return (
    <DataProviderContext.Provider value={config}>
      {children}
    </DataProviderContext.Provider>
  );
}

// Hook para configurações específicas de cache
export function useCacheConfig() {
  const config = useDataConfig();
  
  return useMemo(() => ({
    defaultTtlMs: config.defaultTtlMs,
    enableDebugLogging: config.enableDebugLogging,
  }), [config]);
}

// Hook para ativar revalidação localmente
export function useLocalRevalidation(
  key: string,
  localConfig?: Partial<Pick<DataProviderConfig, 'refetchOnWindowFocus' | 'refetchOnReconnect' | 'refetchOnMount'>>
) {
  const globalConfig = useDataConfig();
  const { logRevalidation } = useRevalidationDebug();
  
  // Merge da configuração local com a global
  const config = useMemo(() => ({
    refetchOnWindowFocus: localConfig?.refetchOnWindowFocus ?? globalConfig.refetchOnWindowFocus,
    refetchOnReconnect: localConfig?.refetchOnReconnect ?? globalConfig.refetchOnReconnect,
    refetchOnMount: localConfig?.refetchOnMount ?? globalConfig.refetchOnMount,
  }), [localConfig, globalConfig]);
  
  // Log quando configuração local sobrescreve a global
  React.useEffect(() => {
    if (localConfig && globalConfig.enableDebugLogging) {
      const overrides = Object.entries(localConfig).filter(([key, value]) => 
        value !== undefined && value !== globalConfig[key as keyof DataProviderConfig]
      );
      
      if (overrides.length > 0) {
        console.info(`[DataRevalidation] Configuração local para ${key}:`, overrides);
      }
    }
  }, [localConfig, globalConfig]);
  
  return {
    config,
    logRevalidation: React.useCallback((reason: string) => logRevalidation('Local', key, reason), [logRevalidation, key]),
  };
}

// Hook para monitorar revalidações
export function useRevalidationMonitor() {
  const config = useDataConfig();
  const [revalidationCount, setRevalidationCount] = React.useState(0);
  const [lastRevalidation, setLastRevalidation] = React.useState<Date | null>(null);
  
  const logRevalidation = React.useCallback((source: string, key: string, reason: string) => {
    if (config.enableDebugLogging) {
      setRevalidationCount(prev => prev + 1);
      setLastRevalidation(new Date());
      console.info(`[DataRevalidation] ${source}: ${key} - ${reason}`);
    }
  }, [config.enableDebugLogging]);
  
  const resetCount = React.useCallback(() => {
    setRevalidationCount(0);
    setLastRevalidation(null);
  }, []);
  
  return {
    revalidationCount,
    lastRevalidation,
    logRevalidation,
    resetCount,
  };
}

// Componente para debug de revalidações (apenas em desenvolvimento)
export function RevalidationDebugger() {
  const config = useDataConfig();
  const { revalidationCount, lastRevalidation, resetCount } = useRevalidationMonitor();
  
  if (!config.enableDebugLogging) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono">
      <div className="space-y-1">
        <div className="font-bold">Data Revalidation Debug</div>
        <div>Count: {revalidationCount}</div>
        <div>Last: {lastRevalidation?.toLocaleTimeString() || 'Never'}</div>
        <button
          onClick={resetCount}
          className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Exportar configurações padrão para uso externo
export { DEFAULT_CONFIG };
