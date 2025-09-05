/**
 * Testes para o hook useUpload
 * 
 * Cobre:
 * - Estado inicial
 * - Upload com sucesso
 * - Upload com erro
 * - Cancelamento
 * - Validação de arquivos
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from '@/hooks/useUpload';
import { uploadEssay } from '@/services/uploads';

// Mock do uploadEssay
jest.mock('@/services/uploads', () => ({
  uploadEssay: jest.fn(),
  validateFile: jest.fn(),
  validateFileUrl: jest.fn(),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ter estado inicial correto', () => {
    const { result } = renderHook(() => useUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.upload).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('deve fazer upload com sucesso', async () => {
    const mockResult = {
      success: true,
      data: { id: 'essay-123' },
      essayId: 'essay-123',
      studentName: 'João Silva',
      topic: 'Meio ambiente',
    };

    (uploadEssay as jest.Mock).mockResolvedValue(mockResult);

    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUpload({ onSuccess }));

    const formData = new FormData();
    formData.append('file', new File(['content'], 'test.pdf'));

    await act(async () => {
      await result.current.upload(formData);
    });

    expect(uploadEssay).toHaveBeenCalledWith(formData, {
      signal: expect.any(AbortSignal),
      onProgress: expect.any(Function),
      onCancel: expect.any(Function),
    });
    expect(onSuccess).toHaveBeenCalledWith(mockResult);
    expect(result.current.isUploading).toBe(false);
  });

  it('deve tratar erro de upload', async () => {
    const mockError = 'Erro de upload';
    (uploadEssay as jest.Mock).mockResolvedValue({
      success: false,
      error: mockError,
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useUpload({ onError }));

    const formData = new FormData();

    await act(async () => {
      await result.current.upload(formData);
    });

    expect(onError).toHaveBeenCalledWith(mockError);
    expect(result.current.error).toBe(mockError);
    expect(result.current.isUploading).toBe(false);
  });

  it('deve cancelar upload', async () => {
    const onCancel = jest.fn();
    const { result } = renderHook(() => useUpload({ onCancel }));

    // Simula upload em andamento
    act(() => {
      result.current.upload(new FormData());
    });

    expect(result.current.isUploading).toBe(true);

    // Cancela upload
    act(() => {
      result.current.cancel();
    });

    expect(result.current.isUploading).toBe(false);
    expect(onCancel).toHaveBeenCalled();
  });

  it('deve limpar erro', () => {
    const { result } = renderHook(() => useUpload());

    // Simula erro
    act(() => {
      result.current.upload(new FormData());
    });

    // Limpa erro
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('deve ter funções de validação disponíveis', () => {
    const { result } = renderHook(() => useUpload());

    expect(typeof result.current.validateFile).toBe('function');
    expect(typeof result.current.validateFileUrl).toBe('function');
  });
});

 * 
 * Cobre:
 * - Estado inicial
 * - Upload com sucesso
 * - Upload com erro
 * - Cancelamento
 * - Validação de arquivos
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from '@/hooks/useUpload';
import { uploadEssay } from '@/services/uploads';

// Mock do uploadEssay
jest.mock('@/services/uploads', () => ({
  uploadEssay: jest.fn(),
  validateFile: jest.fn(),
  validateFileUrl: jest.fn(),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ter estado inicial correto', () => {
    const { result } = renderHook(() => useUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.upload).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('deve fazer upload com sucesso', async () => {
    const mockResult = {
      success: true,
      data: { id: 'essay-123' },
      essayId: 'essay-123',
      studentName: 'João Silva',
      topic: 'Meio ambiente',
    };

    (uploadEssay as jest.Mock).mockResolvedValue(mockResult);

    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUpload({ onSuccess }));

    const formData = new FormData();
    formData.append('file', new File(['content'], 'test.pdf'));

    await act(async () => {
      await result.current.upload(formData);
    });

    expect(uploadEssay).toHaveBeenCalledWith(formData, {
      signal: expect.any(AbortSignal),
      onProgress: expect.any(Function),
      onCancel: expect.any(Function),
    });
    expect(onSuccess).toHaveBeenCalledWith(mockResult);
    expect(result.current.isUploading).toBe(false);
  });

  it('deve tratar erro de upload', async () => {
    const mockError = 'Erro de upload';
    (uploadEssay as jest.Mock).mockResolvedValue({
      success: false,
      error: mockError,
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useUpload({ onError }));

    const formData = new FormData();

    await act(async () => {
      await result.current.upload(formData);
    });

    expect(onError).toHaveBeenCalledWith(mockError);
    expect(result.current.error).toBe(mockError);
    expect(result.current.isUploading).toBe(false);
  });

  it('deve cancelar upload', async () => {
    const onCancel = jest.fn();
    const { result } = renderHook(() => useUpload({ onCancel }));

    // Simula upload em andamento
    act(() => {
      result.current.upload(new FormData());
    });

    expect(result.current.isUploading).toBe(true);

    // Cancela upload
    act(() => {
      result.current.cancel();
    });

    expect(result.current.isUploading).toBe(false);
    expect(onCancel).toHaveBeenCalled();
  });

  it('deve limpar erro', () => {
    const { result } = renderHook(() => useUpload());

    // Simula erro
    act(() => {
      result.current.upload(new FormData());
    });

    // Limpa erro
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('deve ter funções de validação disponíveis', () => {
    const { result } = renderHook(() => useUpload());

    expect(typeof result.current.validateFile).toBe('function');
    expect(typeof result.current.validateFileUrl).toBe('function');
  });
});
