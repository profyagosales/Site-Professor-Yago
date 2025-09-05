import { useEffect, useRef, useState } from 'react';
import { searchStudents } from '@/services/students2';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useUpload } from '@/hooks/useUpload';
import { useEssayHighlight } from '@/hooks/useEssayHighlight';
import { formatFileSize } from '@/services/uploads';
import { useUploadErrorHandler } from '@/hooks/useErrorHandler';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultClassId?: string;
  onSuccess: () => void; // recarrega pendentes
};

export default function NewEssayModal({
  open,
  onClose,
  defaultStudentId,
  defaultClassId,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState<string | undefined>(
    defaultStudentId
  );
  const [classId, setClassId] = useState<string | undefined>(defaultClassId);
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useUrl, setUseUrl] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [bimester, setBimester] = useState('');
  const [type, setType] = useState<'ENEM' | 'PAS'>('PAS');

  // Estados para validação de arquivo
  const [fileError, setFileError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Hook de highlight
  const { addHighlight } = useEssayHighlight();

  // Hook de tratamento de erros
  const { handleUploadFormError, showToast } = useUploadErrorHandler();

  // Hook de upload
  const {
    isUploading,
    progress,
    error: uploadError,
    upload,
    cancel,
    clearError: clearUploadError,
    validateFile,
    validateFileUrl,
  } = useUpload({
    onSuccess: result => {
      const studentName = result.studentName || 'Aluno';
      const topicName = result.topic || 'redação';
      const essayId = result.essayId;

      // Adiciona highlight se tiver ID da redação
      if (essayId) {
        addHighlight(essayId, studentName, topicName);
      }

      showToast(
        `${studentName} - ${topicName} enviada com sucesso!`,
        'success'
      );
      clearChanges();
      onSuccess();
      onClose();
    },
    onError: error => {
      handleUploadFormError(error);
      setError(error);
    },
    onCancel: () => {
      showToast('Upload cancelado', 'info');
    },
  });

  // Verificar se há mudanças não salvas
  const hasChanges = !!(
    file ||
    fileUrl.trim() ||
    studentId ||
    topic.trim() ||
    bimester
  );

  // Hook para proteção de mudanças não salvas
  const { clearChanges } = useUnsavedChanges({
    hasChanges: hasChanges && open,
    message:
      'Você tem alterações não salvas no formulário. Tem certeza que deseja sair?',
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => dialogRef.current?.querySelector('input')?.focus(), 0);
    } else {
      // Reset estados quando modal é fechado
      setFile(null);
      setFileError(null);
      setUrlError(null);
      setError(null);
      clearUploadError();
    }
  }, [open, clearUploadError]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!q) {
          setOptions([]);
          return;
        }
        const r = await searchStudents({ q, classId, page: 1, pageSize: 10 });
        if (!alive) return;
        const items = Array.isArray(r?.items) ? r.items : [];
        setOptions(items);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [q, classId]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  async function submit() {
    // Limpar erros anteriores
    setError(null);
    setFileError(null);
    setUrlError(null);
    clearUploadError();

    // Validação: arquivo OU URL (um dos dois obrigatório)
    if (!file && !fileUrl.trim()) {
      setError('Campos obrigatórios: arquivo ou URL');
      return;
    }
    if (useUrl && !fileUrl.trim()) {
      setError('Informe a URL do arquivo');
      return;
    }
    if (!useUrl && !file) {
      setError('Selecione um arquivo');
      return;
    }
    if (!studentId) {
      setError('Selecione um aluno');
      return;
    }
    if (!topic.trim()) {
      setError('Informe um tema');
      return;
    }
    if (!bimester) {
      setError('Selecione o bimestre');
      return;
    }

    // Validação de arquivo se não for URL
    if (!useUrl && file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setFileError(validation.error || 'Arquivo inválido');
        showToast(validation.error || 'Arquivo inválido', 'error');
        return;
      }
    }

    // Validação de URL se for URL
    if (useUrl && fileUrl.trim()) {
      const validation = validateFileUrl(fileUrl.trim());
      if (!validation.valid) {
        setUrlError(validation.error || 'URL inválida');
        showToast(validation.error || 'URL inválida', 'error');
        return;
      }
    }

    try {
      setLoading(true);

      const fd = new FormData();

      // Se arquivo: fd.append('file', file)
      if (file && !useUrl) {
        fd.append('file', file);
      }
      // Se URL: fd.append('fileUrl', url)
      if (useUrl && fileUrl.trim()) {
        fd.append('fileUrl', fileUrl.trim());
      }

      fd.append('studentId', studentId);
      fd.append('topic', topic);
      if (classId) fd.append('classId', classId);
      fd.append('bimester', bimester);
      fd.append('type', type);

      // Usar o hook de upload
      await upload(fd);
    } catch (e: any) {
      handleUploadFormError(e);
      setError(e?.message || 'Erro ao enviar redação');

      // Alert ARIA para acessibilidade
      const alertElement = document.createElement('div');
      alertElement.setAttribute('role', 'alert');
      alertElement.setAttribute('aria-live', 'assertive');
      alertElement.textContent = `Erro: ${e?.message || 'Erro ao enviar redação'}`;
      alertElement.className = 'sr-only';
      document.body.appendChild(alertElement);
      setTimeout(() => document.body.removeChild(alertElement), 5000);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onKeyDown={onKey}
    >
      <div className='w-full max-w-xl rounded-2xl bg-white p-6 shadow-ys-lg'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-[#111827]'>Nova Redação</h3>
          <button className='text-ys-ink' onClick={onClose} aria-label='Fechar'>
            Fechar
          </button>
        </div>
        <div className='space-y-3'>
          <div>
            <div className='flex items-center justify-between'>
              <label className='block text-sm font-medium text-[#111827]'>
                Arquivo (PDF/Imagem) ou URL
              </label>
              <label className='flex items-center gap-2 text-xs text-ys-ink-2'>
                <input
                  type='checkbox'
                  checked={useUrl}
                  onChange={e => setUseUrl(e.target.checked)}
                />
                Usar URL
              </label>
            </div>
            {!useUrl ? (
              <div>
                <input
                  type='file'
                  accept='application/pdf,image/*'
                  onChange={e => {
                    const selectedFile = e.target.files?.[0] || null;
                    setFile(selectedFile);
                    setFileError(null);
                    if (selectedFile) {
                      const validation = validateFile(selectedFile);
                      if (!validation.valid) {
                        setFileError(validation.error || 'Arquivo inválido');
                      }
                    }
                  }}
                  className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
                  aria-describedby={fileError ? 'file-error' : 'file-help'}
                  disabled={isUploading}
                />
                {file && !fileError && (
                  <p className='mt-1 text-xs text-green-600'>
                    ✓ Arquivo selecionado: {file.name} (
                    {formatFileSize(file.size)})
                  </p>
                )}
                {fileError && (
                  <p
                    id='file-error'
                    className='mt-1 text-xs text-red-600'
                    role='alert'
                  >
                    ⚠ {fileError}
                  </p>
                )}
                <p id='file-help' className='mt-1 text-xs text-ys-ink-2'>
                  Formatos aceitos: PDF, JPG, PNG, GIF, WebP. Tamanho máximo:
                  10MB.
                </p>
              </div>
            ) : (
              <div>
                <input
                  placeholder='https://exemplo.com/redacao.pdf'
                  value={fileUrl}
                  onChange={e => {
                    setFileUrl(e.target.value);
                    setUrlError(null);
                    if (e.target.value.trim()) {
                      const validation = validateFileUrl(e.target.value.trim());
                      if (!validation.valid) {
                        setUrlError(validation.error || 'URL inválida');
                      }
                    }
                  }}
                  className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
                  disabled={isUploading}
                />
                {fileUrl.trim() && !urlError && (
                  <p className='mt-1 text-xs text-green-600'>✓ URL informada</p>
                )}
                {urlError && (
                  <p
                    id='url-error'
                    className='mt-1 text-xs text-red-600'
                    role='alert'
                  >
                    ⚠ {urlError}
                  </p>
                )}
              </div>
            )}
            <p className='mt-1 text-xs text-ys-ink-2'>
              * Obrigatório: selecione um arquivo OU informe uma URL
            </p>
          </div>
          <div>
            <label className='block text-sm font-medium text-[#111827]'>
              Aluno
            </label>
            <input
              placeholder='Buscar aluno...'
              value={q}
              onChange={e => setQ(e.target.value)}
              className='w-full rounded-lg border border-[#E5E7EB] p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
            />
            <div className='max-h-40 overflow-auto rounded-lg border border-[#E5E7EB]'>
              {options.map(o => (
                <button
                  key={o._id || o.id}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F3F4F6] ${studentId === (o._id || o.id) ? 'bg-[#FEF3C7]' : ''}`}
                  onClick={() => {
                    setStudentId(o._id || o.id);
                    setClassId(o.class || o.classId);
                  }}
                >
                  <span className='text-sm text-[#111827]'>{o.name}</span>
                  <span className='ml-2 text-xs text-ys-ink-2'>{o.email}</span>
                </button>
              ))}
              {options.length === 0 && (
                <div className='p-3 text-sm text-ys-ink-2'>
                  Digite para buscar alunos…
                </div>
              )}
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-[#111827]'>
              Tema
            </label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
            />
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Bimestre
              </label>
              <select
                value={bimester}
                onChange={e => setBimester(e.target.value)}
                className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
              >
                <option value=''>Selecione…</option>
                <option value='1'>1º</option>
                <option value='2'>2º</option>
                <option value='3'>3º</option>
                <option value='4'>4º</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Tipo
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
              >
                <option value='PAS'>PAS</option>
                <option value='ENEM'>ENEM</option>
              </select>
            </div>
          </div>
          {/* Barra de progresso */}
          {isUploading && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-ys-ink-2'>Enviando arquivo...</span>
                <span className='font-medium text-orange-600'>{progress}%</span>
              </div>
              <div className='w-full bg-gray-200 rounded-full h-2'>
                <div
                  className='bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out'
                  style={{ width: `${progress}%` }}
                  role='progressbar'
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso do upload: ${progress}%`}
                />
              </div>
            </div>
          )}

          {/* Mensagens de erro */}
          {error && (
            <div
              className='rounded-lg bg-red-50 border border-red-200 p-3'
              role='alert'
            >
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          <div className='mt-2 flex justify-end gap-2'>
            {isUploading ? (
              <button
                className='rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100'
                onClick={cancel}
              >
                Cancelar Upload
              </button>
            ) : (
              <button
                className='rounded-lg border border-[#E5E7EB] px-4 py-2 hover:bg-gray-50 disabled:opacity-50'
                onClick={onClose}
                disabled={isUploading}
              >
                Cancelar
              </button>
            )}
            <button
              className='rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed'
              onClick={submit}
              disabled={loading || isUploading || !!fileError || !!urlError}
              aria-describedby={
                fileError ? 'file-error' : urlError ? 'url-error' : undefined
              }
            >
              {isUploading
                ? `Enviando… ${progress}%`
                : loading
                  ? 'Enviando…'
                  : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
