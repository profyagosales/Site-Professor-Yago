/**
 * Net Debug - Instrumentação para diagnóstico de vazamentos de memória
 * 
 * Este módulo fornece funções para instrumentar e monitorar:
 * - Efeitos que disparam indefinidamente
 * - Intervals que não são limpos adequadamente
 * - Contadores de execução para identificar vazamentos
 */

/**
 * Log uma mensagem apenas uma vez por sessão
 * Útil para identificar efeitos que disparam múltiplas vezes
 */
export function logOnce(label: string) {
  const key = `__once__:${label}`;
  // @ts-ignore
  if (window[key]) return false;
  // @ts-ignore
  window[key] = true;
  // eslint-disable-next-line no-console
  console.info(`[once] ${label}`);
  return true;
}

/**
 * Conta quantas vezes uma função/efeito é executado
 * Útil para identificar loops infinitos ou efeitos que disparam demais
 */
export function count(label: string) {
  // eslint-disable-next-line no-console
  console.count(`[count] ${label}`);
}

/**
 * Envolve setInterval com logging para monitorar criação e limpeza
 * Retorna uma função de limpeza que deve ser chamada no cleanup do useEffect
 */
export function wrapInterval(fn: () => void, ms: number, label: string) {
  const id = setInterval(fn, ms);
  // eslint-disable-next-line no-console
  console.info(`[interval:start] ${label} id=${id} ms=${ms}`);
  return () => {
    clearInterval(id);
    // eslint-disable-next-line no-console
    console.info(`[interval:clear] ${label} id=${id}`);
  };
}

/**
 * Envolve setTimeout com logging para monitorar timers únicos
 */
export function wrapTimeout(fn: () => void, ms: number, label: string) {
  const id = setTimeout(fn, ms);
  // eslint-disable-next-line no-console
  console.info(`[timeout:start] ${label} id=${id} ms=${ms}`);
  return () => {
    clearTimeout(id);
    // eslint-disable-next-line no-console
  console.info(`[timeout:clear] ${label} id=${id}`);
  };
}

/**
 * Monitora a execução de funções assíncronas
 * Útil para identificar chamadas de API que disparam em loop
 */
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  label: string
): T {
  return (async (...args: any[]) => {
    count(`async:${label}`);
    try {
      const result = await fn(...args);
      // eslint-disable-next-line no-console
      console.info(`[async:success] ${label}`);
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[async:error] ${label}`, error);
      throw error;
    }
  }) as T;
}

/**
 * Monitora a execução de funções síncronas
 * Útil para identificar funções que são chamadas repetidamente
 */
export function wrapSync<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  return ((...args: any[]) => {
    count(`sync:${label}`);
    try {
      const result = fn(...args);
      // eslint-disable-next-line no-console
      console.info(`[sync:success] ${label}`);
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[sync:error] ${label}`, error);
      throw error;
    }
  }) as T;
}

/**
 * Monitora mudanças de estado em componentes
 * Útil para identificar re-renders desnecessários
 */
export function logStateChange(component: string, stateName: string, value: any) {
  // eslint-disable-next-line no-console
  console.info(`[state:change] ${component}.${stateName}`, value);
}

/**
 * Monitora a montagem e desmontagem de componentes
 * Útil para identificar componentes que montam/desmontam repetidamente
 */
export function logComponentLifecycle(component: string, action: 'mount' | 'unmount') {
  count(`component:${action}:${component}`);
  // eslint-disable-next-line no-console
  console.info(`[component:${action}] ${component}`);
}

/**
 * Monitora navegação entre rotas
 * Útil para identificar navegações em loop
 */
export function logNavigation(from: string, to: string) {
  count(`navigation:${from}->${to}`);
  // eslint-disable-next-line no-console
  console.info(`[navigation] ${from} -> ${to}`);
}

/**
 * Monitora chamadas de API
 * Útil para identificar requisições que disparam em loop
 */
export function logApiCall(method: string, url: string, status?: number) {
  const label = `api:${method}:${url}`;
  count(label);
  // eslint-disable-next-line no-console
  console.info(`[api:${status ? 'response' : 'request'}] ${method} ${url}${status ? ` ${status}` : ''}`);
}

/**
 * Limpa todos os contadores e flags de debug
 * Útil para resetar o estado de debug durante desenvolvimento
 */
export function clearDebugState() {
  // Limpar flags de logOnce
  Object.keys(window).forEach(key => {
    if (key.startsWith('__once__:')) {
      // @ts-ignore
      delete window[key];
    }
  });
  
  // Limpar console
  console.clear();
  
  // eslint-disable-next-line no-console
  console.info('[debug] Estado de debug limpo');
}

/**
 * Habilita/desabilita o debug globalmente
 */
let debugEnabled = true;

export function setDebugEnabled(enabled: boolean) {
  debugEnabled = enabled;
  // eslint-disable-next-line no-console
  console.info(`[debug] Debug ${enabled ? 'habilitado' : 'desabilitado'}`);
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Wrapper condicional que só executa se debug estiver habilitado
 */
export function debugOnly<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    if (debugEnabled) {
      return fn(...args);
    }
  }) as T;
}

// Exportar versões condicionais das funções principais
export const debugCount = debugOnly(count);
export const debugLogOnce = debugOnly(logOnce);
export const debugWrapInterval = debugOnly(wrapInterval);
export const debugWrapTimeout = debugOnly(wrapTimeout);
export const debugWrapAsync = debugOnly(wrapAsync);
export const debugWrapSync = debugOnly(wrapSync);
export const debugLogStateChange = debugOnly(logStateChange);
export const debugLogComponentLifecycle = debugOnly(logComponentLifecycle);
export const debugLogNavigation = debugOnly(logNavigation);
export const debugLogApiCall = debugOnly(logApiCall);
