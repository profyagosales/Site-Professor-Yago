/**
 * Hook para gerenciar upload de arquivos com progresso e cancelamento
 */

import { useState, useRef, useCallback } from 'react';
import {
  uploadEssay,
  validateFile,
  validateFileUrl,
  type UploadProgressEvent,
  type UploadResult,
} from '@/services/uploads';
import { logger } from '@/lib/logger';

export interface UseUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export interface UseUploadReturn {
  // Estado
  isUploading: boolean;
  progress: number;
  error: string | null;

  // Ações
  upload: (formData: FormData) => Promise<UploadResult>;
  cancel: () => void;
  clearError: () => void;

  // Validação
  validateFile: (file: File) => { valid: boolean; error?: string };
  validateFileUrl: (url: string) => { valid: boolean; error?: string };
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const { onSuccess, onError, onCancel } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setProgress(0);
    onCancel?.();
  }, [onCancel]);

  const upload = useCallback(
    async (formData: FormData): Promise<UploadResult> => {
      // Limpa erros anteriores
      setError(null);
      setProgress(0);

      // Cria novo AbortController
      abortControllerRef.current = new AbortController();
      setIsUploading(true);

      try {
        logger.info('Starting upload with useUpload hook', {
          component: 'useUpload',
          action: 'upload',
          hasFile: formData.has('file'),
          hasFileUrl: formData.has('fileUrl'),
        });

        const result = await uploadEssay(formData, {
          signal: abortControllerRef.current.signal,
          onProgress: (event: UploadProgressEvent) => {
            setProgress(event.percentage);
            logger.debug('Upload progress updated', {
              component: 'useUpload',
              action: 'progress',
              percentage: event.percentage,
              loaded: event.loaded,
              total: event.total,
            });
          },
          onCancel: () => {
            logger.info('Upload cancelled by user', {
              component: 'useUpload',
              action: 'cancel',
            });
            setIsUploading(false);
            setProgress(0);
            onCancel?.();
          },
        });

        if (result.success) {
          logger.info('Upload completed successfully', {
            component: 'useUpload',
            action: 'success',
            essayId: result.essayId,
            studentName: result.studentName,
          });
          onSuccess?.(result);
        } else {
          logger.warn('Upload failed', {
            component: 'useUpload',
            action: 'error',
            error: result.error,
          });
          setError(result.error || 'Erro desconhecido');
          onError?.(result.error || 'Erro desconhecido');
        }

        return result;
      } catch (err: any) {
        const errorMessage = err?.message || 'Erro durante o upload';
        logger.error('Upload error', {
          component: 'useUpload',
          action: 'error',
          error: errorMessage,
        });

        setError(errorMessage);
        onError?.(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsUploading(false);
        setProgress(0);
        abortControllerRef.current = null;
      }
    },
    [onSuccess, onError, onCancel]
  );

  return {
    isUploading,
    progress,
    error,
    upload,
    cancel,
    clearError,
    validateFile,
    validateFileUrl,
  };
}
