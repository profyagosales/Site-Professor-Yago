/**
 * Analytics Singleton - Previne injeção múltipla de scripts de analytics
 * 
 * Este módulo garante que scripts de analytics (Plausible, Vercel, Zoho, etc.)
 * sejam injetados apenas uma vez, mesmo com múltiplos renders ou navegação.
 * 
 * Uso:
 * - Chame loadAnalyticsOnce() apenas no main.tsx ou layout raiz
 * - Para banner de consentimento, chame após aceite, mas ainda via loadAnalyticsOnce()
 * - O guard interno previne injeções duplicadas
 */

// Guard para prevenir injeção múltipla
let loaded = false;
let loading = false;

// Configurações de analytics (pode ser movido para env vars)
const ANALYTICS_CONFIG = {
  // Plausible Analytics
  plausible: {
    enabled: import.meta.env.VITE_PLAUSIBLE_ENABLED === 'true',
    domain: import.meta.env.VITE_PLAUSIBLE_DOMAIN || 'site-professor-yago.vercel.app',
    scriptSrc: 'https://plausible.io/js/script.js',
  },
  // Vercel Analytics
  vercel: {
    enabled: import.meta.env.VITE_VERCEL_ANALYTICS_ENABLED === 'true',
    scriptSrc: 'https://va.vercel-scripts.com/v1/script.debug.js',
  },
  // Zoho Analytics (exemplo)
  zoho: {
    enabled: import.meta.env.VITE_ZOHO_ANALYTICS_ENABLED === 'true',
    scriptSrc: 'https://cdn.zoho.com/analytics/analytics.js',
  },
  // Google Analytics 4
  ga4: {
    enabled: import.meta.env.VITE_GA4_ENABLED === 'true',
    measurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID,
    scriptSrc: 'https://www.googletagmanager.com/gtag/js',
  },
};

/**
 * Injeta um script de analytics no DOM
 */
function injectScript(src: string, async = true, defer = true): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já existe
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      console.info('[analytics] Script já existe:', src);
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    
    script.onload = () => {
      console.info('[analytics] Script carregado:', src);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('[analytics] Erro ao carregar script:', src, error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Injeta Google Analytics 4
 */
function injectGA4(measurementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já existe
    const existingScript = document.querySelector(`script[src*="googletagmanager.com"]`);
    if (existingScript) {
      console.info('[analytics] Google Analytics já existe');
      resolve();
      return;
    }

    // Carregar script do GA4
    const script = document.createElement('script');
    script.src = `${ANALYTICS_CONFIG.ga4.scriptSrc}?id=${measurementId}`;
    script.async = true;
    
    script.onload = () => {
      // Configurar gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      (window as any).gtag = gtag;
      
      gtag('js', new Date());
      gtag('config', measurementId, {
        page_title: document.title,
        page_location: window.location.href,
      });
      
      console.info('[analytics] Google Analytics configurado:', measurementId);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('[analytics] Erro ao carregar Google Analytics:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Injeta Plausible Analytics
 */
function injectPlausible(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já existe
    const existingScript = document.querySelector(`script[src*="plausible.io"]`);
    if (existingScript) {
      console.info('[analytics] Plausible já existe');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = ANALYTICS_CONFIG.plausible.scriptSrc;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-domain', domain);
    
    script.onload = () => {
      // Configurar Plausible
      (window as any).plausible = (window as any).plausible || function() {
        ((window as any).plausible.q = (window as any).plausible.q || []).push(arguments);
      };
      
      console.info('[analytics] Plausible configurado para domínio:', domain);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('[analytics] Erro ao carregar Plausible:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Injeta Vercel Analytics
 */
function injectVercelAnalytics(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já existe
    const existingScript = document.querySelector(`script[src*="vercel-scripts.com"]`);
    if (existingScript) {
      console.info('[analytics] Vercel Analytics já existe');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = ANALYTICS_CONFIG.vercel.scriptSrc;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.info('[analytics] Vercel Analytics configurado');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('[analytics] Erro ao carregar Vercel Analytics:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Injeta Zoho Analytics
 */
function injectZohoAnalytics(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já existe
    const existingScript = document.querySelector(`script[src*="zoho.com"]`);
    if (existingScript) {
      console.info('[analytics] Zoho Analytics já existe');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = ANALYTICS_CONFIG.zoho.scriptSrc;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.info('[analytics] Zoho Analytics configurado');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('[analytics] Erro ao carregar Zoho Analytics:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Carrega todos os analytics habilitados
 */
async function loadAllAnalytics(): Promise<void> {
  const promises: Promise<void>[] = [];

  // Google Analytics 4
  if (ANALYTICS_CONFIG.ga4.enabled && ANALYTICS_CONFIG.ga4.measurementId) {
    promises.push(injectGA4(ANALYTICS_CONFIG.ga4.measurementId));
  }

  // Plausible Analytics
  if (ANALYTICS_CONFIG.plausible.enabled) {
    promises.push(injectPlausible(ANALYTICS_CONFIG.plausible.domain));
  }

  // Vercel Analytics
  if (ANALYTICS_CONFIG.vercel.enabled) {
    promises.push(injectVercelAnalytics());
  }

  // Zoho Analytics
  if (ANALYTICS_CONFIG.zoho.enabled) {
    promises.push(injectZohoAnalytics());
  }

  // Aguardar todos os scripts carregarem
  try {
    await Promise.allSettled(promises);
    console.info('[analytics] Todos os analytics carregados');
  } catch (error) {
    console.warn('[analytics] Alguns analytics falharam ao carregar:', error);
  }
}

/**
 * Função principal - carrega analytics apenas uma vez
 * 
 * @param force - Força recarregamento mesmo se já carregado
 * @returns Promise<boolean> - true se carregou, false se já estava carregado
 */
export async function loadAnalyticsOnce(force = false): Promise<boolean> {
  // Verificar se já foi carregado
  if (loaded && !force) {
    console.info('[analytics] Analytics já carregado, ignorando');
    return false;
  }

  // Verificar se está carregando
  if (loading) {
    console.info('[analytics] Analytics já está carregando, aguardando...');
    // Aguardar o carregamento atual
    while (loading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return loaded;
  }

  // Marcar como carregando
  loading = true;

  try {
    console.info('[analytics] Iniciando carregamento de analytics...');
    
    // Verificar se há pelo menos um analytics habilitado
    const hasEnabledAnalytics = Object.values(ANALYTICS_CONFIG).some(config => config.enabled);
    
    if (!hasEnabledAnalytics) {
      console.info('[analytics] Nenhum analytics habilitado, pulando carregamento');
      loaded = true;
      return false;
    }

    // Carregar todos os analytics
    await loadAllAnalytics();
    
    // Marcar como carregado
    loaded = true;
    console.info('[once] analytics loaded');
    
    return true;
  } catch (error) {
    console.error('[analytics] Erro ao carregar analytics:', error);
    loading = false;
    throw error;
  } finally {
    loading = false;
  }
}

/**
 * Verifica se analytics já foi carregado
 */
export function isAnalyticsLoaded(): boolean {
  return loaded;
}

/**
 * Reseta o estado (apenas para testes)
 */
export function resetAnalyticsState(): void {
  loaded = false;
  loading = false;
  console.info('[analytics] Estado resetado');
}

/**
 * Força recarregamento de analytics
 */
export async function reloadAnalytics(): Promise<boolean> {
  console.info('[analytics] Forçando recarregamento...');
  return loadAnalyticsOnce(true);
}

// Declarações de tipos para TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    plausible: (...args: any[]) => void;
  }
}
