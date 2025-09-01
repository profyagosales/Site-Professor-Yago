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

export default function NovaRedacaoModal({ isOpen, onClose, onCreated }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [theme, setTheme] = useState<{ id?: string; name: string }>({ name: '' });
  const [type, setType] = useState<'ENEM' | 'PAS'>('ENEM');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStudentQuery('');
      setStudentOptions([]);
      setSelectedStudent(null);
      setTheme({ name: '' });
      setType('ENEM');
      setFile(null);
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
        const r = await searchStudents({ q: studentQuery, page: 1, pageSize: 10 });
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
    if (!file) {
      setError('Selecione um PDF');
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
      fd.append('type', type);
      if (theme?.id) fd.append('themeId', theme.id);
      else fd.append('customTheme', theme.name);
      fd.append('file', file);
      await api.post('/essays', fd);
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
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-ys-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Nova Redação</h3>
          <button onClick={onClose} className="text-ys-ink" aria-label="Fechar">
            Fechar
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Aluno</label>
            <input
              placeholder="Buscar aluno..."
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="mb-2 w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="max-h-40 overflow-auto rounded-lg border border-[#E5E7EB]">
              {studentOptions.map((s) => (
                <button
                  type="button"
                  key={s._id || s.id}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F3F4F6] ${
                    selectedStudent && (selectedStudent._id || selectedStudent.id) === (s._id || s.id)
                      ? 'bg-[#FEF3C7]'
                      : ''
                  }`}
                  onClick={() => setSelectedStudent(s)}
                >
                  <span className="text-sm text-[#111827]">{s.name}</span>
                  <span className="ml-2 text-xs text-ys-ink-2">{s.email}</span>
                </button>
              ))}
              {studentOptions.length === 0 && (
                <div className="p-3 text-sm text-ys-ink-2">Digite para buscar alunos…</div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Tema</label>
            <ThemeCombo allowCreate value={theme} onChange={setTheme} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'ENEM' | 'PAS')}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ENEM">ENEM</option>
              <option value="PAS">PAS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E5E7EB] px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

