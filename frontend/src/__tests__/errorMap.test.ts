/**
 * Testes para o mapa de erros
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getErrorInfo,
  getNetworkErrorInfo,
  getValidationErrorInfo,
  getUploadErrorInfo,
  shouldLogError,
  shouldShowToast,
  getToastType,
  formatErrorForLogging,
  DEFAULT_ERROR_MAP_CONFIG,
} from '@/services/errorMap';

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('Error Map', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getErrorInfo', () => {
    it('should return correct error info for 400', () => {
      const result = getErrorInfo(400);

      expect(result.message).toBe('Verifique os dados e tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct error info for 401', () => {
      const result = getErrorInfo(401);

      expect(result.message).toBe('Sessão expirada. Faça login novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct error info for 403', () => {
      const result = getErrorInfo(403);

      expect(result.message).toBe('Você não tem permissão para esta ação.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct error info for 404', () => {
      const result = getErrorInfo(404);

      expect(result.message).toBe('Recurso não encontrado.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct error info for 413', () => {
      const result = getErrorInfo(413);

      expect(result.message).toBe(
        'Arquivo muito grande. Tente um arquivo menor.'
      );
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct error info for 500', () => {
      const result = getErrorInfo(500);

      expect(result.message).toBe('Falha no servidor. Tente mais tarde.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });

    it('should return custom message for specific endpoint', () => {
      const result = getErrorInfo(401, '/auth/login');

      expect(result.message).toBe('Email ou senha incorretos.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return custom message for upload endpoint', () => {
      const result = getErrorInfo(413, '/uploads/essay');

      expect(result.message).toBe(
        'Arquivo muito grande. Tamanho máximo: 10MB.'
      );
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return default message for unknown status', () => {
      const result = getErrorInfo(999);

      expect(result.message).toBe('Erro inesperado. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        customMessages: {
          '/test': {
            400: 'Custom message for test endpoint',
          },
        },
      };

      const result = getErrorInfo(400, '/test', customConfig);

      expect(result.message).toBe('Custom message for test endpoint');
    });
  });

  describe('getNetworkErrorInfo', () => {
    it('should return correct info for NETWORK_ERROR', () => {
      const result = getNetworkErrorInfo('NETWORK_ERROR');

      expect(result.message).toBe(
        'Sem conexão com a internet. Verifique sua rede.'
      );
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });

    it('should return correct info for TIMEOUT', () => {
      const result = getNetworkErrorInfo('TIMEOUT');

      expect(result.message).toBe('Tempo limite excedido. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct info for CANCELED', () => {
      const result = getNetworkErrorInfo('CANCELED');

      expect(result.message).toBe('Operação cancelada.');
      expect(result.type).toBe('info');
      expect(result.showToast).toBe(false);
      expect(result.logLevel).toBe('debug');
    });

    it('should return correct info for UNKNOWN', () => {
      const result = getNetworkErrorInfo('UNKNOWN');

      expect(result.message).toBe('Erro inesperado. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });

    it('should return UNKNOWN info for invalid error code', () => {
      const result = getNetworkErrorInfo('INVALID_CODE');

      expect(result.message).toBe('Erro inesperado. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });
  });

  describe('getValidationErrorInfo', () => {
    it('should return correct info for validation error', () => {
      const result = getValidationErrorInfo('email', 'Email inválido');

      expect(result.message).toBe('email: Email inválido');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });
  });

  describe('getUploadErrorInfo', () => {
    it('should return correct info for FILE_TOO_LARGE', () => {
      const result = getUploadErrorInfo({ code: 'FILE_TOO_LARGE' });

      expect(result.message).toBe(
        'Arquivo muito grande. Tamanho máximo: 10MB.'
      );
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct info for INVALID_FILE_TYPE', () => {
      const result = getUploadErrorInfo({ code: 'INVALID_FILE_TYPE' });

      expect(result.message).toBe(
        'Tipo de arquivo não suportado. Use PDF ou imagens.'
      );
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('warn');
    });

    it('should return correct info for UPLOAD_FAILED', () => {
      const result = getUploadErrorInfo({ code: 'UPLOAD_FAILED' });

      expect(result.message).toBe('Falha no upload. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });

    it('should return default info for unknown upload error', () => {
      const result = getUploadErrorInfo({ code: 'UNKNOWN' });

      expect(result.message).toBe('Erro no upload. Tente novamente.');
      expect(result.type).toBe('error');
      expect(result.showToast).toBe(true);
      expect(result.logLevel).toBe('error');
    });
  });

  describe('shouldLogError', () => {
    it('should return true for 400', () => {
      const result = shouldLogError(400);
      expect(result).toBe(true);
    });

    it('should return true for 500', () => {
      const result = shouldLogError(500);
      expect(result).toBe(true);
    });

    it('should return false when logErrors is false', () => {
      const result = shouldLogError(400, { logErrors: false });
      expect(result).toBe(false);
    });
  });

  describe('shouldShowToast', () => {
    it('should return true for 400', () => {
      const result = shouldShowToast(400);
      expect(result).toBe(true);
    });

    it('should return true for 500', () => {
      const result = shouldShowToast(500);
      expect(result).toBe(true);
    });

    it('should return false when status not in showToastFor', () => {
      const result = shouldShowToast(400, { showToastFor: [500] });
      expect(result).toBe(false);
    });
  });

  describe('getToastType', () => {
    it('should return error for 400', () => {
      const result = getToastType(400);
      expect(result).toBe('error');
    });

    it('should return warning for 429', () => {
      const result = getToastType(429);
      expect(result).toBe('warning');
    });

    it('should return error for unknown status', () => {
      const result = getToastType(999);
      expect(result).toBe('error');
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error with all information', () => {
      const error = {
        status: 400,
        message: 'Bad Request',
      };

      const result = formatErrorForLogging(error, '/test', 'POST');

      expect(result).toBe('POST | /test | Status: 400 | Message: Bad Request');
    });

    it('should format error with minimal information', () => {
      const error = {};

      const result = formatErrorForLogging(error);

      expect(result).toBe('');
    });

    it('should format error with partial information', () => {
      const error = {
        status: 500,
      };

      const result = formatErrorForLogging(error, '/test');

      expect(result).toBe('/test | Status: 500');
    });
  });

  describe('DEFAULT_ERROR_MAP_CONFIG', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_ERROR_MAP_CONFIG.showToastFor).toEqual([
        400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504,
      ]);
      expect(DEFAULT_ERROR_MAP_CONFIG.logErrors).toBe(true);
    });
  });
});
