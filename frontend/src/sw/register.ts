/**
 * Service Worker Registration - Idempotent
 * 
 * Este módulo garante que o Service Worker seja registrado apenas uma vez,
 * evitando loops de reload e registros duplicados.
 * 
 * Características:
 * - Registro idempotente (apenas uma vez)
 * - Toast manual para atualizações (sem auto-reload)
 * - Guard para evitar registros duplicados
 * - Tratamento de erros robusto
 * - Logging para debugging
 */

import { toast } from '@/components/ui/toast-provider';
import { wrapInterval } from '@/lib/net-debug';

/**
 * Registra o Service Worker uma única vez (Patch 3)
 * Remove o reload automático que causa recarregamentos constantes
 */
export function registerSWOnce() {
  if (!('serviceWorker' in navigator)) return;
  
  // evita múltiplos registros
  if ((navigator as any).__SW_REGISTERED__) return;
  (navigator as any).__SW_REGISTERED__ = true;
  
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // NÃO dê reload automático; ofereça UI de atualização se quiser
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // estados: installing -> installed -> activated
        // aqui não fazemos reload; opcional: emitir evento global p/ toast
        if (installing.state === 'installed') {
          // Emitir evento global para toast de atualização (opcional)
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });
  }).catch(() => {});
}

// Estado do Service Worker
let isRegistered = false;
let registration: ServiceWorkerRegistration | null = null;
let updateAvailable = false;

// Configurações
const SW_CONFIG = {
  scriptURL: '/sw.js',
  scope: '/',
  updateCheckInterval: 60000, // 1 minuto
  enableLogging: import.meta.env.DEV || localStorage.getItem('debug') === '1',
};

/**
 * Log de debug para Service Worker
 */
function log(message: string, ...args: any[]) {
  if (SW_CONFIG.enableLogging) {
    console.info(`[SW] ${message}`, ...args);
  }
}

/**
 * Verifica se Service Worker é suportado
 */
function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Verifica se já há um controlador ativo
 */
function hasActiveController(): boolean {
  return navigator.serviceWorker.controller !== null;
}

/**
 * Verifica se já foi registrado
 */
function isAlreadyRegistered(): boolean {
  return isRegistered || registration !== null;
}

/**
 * Registra o Service Worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    log('Service Worker não é suportado neste navegador');
    return null;
  }

  if (isAlreadyRegistered()) {
    log('Service Worker já foi registrado');
    return registration;
  }

  if (hasActiveController()) {
    log('Já há um controlador ativo, não registrando novamente');
    isRegistered = true;
    return null;
  }

  try {
    log('Registrando Service Worker...');
    
    registration = await navigator.serviceWorker.register(SW_CONFIG.scriptURL, {
      scope: SW_CONFIG.scope,
    });

    isRegistered = true;
    log('Service Worker registrado com sucesso:', registration);

    // Configurar listeners
    setupServiceWorkerListeners(registration);

    return registration;
  } catch (error) {
    log('Erro ao registrar Service Worker:', error);
    return null;
  }
}

/**
 * Configura listeners do Service Worker
 */
function setupServiceWorkerListeners(reg: ServiceWorkerRegistration) {
  // Listener para atualizações
  reg.addEventListener('updatefound', () => {
    log('Nova versão do Service Worker encontrada');
    
    const newWorker = reg.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // Há uma nova versão disponível
          log('Nova versão instalada, mostrando toast de atualização');
          showUpdateToast();
        } else {
          // Primeira instalação
          log('Service Worker instalado pela primeira vez');
        }
      }
    });
  });

  // Listener para controle
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    log('Controlador do Service Worker mudou');
    // Não fazer reload automático
  });

  // Listener para mensagens
  navigator.serviceWorker.addEventListener('message', (event) => {
    log('Mensagem recebida do Service Worker:', event.data);
    
    if (event.data?.type === 'SKIP_WAITING') {
      log('Service Worker solicitou skip waiting');
      // Não fazer reload automático
    }
  });
}

/**
 * Mostra toast de atualização disponível
 */
function showUpdateToast() {
  if (updateAvailable) {
    log('Toast de atualização já foi mostrado');
    return;
  }

  updateAvailable = true;

  toast({
    title: 'Nova versão disponível',
    description: 'Uma nova versão do aplicativo está disponível. Deseja atualizar?',
    type: 'info',
    duration: 0, // Não desaparece automaticamente
    action: {
      label: 'Atualizar',
      onClick: () => {
        log('Usuário clicou em atualizar');
        handleManualUpdate();
      },
    },
    dismissible: true,
  });
}

/**
 * Atualiza manualmente o aplicativo
 */
async function handleManualUpdate() {
  if (!registration) {
    log('Nenhum registro de Service Worker encontrado');
    return;
  }

  try {
    log('Iniciando atualização manual...');
    
    // Verificar se há worker esperando
    if (registration.waiting) {
      log('Enviando mensagem para skip waiting');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // NÃO recarregar automaticamente (Patch 3)
    // O usuário pode recarregar manualmente se desejar
    log('Atualização manual concluída - sem reload automático');

  } catch (error) {
    log('Erro durante atualização manual:', error);
    toast({
      title: 'Erro na atualização',
      description: 'Ocorreu um erro ao atualizar o aplicativo. Tente novamente.',
      type: 'error',
    });
  }
}

/**
 * Verifica se há atualizações disponíveis
 */
async function checkForUpdates(): Promise<boolean> {
  if (!registration) {
    log('Nenhum registro para verificar atualizações');
    return false;
  }

  try {
    log('Verificando atualizações...');
    await registration.update();
    return true;
  } catch (error) {
    log('Erro ao verificar atualizações:', error);
    return false;
  }
}

/**
 * Força atualização do Service Worker
 */
async function forceUpdate(): Promise<boolean> {
  if (!registration) {
    log('Nenhum registro para forçar atualização');
    return false;
  }

  try {
    log('Forçando atualização do Service Worker...');
    
    // Unregister e registrar novamente
    await registration.unregister();
    isRegistered = false;
    registration = null;
    
    // Registrar novamente
    const newReg = await registerServiceWorker();
    return newReg !== null;
  } catch (error) {
    log('Erro ao forçar atualização:', error);
    return false;
  }
}

/**
 * Obtém informações do Service Worker
 */
function getServiceWorkerInfo() {
  return {
    isSupported: isServiceWorkerSupported(),
    isRegistered: isRegistered,
    hasController: hasActiveController(),
    registration: registration,
    updateAvailable: updateAvailable,
  };
}

/**
 * Função principal - registra Service Worker de forma idempotente
 */
export async function registerServiceWorkerOnce(): Promise<boolean> {
  log('Iniciando registro idempotente do Service Worker...');

  // Verificar suporte
  if (!isServiceWorkerSupported()) {
    log('Service Worker não é suportado');
    return false;
  }

  // Verificar se já foi registrado
  if (isAlreadyRegistered()) {
    log('Service Worker já foi registrado anteriormente');
    return true;
  }

  // Verificar se já há controlador ativo
  if (hasActiveController()) {
    log('Já há um controlador ativo, não registrando');
    isRegistered = true;
    return true;
  }

  // Registrar Service Worker
  const reg = await registerServiceWorker();
  return reg !== null;
}

/**
 * Inicia verificação periódica de atualizações
 */
export function startUpdateChecker(): void {
  if (!registration) {
    log('Nenhum registro para verificar atualizações');
    return;
  }

  log('Iniciando verificação periódica de atualizações...');
  
  const clearUpdateChecker = wrapInterval(async () => {
    await checkForUpdates();
  }, SW_CONFIG.updateCheckInterval, 'SW/update-checker');
  
  // Armazenar a função de limpeza para uso futuro
  (window as any).__swUpdateCheckerCleanup = clearUpdateChecker;
}

/**
 * Para verificação periódica de atualizações
 */
export function stopUpdateChecker(): void {
  log('Parando verificação periódica de atualizações...');
  
  // Usar a função de limpeza armazenada
  const cleanup = (window as any).__swUpdateCheckerCleanup;
  if (cleanup && typeof cleanup === 'function') {
    cleanup();
    delete (window as any).__swUpdateCheckerCleanup;
    log('Verificação periódica de atualizações parada com sucesso');
  } else {
    log('Nenhuma verificação periódica ativa para parar');
  }
}

/**
 * API pública para controle do Service Worker
 */
export const serviceWorkerAPI = {
  register: registerServiceWorkerOnce,
  checkForUpdates,
  forceUpdate,
  getInfo: getServiceWorkerInfo,
  startUpdateChecker,
  stopUpdateChecker,
  showUpdateToast,
  handleManualUpdate,
};

// Exportar funções individuais para compatibilidade
export {
  checkForUpdates,
  forceUpdate,
  getServiceWorkerInfo,
  showUpdateToast,
  handleManualUpdate,
};
