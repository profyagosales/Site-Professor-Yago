import { api } from '@/services/api';
import { logger } from '@/lib/logger';

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  onCancel?: () => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  essayId?: string;
  studentName?: string;
  topic?: string;
}

/**
 * Upload de redação com progresso, cancelamento e validação
 */
export async function uploadEssay(
  formData: FormData,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, onCancel, signal } = options;

  try {
    logger.info('Starting essay upload', {
      component: 'uploads',
      action: 'uploadEssay',
      hasFile: formData.has('file'),
      hasFileUrl: formData.has('fileUrl'),
      studentId: formData.get('studentId'),
      topic: formData.get('topic'),
    });

    const res = await api.post('/uploads/essay', formData, {
      headers: {
        // Não definir Content-Type - deixar o browser definir automaticamente com boundary
      },
      onUploadProgress: progressEvent => {
        if (progressEvent.total && onProgress) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
      signal,
    });

    logger.info('Essay upload completed successfully', {
      component: 'uploads',
      action: 'uploadEssay',
      essayId: res.data?.id || res.data?.essayId,
      studentName: res.data?.studentName,
      topic: res.data?.topic,
    });

    return {
      success: true,
      data: res.data,
      essayId: res.data?.id || res.data?.essayId,
      studentName: res.data?.studentName || res.data?.student?.name,
      topic: res.data?.topic || res.data?.theme,
    };
  } catch (error: any) {
    const isAborted =
      error.name === 'AbortError' || error.code === 'ERR_CANCELED';

    if (isAborted) {
      logger.info('Essay upload cancelled by user', {
        component: 'uploads',
        action: 'uploadEssay',
      });
      onCancel?.();
      return {
        success: false,
        error: 'Upload cancelado pelo usuário',
      };
    }

    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Erro ao enviar redação';

    logger.error('Essay upload failed', {
      component: 'uploads',
      action: 'uploadEssay',
      error: errorMessage,
      status: error?.response?.status,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Valida arquivo antes do upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (!file) {
    return { valid: false, error: 'Nenhum arquivo selecionado' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error:
        'Tipo de arquivo não suportado. Use PDF ou imagens (JPG, PNG, GIF, WebP).',
    };
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxMB = (MAX_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Arquivo muito grande (${sizeMB}MB). Tamanho máximo: ${maxMB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Valida URL de arquivo
 */
export function validateFileUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url.trim()) {
    return { valid: false, error: 'URL não informada' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL inválida' };
  }
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default { uploadEssay, validateFile, validateFileUrl, formatFileSize };
