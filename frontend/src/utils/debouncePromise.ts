/**
 * Utilitário debouncePromise para coalescer múltiplas chamadas de função
 *
 * Útil para evitar "tempestades" de requisições durante edição rápida
 * de anotações, formulários, etc.
 */

/**
 * Cria uma versão com debounce de uma função que retorna Promise
 *
 * @param fn Função original que retorna Promise
 * @param delay Delay em milissegundos (padrão: 800ms)
 * @returns Função com debounce aplicado
 */
export function debouncePromise<T extends any[]>(
  fn: (...args: T) => Promise<any>,
  delay: number = 800
) {
  // Cache de timeouts por chave (primeiro argumento)
  const timeouts = new Map<string, NodeJS.Timeout>();

  // Cache de promises pendentes para evitar requisições duplicadas
  const pendingRequests = new Map<string, Promise<any>>();

  return (...args: T): Promise<any> => {
    const key = String(args[0]); // Usa primeiro argumento como chave

    // Cancela timeout anterior se existir
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }

    // Se já há uma requisição pendente, retorna ela
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await fn(...args);
          pendingRequests.delete(key);
          resolve(result);
        } catch (error) {
          pendingRequests.delete(key);
          reject(error);
        }
      }, delay);

      timeouts.set(key, timeout);
    });
  };
}

/**
 * Cria um debouncePromise com configurações específicas
 *
 * @param config Configurações do debounce
 * @returns Função factory para criar debounced functions
 */
export function createDebouncePromise(config: {
  delay?: number;
  maxPending?: number;
}) {
  const { delay = 800, maxPending = 10 } = config;

  return function debouncePromise<T extends any[]>(
    fn: (...args: T) => Promise<any>
  ) {
    const timeouts = new Map<string, NodeJS.Timeout>();
    const pendingRequests = new Map<string, Promise<any>>();

    return (...args: T): Promise<any> => {
      const key = String(args[0]);

      // Limita número de requisições pendentes
      if (pendingRequests.size >= maxPending) {
        console.warn(`Máximo de ${maxPending} requisições pendentes atingido`);
        return Promise.reject(new Error('Muitas requisições pendentes'));
      }

      // Cancela timeout anterior
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key)!);
      }

      // Retorna promise pendente se existir
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!;
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(async () => {
          try {
            const result = await fn(...args);
            pendingRequests.delete(key);
            resolve(result);
          } catch (error) {
            pendingRequests.delete(key);
            reject(error);
          }
        }, delay);

        timeouts.set(key, timeout);
      });
    };
  };
}

/**
 * Utilitário para limpar todos os timeouts e promises pendentes
 * Útil para cleanup em componentes que são desmontados
 */
export class DebounceManager {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private pendingRequests = new Map<string, Promise<any>>();

  debounce<T extends any[]>(
    fn: (...args: T) => Promise<any>,
    delay: number = 800
  ) {
    return (...args: T): Promise<any> => {
      const key = String(args[0]);

      // Cancela timeout anterior
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key)!);
      }

      // Retorna promise pendente se existir
      if (this.pendingRequests.has(key)) {
        return this.pendingRequests.get(key)!;
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(async () => {
          try {
            const result = await fn(...args);
            this.pendingRequests.delete(key);
            resolve(result);
          } catch (error) {
            this.pendingRequests.delete(key);
            reject(error);
          }
        }, delay);

        this.timeouts.set(key, timeout);
      });
    };
  }

  /**
   * Cancela todos os timeouts e promises pendentes
   */
  cleanup() {
    // Cancela todos os timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Limpa promises pendentes (elas falharão naturalmente)
    this.pendingRequests.clear();
  }

  /**
   * Cancela timeouts e promises para uma chave específica
   */
  cancel(key: string) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key)!);
      this.timeouts.delete(key);
    }
    this.pendingRequests.delete(key);
  }
}
