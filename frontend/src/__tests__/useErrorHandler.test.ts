/**
 * Testes para o hook useErrorHandler
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import {
  useErrorHandler,
  useFormErrorHandler,
  useUploadErrorHandler,
} from '@/hooks/useErrorHandler';

// Mock do toast
const mockToast = {
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  dismiss: jest.fn(),
};

jest.mock('react-toastify', () => ({
  toast: mockToast,
}));

// Mock do logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// Mock do errorMap
jest.mock('@/services/errorMap', () => ({
  getErrorInfo: jest.fn(),
  getNetworkErrorInfo: jest.fn(),
  getValidationErrorInfo: jest.fn(),
  getUploadErrorInfo: jest.fn(),
  shouldLogError: jest.fn(),
  shouldShowToast: jest.fn(),
  getToastType: jest.fn(),
  formatErrorForLogging: jest.fn(),
  DEFAULT_ERROR_MAP_CONFIG: {
    showToastFor: [400, 401, 403, 404, 500],
    logErrors: true,
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should handle processed error with userMessage', () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = {
        userMessage: 'Processed error message',
        shouldShowToast: true,
        errorType: 'error',
      };

      act(() => {
        result.current.handleApiError(error, 'test-context');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Processed error message');
    });

    it('should handle unprocessed error', () => {
      const {
        getErrorInfo,
        getNetworkErrorInfo,
        shouldLogError,
        shouldShowToast,
        getToastType,
        formatErrorForLogging,
      } = require('@/services/errorMap');

      getErrorInfo.mockReturnValue({
        message: 'Test error message',
        type: 'error',
        showToast: true,
        logLevel: 'error',
      });
      shouldLogError.mockReturnValue(true);
      shouldShowToast.mockReturnValue(true);
      getToastType.mockReturnValue('error');
      formatErrorForLogging.mockReturnValue('Formatted error');

      const { result } = renderHook(() => useErrorHandler());

      const error = {
        response: { status: 400 },
        config: { url: '/test', method: 'POST' },
      };

      act(() => {
        result.current.handleApiError(error, 'test-context');
      });

      expect(getErrorInfo).toHaveBeenCalledWith(
        400,
        '/test',
        expect.any(Object)
      );
      expect(mockToast.error).toHaveBeenCalledWith('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error [test-context]',
        expect.any(Object)
      );
    });

    it('should not show toast when showToasts is false', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ showToasts: false })
      );

      const error = {
        userMessage: 'Test error',
        shouldShowToast: true,
        errorType: 'error',
      };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));

      const error = { message: 'Test error' };

      act(() => {
        result.current.handleApiError(error, 'test-context');
      });

      expect(onError).toHaveBeenCalledWith(error, 'test-context');
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation error correctly', () => {
      const { getValidationErrorInfo } = require('@/services/errorMap');

      getValidationErrorInfo.mockReturnValue({
        message: 'email: Email inválido',
        type: 'error',
        showToast: true,
        logLevel: 'warn',
      });

      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleValidationError('email', 'Email inválido');
      });

      expect(getValidationErrorInfo).toHaveBeenCalledWith(
        'email',
        'Email inválido'
      );
      expect(mockToast.error).toHaveBeenCalledWith('email: Email inválido');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation Error',
        expect.any(Object)
      );
    });
  });

  describe('handleUploadError', () => {
    it('should handle upload error correctly', () => {
      const { getUploadErrorInfo } = require('@/services/errorMap');

      getUploadErrorInfo.mockReturnValue({
        message: 'Arquivo muito grande',
        type: 'error',
        showToast: true,
        logLevel: 'error',
      });

      const { result } = renderHook(() => useErrorHandler());

      const error = { code: 'FILE_TOO_LARGE' };

      act(() => {
        result.current.handleUploadError(error);
      });

      expect(getUploadErrorInfo).toHaveBeenCalledWith(error);
      expect(mockToast.error).toHaveBeenCalledWith('Arquivo muito grande');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Upload Error',
        expect.any(Object)
      );
    });
  });

  describe('handleGenericError', () => {
    it('should handle generic error correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = { message: 'Generic error' };

      act(() => {
        result.current.handleGenericError(error, 'test-context');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Generic error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Generic Error [test-context]',
        expect.any(Object)
      );
    });

    it('should handle error without message', () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = {};

      act(() => {
        result.current.handleGenericError(error);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Erro inesperado');
    });
  });

  describe('showToast', () => {
    it('should show error toast', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showToast('Error message', 'error');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Error message');
    });

    it('should show warning toast', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showToast('Warning message', 'warning');
      });

      expect(mockToast.warning).toHaveBeenCalledWith('Warning message');
    });

    it('should show success toast', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showToast('Success message', 'success');
      });

      expect(mockToast.success).toHaveBeenCalledWith('Success message');
    });

    it('should show info toast by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showToast('Info message');
      });

      expect(mockToast.info).toHaveBeenCalledWith('Info message');
    });
  });

  describe('clearToasts', () => {
    it('should clear all toasts', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.clearToasts();
      });

      expect(mockToast.dismiss).toHaveBeenCalled();
    });
  });
});

describe('useFormErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle field-specific validation error', () => {
    const { result } = renderHook(() => useFormErrorHandler());

    const error = {
      response: {
        data: {
          errors: {
            email: 'Email inválido',
          },
        },
      },
    };

    act(() => {
      result.current.handleFormError(error, 'email');
    });

    expect(mockToast.error).toHaveBeenCalledWith('email: Email inválido');
  });

  it('should handle general server error', () => {
    const { result } = renderHook(() => useFormErrorHandler());

    const error = {
      response: {
        data: {
          message: 'Server error message',
        },
      },
    };

    act(() => {
      result.current.handleFormError(error);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Server error message');
  });

  it('should handle generic error', () => {
    const { result } = renderHook(() => useFormErrorHandler());

    const error = { message: 'Generic error' };

    act(() => {
      result.current.handleFormError(error);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Generic error');
  });
});

describe('useUploadErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle upload-specific error', () => {
    const { result } = renderHook(() => useUploadErrorHandler());

    const error = { code: 'FILE_TOO_LARGE' };

    act(() => {
      result.current.handleUploadFormError(error);
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Arquivo muito grande. Tamanho máximo: 10MB.'
    );
  });

  it('should handle generic API error', () => {
    const { result } = renderHook(() => useUploadErrorHandler());

    const error = { message: 'API error' };

    act(() => {
      result.current.handleUploadFormError(error);
    });

    expect(mockToast.error).toHaveBeenCalledWith('API error');
  });
});
