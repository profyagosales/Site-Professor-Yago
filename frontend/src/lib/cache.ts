/**
 * Sistema de cache leve com stale-while-revalidate
 *
 * Características:
 * - TTL configurável (default 30s)
 * - In-memory + opcional sessionStorage
 * - Stale-while-revalidate pattern
 * - Subscrições para invalidação
 * - Sem dependências externas
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  isStale: boolean;
}

export interface CacheOptions {
  ttlMs?: number;
  useSessionStorage?: boolean;
  maxSize?: number;
}

export interface CacheSubscription {
  unsubscribe: () => void;
}

class CacheManager {
  private memory = new Map<string, CacheEntry>();
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttlMs: options.ttlMs || 30000, // 30s default
      useSessionStorage: options.useSessionStorage || false,
      maxSize: options.maxSize || 100,
    };
  }

  /**
   * Obtém dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.memory.delete(key);
      return null;
    }

    // Marca como stale se passou da metade do TTL
    const isStale = now - entry.timestamp > entry.ttl / 2;
    if (isStale && !entry.isStale) {
      entry.isStale = true;
    }

    return entry.data;
  }

  /**
   * Define dados no cache
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.options.ttlMs;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      isStale: false,
    };

    this.memory.set(key, entry);

    // Limita tamanho do cache
    if (this.memory.size > this.options.maxSize) {
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
    }

    // Notifica subscritores
    this.notifySubscribers(key, data);

    // Salva no sessionStorage se habilitado
    if (this.options.useSessionStorage) {
      try {
        sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to save to sessionStorage:', error);
      }
    }
  }

  /**
   * Verifica se o cache tem dados frescos
   */
  hasFresh(key: string): boolean {
    const entry = this.memory.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    const isStale = now - entry.timestamp > entry.ttl / 2;

    return !isExpired && !isStale;
  }

  /**
   * Verifica se o cache tem dados (mesmo que stale)
   */
  has(key: string): boolean {
    const entry = this.memory.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    return !isExpired;
  }

  /**
   * Verifica se os dados estão stale
   */
  isStale(key: string): boolean {
    const entry = this.memory.get(key);
    if (!entry) {
      return true;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    const isStale = now - entry.timestamp > entry.ttl / 2;

    return isExpired || isStale;
  }

  /**
   * Subcreve para mudanças em uma chave
   */
  subscribe<T>(key: string, callback: (data: T) => void): CacheSubscription {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }

    this.subscriptions.get(key)!.add(callback);

    return {
      unsubscribe: () => {
        const subs = this.subscriptions.get(key);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) {
            this.subscriptions.delete(key);
          }
        }
      },
    };
  }

  /**
   * Remove uma chave do cache
   */
  delete(key: string): void {
    this.memory.delete(key);

    // Remove do sessionStorage se habilitado
    if (this.options.useSessionStorage) {
      try {
        sessionStorage.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn('Failed to remove from sessionStorage:', error);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.memory.clear();

    // Limpa sessionStorage se habilitado
    if (this.options.useSessionStorage) {
      try {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const now = Date.now();
    let freshCount = 0;
    let staleCount = 0;
    let expiredCount = 0;

    for (const entry of this.memory.values()) {
      const isExpired = now - entry.timestamp > entry.ttl;
      const isStale = now - entry.timestamp > entry.ttl / 2;

      if (isExpired) {
        expiredCount++;
      } else if (isStale) {
        staleCount++;
      } else {
        freshCount++;
      }
    }

    return {
      total: this.memory.size,
      fresh: freshCount,
      stale: staleCount,
      expired: expiredCount,
    };
  }

  /**
   * Notifica subscritores
   */
  private notifySubscribers(key: string, data: any): void {
    const subs = this.subscriptions.get(key);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Error in cache subscription callback:', error);
        }
      });
    }
  }

  /**
   * Carrega dados do sessionStorage na inicialização
   */
  loadFromSessionStorage(): void {
    if (!this.options.useSessionStorage) {
      return;
    }

    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const cacheKey = key.replace('cache_', '');
          const entryData = sessionStorage.getItem(key);
          if (entryData) {
            const entry = JSON.parse(entryData) as CacheEntry;
            // Verifica se ainda é válido
            const now = Date.now();
            if (now - entry.timestamp <= entry.ttl) {
              this.memory.set(cacheKey, entry);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to load from sessionStorage:', error);
    }
  }
}

// Instância global do cache
const cache = new CacheManager({
  ttlMs: 30000, // 30s default
  useSessionStorage: true,
  maxSize: 100,
});

// Carrega dados do sessionStorage na inicialização
cache.loadFromSessionStorage();

export default cache;

// Funções de conveniência
export const getCache = <T>(key: string): T | null => cache.get<T>(key);
export const setCache = <T>(key: string, data: T, ttlMs?: number): void =>
  cache.set(key, data, ttlMs);
export const hasFreshCache = (key: string): boolean => cache.hasFresh(key);
export const hasCache = (key: string): boolean => cache.has(key);
export const isStaleCache = (key: string): boolean => cache.isStale(key);
export const subscribeCache = <T>(
  key: string,
  callback: (data: T) => void
): CacheSubscription => cache.subscribe(key, callback);
export const deleteCache = (key: string): void => cache.delete(key);
export const clearCache = (): void => cache.clear();
export const getCacheStats = () => cache.getStats();
