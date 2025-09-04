import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/services/api';
import { searchStudents } from '@/services/students2';
import ThemeCombo from '@/components/redacao/ThemeCombo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NovaRedacaoModal({
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [theme, setTheme] = useState<{ id?: string; name: string }>({
    name: '',
  });
  const [type, setType] = useState<'ENEM' | 'PAS'>('ENEM');
  const [bimester, setBimester] = useState(1);
  const [useUrl, setUseUrl] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStudentQuery('');
      setStudentOptions([]);
      setSelectedStudent(null);
      setTheme({ name: '' });
      setType('ENEM');
      setBimester(1);
      setUseUrl(false);
      setFile(null);
      setUrl('');
      setError(null);
      setTimeout(() => dialogRef.current?.querySelector('input')?.focus(), 0);
    }
  }, [isOpen]);

  // themes now loaded via ThemeCombo

  useEffect(() => {
    if (!studentQuery) {
      setStudentOptions([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await searchStudents({
          q: studentQuery,
          page: 1,
          pageSize: 10,
        });
        if (!alive) return;
        const items = Array.isArray(r?.items) ? r.items : [];
        setStudentOptions(items);
      } catch {
        if (alive) setStudentOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentQuery]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    // Validação: arquivo OU URL
    if (!useUrl && !file) {
      setError('Selecione um arquivo ou marque "Usar URL".');
      return;
    }
    if (useUrl && !url?.trim()) {
      setError('Informe a URL do arquivo.');
      return;
    }
    if (!selectedStudent) {
      setError('Selecione um aluno');
      return;
    }
    if (!theme?.id && !theme.name.trim()) {
      setError('Selecione o tema');
      return;
    }

    setError(null);
    try {
      setLoading(true);
      const fd = new FormData();
      const sid = selectedStudent._id || selectedStudent.id;
      fd.append('studentId', sid);

      if (selectedStudent.class || selectedStudent.classId) {
        fd.append('classId', selectedStudent.class || selectedStudent.classId);
      }

      // Campo 'topic' conforme backend espera
      if (theme?.id) {
        fd.append('themeId', theme.id); // se suportado
      }
      fd.append('topic', theme.name.trim()); // sempre enviar topic

      fd.append('type', type);
      fd.append('bimester', String(bimester));

      // Arquivo OU URL (não os dois)
      if (useUrl) {
        fd.append('fileUrl', url.trim());
      } else if (file) {
        // Nome correto do campo conforme multer.single('file')
        fd.append('file', file);
      }

      // ⚠️ NÃO force Content-Type - deixe o Axios setar o boundary
      await api.post('/uploads/essay', fd);
      toast.success('Redação criada');
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao enviar';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
    >
      <div className='w-full max-w-xl rounded-2xl bg-white p-6 shadow-ys-lg space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-[#111827]'>Nova Redação</h3>
          <button onClick={onClose} className='text-ys-ink' aria-label='Fechar'>
            Fechar
          </button>
        </div>
        <form className='space-y-3' onSubmit={handleSubmit}>
          <div>
            <label className='block text-sm font-medium text-[#111827]'>
              Aluno
            </label>
            <input
              placeholder='Buscar aluno...'
              value={studentQuery}
              onChange={e => setStudentQuery(e.target.value)}
              className='mb-2 w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
            />
            <div className='max-h-40 overflow-auto rounded-lg border border-[#E5E7EB]'>
              {studentOptions.map(s => (
                <button
                  type='button'
                  key={s._id || s.id}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F3F4F6] ${
                    selectedStudent &&
                    (selectedStudent._id || selectedStudent.id) ===
                      (s._id || s.id)
                      ? 'bg-[#FEF3C7]'
                      : ''
                  }`}
                  onClick={() => setSelectedStudent(s)}
                >
                  <span className='text-sm text-[#111827]'>{s.name}</span>
                  <span className='ml-2 text-xs text-ys-ink-2'>{s.email}</span>
                </button>
              ))}
              {studentOptions.length === 0 && (
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
            <ThemeCombo allowCreate value={theme} onChange={setTheme} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Tipo
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'ENEM' | 'PAS')}
                className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
              >
                <option value='ENEM'>ENEM</option>
                <option value='PAS'>PAS</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Bimestre
              </label>
              <select
                value={bimester}
                onChange={e => setBimester(Number(e.target.value))}
                className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
              >
                <option value={1}>1º Bimestre</option>
                <option value={2}>2º Bimestre</option>
                <option value={3}>3º Bimestre</option>
                <option value={4}>4º Bimestre</option>
              </select>
            </div>
          </div>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <input
                type='checkbox'
                id='useUrl'
                checked={useUrl}
                onChange={e => setUseUrl(e.target.checked)}
                className='rounded'
              />
              <label
                htmlFor='useUrl'
                className='text-sm font-medium text-[#111827]'
              >
                Usar URL em vez de arquivo
              </label>
            </div>
            {useUrl ? (
              <div>
                <label className='block text-sm font-medium text-[#111827]'>
                  URL do arquivo
                </label>
                <input
                  type='url'
                  placeholder='https://exemplo.com/arquivo.pdf'
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
            ) : (
              <div>
                <label className='block text-sm font-medium text-[#111827]'>
                  Upload PDF
                </label>
                <input
                  type='file'
                  accept='application/pdf,image/*'
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className='w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
            )}
          </div>
          {error && <p className='text-sm text-red-600'>{error}</p>}
          <div className='flex justify-end gap-2 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-lg border border-[#E5E7EB] px-4 py-2'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={loading}
              className='rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50'
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
