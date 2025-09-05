/**
 * Mapa de erros do API para mensagens padronizadas
 *
 * Objetivo:
 * - Unificar mensagens de erro para o usuário
 * - Reduzir "ruído" e melhorar UX
 * - Evitar exibição de JSON bruto ou stack traces
 */

export interface ErrorInfo {
  message: string;
  type: 'error' | 'warning' | 'info';
  showToast: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface ErrorMapConfig {
  // Mensagens personalizadas por endpoint
  customMessages?: Record<string, Record<number, string>>;
  // Se deve mostrar toast para erros específicos
  showToastFor?: number[];
  // Se deve logar erros específicos
  logErrors?: boolean;
}

// Mapa principal de erros HTTP
const HTTP_ERROR_MAP: Record<number, ErrorInfo> = {
  // 4xx - Client Errors
  400: {
    message: 'Verifique os dados e tente novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  401: {
    message: 'Sessão expirada. Faça login novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  403: {
    message: 'Você não tem permissão para esta ação.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  404: {
    message: 'Recurso não encontrado.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  409: {
    message: 'Conflito de dados. Verifique as informações.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  413: {
    message: 'Arquivo muito grande. Tente um arquivo menor.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  422: {
    message: 'Dados inválidos. Verifique os campos obrigatórios.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  429: {
    message: 'Muitas tentativas. Aguarde um momento e tente novamente.',
    type: 'warning',
    showToast: true,
    logLevel: 'warn',
  },

  // 5xx - Server Errors
  500: {
    message: 'Falha no servidor. Tente mais tarde.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
  502: {
    message: 'Servidor temporariamente indisponível.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
  503: {
    message: 'Serviço temporariamente indisponível.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
  504: {
    message: 'Timeout do servidor. Tente novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
};

// Mensagens personalizadas por endpoint
const CUSTOM_ERROR_MESSAGES: Record<string, Record<number, string>> = {
  '/auth/login': {
    401: 'Email ou senha incorretos.',
    429: 'Muitas tentativas de login. Aguarde 15 minutos.',
  },
  '/auth/register': {
    409: 'Email já cadastrado.',
    422: 'Dados inválidos. Verifique o formato do email.',
  },
  '/uploads/essay': {
    413: 'Arquivo muito grande. Tamanho máximo: 10MB.',
    415: 'Tipo de arquivo não suportado. Use PDF ou imagens.',
  },
  '/essays': {
    404: 'Nenhuma redação encontrada.',
    403: 'Você não tem permissão para ver estas redações.',
  },
  '/classes': {
    404: 'Nenhuma turma encontrada.',
    403: 'Você não tem permissão para ver estas turmas.',
  },
  '/students': {
    404: 'Nenhum aluno encontrado.',
    403: 'Você não tem permissão para ver estes alunos.',
  },
};

// Mensagens para erros de rede
const NETWORK_ERROR_MESSAGES: Record<string, ErrorInfo> = {
  NETWORK_ERROR: {
    message: 'Sem conexão com a internet. Verifique sua rede.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
  TIMEOUT: {
    message: 'Tempo limite excedido. Tente novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  },
  CANCELED: {
    message: 'Operação cancelada.',
    type: 'info',
    showToast: false,
    logLevel: 'debug',
  },
  UNKNOWN: {
    message: 'Erro inesperado. Tente novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  },
};

/**
 * Obtém informações de erro baseadas no status HTTP
 */
export function getErrorInfo(
  status: number,
  url?: string,
  config?: ErrorMapConfig
): ErrorInfo {
  // Verifica se há mensagem personalizada para o endpoint
  if (url && CUSTOM_ERROR_MESSAGES[url]) {
    const customMessage = CUSTOM_ERROR_MESSAGES[url][status];
    if (customMessage) {
      return {
        message: customMessage,
        type: 'error',
        showToast: true,
        logLevel: 'warn',
      };
    }
  }

  // Verifica se há mensagem personalizada na configuração
  if (config?.customMessages && url) {
    const endpointMessages = config.customMessages[url];
    if (endpointMessages && endpointMessages[status]) {
      return {
        message: endpointMessages[status],
        type: 'error',
        showToast: true,
        logLevel: 'warn',
      };
    }
  }

  // Retorna mensagem padrão do mapa HTTP
  return (
    HTTP_ERROR_MAP[status] || {
      message: 'Erro inesperado. Tente novamente.',
      type: 'error',
      showToast: true,
      logLevel: 'error',
    }
  );
}

/**
 * Obtém informações de erro para erros de rede
 */
export function getNetworkErrorInfo(errorCode: string): ErrorInfo {
  return NETWORK_ERROR_MESSAGES[errorCode] || NETWORK_ERROR_MESSAGES['UNKNOWN'];
}

/**
 * Obtém informações de erro para erros de validação
 */
export function getValidationErrorInfo(
  field: string,
  message: string
): ErrorInfo {
  return {
    message: `${field}: ${message}`,
    type: 'error',
    showToast: true,
    logLevel: 'warn',
  };
}

/**
 * Obtém informações de erro para erros de upload
 */
export function getUploadErrorInfo(error: any): ErrorInfo {
  if (error.code === 'FILE_TOO_LARGE') {
    return {
      message: 'Arquivo muito grande. Tamanho máximo: 10MB.',
      type: 'error',
      showToast: true,
      logLevel: 'warn',
    };
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return {
      message: 'Tipo de arquivo não suportado. Use PDF ou imagens.',
      type: 'error',
      showToast: true,
      logLevel: 'warn',
    };
  }

  if (error.code === 'UPLOAD_FAILED') {
    return {
      message: 'Falha no upload. Tente novamente.',
      type: 'error',
      showToast: true,
      logLevel: 'error',
    };
  }

  return {
    message: 'Erro no upload. Tente novamente.',
    type: 'error',
    showToast: true,
    logLevel: 'error',
  };
}

/**
 * Verifica se um erro deve ser logado
 */
export function shouldLogError(
  status: number,
  config?: ErrorMapConfig
): boolean {
  if (config?.logErrors === false) {
    return false;
  }

  const errorInfo = HTTP_ERROR_MAP[status];
  return errorInfo ? errorInfo.logLevel !== 'debug' : true;
}

/**
 * Verifica se um erro deve mostrar toast
 */
export function shouldShowToast(
  status: number,
  config?: ErrorMapConfig
): boolean {
  if (config?.showToastFor && !config.showToastFor.includes(status)) {
    return false;
  }

  const errorInfo = HTTP_ERROR_MAP[status];
  return errorInfo ? errorInfo.showToast : true;
}

/**
 * Obtém tipo de toast baseado no status
 */
export function getToastType(status: number): 'error' | 'warning' | 'info' {
  const errorInfo = HTTP_ERROR_MAP[status];
  return errorInfo ? errorInfo.type : 'error';
}

/**
 * Formata erro para logging
 */
export function formatErrorForLogging(
  error: any,
  url?: string,
  method?: string
): string {
  const parts = [];

  if (method) parts.push(`${method.toUpperCase()}`);
  if (url) parts.push(url);
  if (error.status) parts.push(`Status: ${error.status}`);
  if (error.message) parts.push(`Message: ${error.message}`);

  return parts.join(' | ');
}

/**
 * Configuração padrão do error map
 */
export const DEFAULT_ERROR_MAP_CONFIG: ErrorMapConfig = {
  showToastFor: [400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504],
  logErrors: true,
};

export default {
  getErrorInfo,
  getNetworkErrorInfo,
  getValidationErrorInfo,
  getUploadErrorInfo,
  shouldLogError,
  shouldShowToast,
  getToastType,
  formatErrorForLogging,
  DEFAULT_ERROR_MAP_CONFIG,
};
