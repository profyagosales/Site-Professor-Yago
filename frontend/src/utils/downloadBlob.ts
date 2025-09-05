/**
 * Utilitários para download de arquivos blob
 * 
 * Funcionalidades:
 * - Download programático sem bloqueio de pop-up
 * - Criação de URLs temporárias para abertura
 * - Limpeza automática de recursos
 * - Suporte a diferentes tipos de arquivo
 */

/**
 * Faz download de um blob como arquivo
 * 
 * @param blob - O blob a ser baixado
 * @param filename - Nome do arquivo (opcional)
 * @returns Promise que resolve quando o download é iniciado
 */
export async function downloadBlob(blob: Blob, filename?: string): Promise<void> {
  try {
    // Cria URL temporária para o blob
    const url = URL.createObjectURL(blob);
    
    // Cria elemento de link temporário
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || generateFilename(blob);
    
    // Adiciona ao DOM temporariamente
    document.body.appendChild(link);
    
    // Simula clique para iniciar download
    link.click();
    
    // Remove do DOM
    document.body.removeChild(link);
    
    // Limpa URL temporária após um delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao fazer download do arquivo:', error);
    throw new Error('Falha ao fazer download do arquivo');
  }
}

/**
 * Cria URL temporária para abertura de blob
 * 
 * @param blob - O blob a ser aberto
 * @returns URL temporária para o blob
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Limpa URL temporária de blob
 * 
 * @param url - URL temporária a ser limpa
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Gera nome de arquivo baseado no tipo do blob
 * 
 * @param blob - O blob para extrair o tipo
 * @returns Nome de arquivo sugerido
 */
export function generateFilename(blob: Blob): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  // Extrai extensão do tipo MIME
  const mimeType = blob.type;
  let extension = '';
  
  if (mimeType.includes('pdf')) {
    extension = '.pdf';
  } else if (mimeType.includes('image')) {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      extension = '.jpg';
    } else if (mimeType.includes('png')) {
      extension = '.png';
    } else if (mimeType.includes('gif')) {
      extension = '.gif';
    } else if (mimeType.includes('webp')) {
      extension = '.webp';
    } else {
      extension = '.img';
    }
  } else if (mimeType.includes('text')) {
    extension = '.txt';
  } else if (mimeType.includes('json')) {
    extension = '.json';
  } else {
    extension = '.bin';
  }
  
  return `arquivo-${timestamp}${extension}`;
}

/**
 * Abre blob em nova aba/janela
 * 
 * @param blob - O blob a ser aberto
 * @param filename - Nome do arquivo (opcional)
 * @returns Promise que resolve quando a janela é aberta
 */
export async function openBlobInNewTab(blob: Blob, filename?: string): Promise<void> {
  try {
    const url = createBlobUrl(blob);
    
    // Abre em nova aba
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      // Se pop-up foi bloqueado, tenta download
      console.warn('Pop-up bloqueado, fazendo download alternativo');
      await downloadBlob(blob, filename);
      return;
    }
    
    // Limpa URL após um tempo (quando a janela for fechada)
    setTimeout(() => {
      revokeBlobUrl(url);
    }, 30000); // 30 segundos
    
  } catch (error) {
    console.error('Erro ao abrir arquivo em nova aba:', error);
    throw new Error('Falha ao abrir arquivo');
  }
}

/**
 * Verifica se o navegador suporta download programático
 * 
 * @returns true se suporta, false caso contrário
 */
export function supportsProgrammaticDownload(): boolean {
  try {
    // Testa se pode criar elemento de link
    const link = document.createElement('a');
    return typeof link.download !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Verifica se o navegador suporta abertura de blob
 * 
 * @returns true se suporta, false caso contrário
 */
export function supportsBlobOpening(): boolean {
  try {
    // Testa se pode criar URL de blob
    return typeof URL.createObjectURL === 'function';
  } catch {
    return false;
  }
}

/**
 * Obtém informações do blob
 * 
 * @param blob - O blob para analisar
 * @returns Informações do blob
 */
export function getBlobInfo(blob: Blob): {
  size: number;
  type: string;
  sizeFormatted: string;
  extension: string;
} {
  const size = blob.size;
  const type = blob.type;
  const extension = getFileExtension(type);
  
  return {
    size,
    type,
    sizeFormatted: formatFileSize(size),
    extension,
  };
}

/**
 * Obtém extensão de arquivo baseada no tipo MIME
 * 
 * @param mimeType - Tipo MIME
 * @returns Extensão do arquivo
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'application/json': '.json',
    'text/html': '.html',
    'text/css': '.css',
    'application/javascript': '.js',
    'text/javascript': '.js',
  };
  
  return mimeToExt[mimeType] || '.bin';
}

/**
 * Formata tamanho de arquivo em formato legível
 * 
 * @param bytes - Tamanho em bytes
 * @returns String formatada
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Classe para gerenciar downloads de blob
 */
export class BlobDownloadManager {
  private activeDownloads = new Set<string>();
  private blobUrls = new Set<string>();

  /**
   * Faz download de blob com controle de estado
   */
  async download(blob: Blob, filename?: string): Promise<void> {
    const id = `${Date.now()}-${Math.random()}`;
    this.activeDownloads.add(id);
    
    try {
      await downloadBlob(blob, filename);
    } finally {
      this.activeDownloads.delete(id);
    }
  }

  /**
   * Cria URL temporária com controle de limpeza
   */
  createUrl(blob: Blob): string {
    const url = createBlobUrl(blob);
    this.blobUrls.add(url);
    return url;
  }

  /**
   * Limpa todas as URLs temporárias
   */
  cleanup(): void {
    this.blobUrls.forEach(url => {
      revokeBlobUrl(url);
    });
    this.blobUrls.clear();
  }

  /**
   * Verifica se há downloads ativos
   */
  hasActiveDownloads(): boolean {
    return this.activeDownloads.size > 0;
  }

  /**
   * Obtém número de downloads ativos
   */
  getActiveDownloadsCount(): number {
    return this.activeDownloads.size;
  }
}

// Instância global do gerenciador
export const blobDownloadManager = new BlobDownloadManager();

export default {
  downloadBlob,
  createBlobUrl,
  revokeBlobUrl,
  generateFilename,
  openBlobInNewTab,
  supportsProgrammaticDownload,
  supportsBlobOpening,
  getBlobInfo,
  BlobDownloadManager,
  blobDownloadManager,
};
