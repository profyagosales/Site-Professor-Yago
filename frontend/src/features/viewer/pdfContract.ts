/**
 * Contrato do PDF Viewer
 *
 * Define a interface e funcionalidades para carregamento seguro de PDFs
 * com verificação de worker, detecção de suporte inline e fallbacks.
 */

import { logger } from '@/lib/logger';

// Configuração da API
function getApiBaseUrl(): string {
  // Em ambiente de teste, sempre usar localhost
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    return 'http://localhost:5050';
  }

  // Em produção, usar variável de ambiente se disponível
  // Fallback para localhost em desenvolvimento
  return 'http://localhost:5050';
}

/**
 * Constrói a URL do PDF com token de autenticação
 *
 * @param essayId ID da redação
 * @param token Token de autenticação (opcional)
 * @returns URL completa do arquivo PDF
 */
export function buildPdfUrl(essayId: string, token?: string): string {
  const baseUrl = `${getApiBaseUrl()}/essays/${essayId}/file`;

  if (token) {
    return `${baseUrl}?t=${encodeURIComponent(token)}`;
  }

  return baseUrl;
}

/**
 * Verifica se o worker do PDF está disponível
 *
 * @returns Promise<boolean> - true se o worker está acessível
 */
export async function isWorkerReady(): Promise<boolean> {
  try {
    const response = await fetch('/viewer/pdf.worker.mjs', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    const isReady = response.ok;

    logger.info('PDF worker check', {
      component: 'pdfContract',
      action: 'workerCheck',
      ready: isReady,
      status: response.status,
    });

    return isReady;
  } catch (error) {
    logger.warn('PDF worker check failed', {
      component: 'pdfContract',
      action: 'workerCheck',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Verifica se o dispositivo suporta visualização inline de PDF
 *
 * @returns boolean - true se suporta visualização inline
 */
export function supportsInline(): boolean {
  const userAgent = navigator.userAgent;
  const isMobile = /iPad|iPhone|Android/i.test(userAgent);

  logger.info('PDF inline support check', {
    component: 'pdfContract',
    action: 'inlineSupport',
    supportsInline: !isMobile,
    userAgent: userAgent.substring(0, 50) + '...', // Log apenas parte do user agent
  });

  return !isMobile;
}

/**
 * Verifica se o PDF está acessível antes de tentar carregar
 *
 * @param essayId ID da redação
 * @param token Token de autenticação
 * @returns Promise<boolean> - true se o arquivo está acessível
 */
export async function isPdfAccessible(
  essayId: string,
  token?: string
): Promise<boolean> {
  try {
    const url = buildPdfUrl(essayId, token);
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'HEAD',
      headers,
      cache: 'no-cache',
    });

    const isAccessible = response.ok;

    logger.info('PDF accessibility check', {
      component: 'pdfContract',
      action: 'accessibilityCheck',
      essayId,
      accessible: isAccessible,
      status: response.status,
      hasToken: !!token,
    });

    return isAccessible;
  } catch (error) {
    logger.warn('PDF accessibility check failed', {
      component: 'pdfContract',
      action: 'accessibilityCheck',
      essayId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Determina a estratégia de carregamento do PDF
 *
 * @param essayId ID da redação
 * @param token Token de autenticação
 * @returns Promise<'inline' | 'fallback'> - estratégia recomendada
 */
export async function determinePdfStrategy(
  essayId: string,
  token?: string
): Promise<'inline' | 'fallback'> {
  try {
    // Verificar se o worker está pronto
    const workerReady = await isWorkerReady();
    if (!workerReady) {
      logger.warn('PDF strategy: fallback (worker not ready)', {
        component: 'pdfContract',
        action: 'strategy',
        essayId,
        reason: 'worker_not_ready',
      });
      return 'fallback';
    }

    // Verificar se suporta visualização inline
    const inlineSupported = supportsInline();
    if (!inlineSupported) {
      logger.warn('PDF strategy: fallback (inline not supported)', {
        component: 'pdfContract',
        action: 'strategy',
        essayId,
        reason: 'inline_not_supported',
      });
      return 'fallback';
    }

    // Verificar se o arquivo está acessível
    const accessible = await isPdfAccessible(essayId, token);
    if (!accessible) {
      logger.warn('PDF strategy: fallback (file not accessible)', {
        component: 'pdfContract',
        action: 'strategy',
        essayId,
        reason: 'file_not_accessible',
      });
      return 'fallback';
    }

    logger.info('PDF strategy: inline', {
      component: 'pdfContract',
      action: 'strategy',
      essayId,
      reason: 'all_checks_passed',
    });

    return 'inline';
  } catch (error) {
    logger.error('PDF strategy determination failed', {
      component: 'pdfContract',
      action: 'strategy',
      essayId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return 'fallback';
  }
}

/**
 * Log de abertura do PDF para telemetria
 *
 * @param essayId ID da redação
 * @param inline Se foi aberto inline ou fallback
 * @param hadToken Se tinha token de autenticação
 */
export function logPdfOpen(
  essayId: string,
  inline: boolean,
  hadToken: boolean
): void {
  logger.info('PDF opened', {
    component: 'pdfContract',
    action: 'pdfOpen',
    essayId,
    inline,
    hadToken,
  });
}

/**
 * Trata erros de carregamento do PDF
 *
 * @param error Erro capturado
 * @param essayId ID da redação
 * @returns string - mensagem de erro amigável
 */
export function handlePdfError(error: any, essayId: string): string {
  let message = 'Erro ao carregar PDF';

  if (error?.response?.status === 404) {
    message = 'Arquivo não encontrado';
  } else if (error?.response?.status >= 500) {
    message = 'Falha ao carregar documento. Tente novamente.';
  } else if (error?.message?.includes('ERR_FAILED')) {
    message = 'Falha ao carregar documento. Tente novamente.';
  } else if (error?.message?.includes('WorkerMessageHandler')) {
    message = 'Erro no processamento do PDF - tente recarregar a página';
  }

  logger.error('PDF load error', {
    component: 'pdfContract',
    action: 'error',
    essayId,
    message,
    status: error?.response?.status,
    errorMessage: error?.message,
  });

  return message;
}
