import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { uploadEssay } from '@/services/uploads';
import { searchStudents } from '@/services/students2';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultClassId?: string;
  onSuccess: () => void; // recarrega pendentes
};

export default function NewEssayModal({ open, onClose, defaultStudentId, defaultClassId, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState<string | undefined>(defaultStudentId);
  const [classId, setClassId] = useState<string | undefined>(defaultClassId);
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useUrl, setUseUrl] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [bimester, setBimester] = useState('');
  const [type, setType] = useState<'ENEM'|'PAS'>('PAS');

  useEffect(() => {
    if (open) {
      setTimeout(() => dialogRef.current?.querySelector('input')?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!q) { setOptions([]); return; }
        const r = await searchStudents({ q, classId, page: 1, pageSize: 10 });
        if (!alive) return;
        const items = Array.isArray(r?.items) ? r.items : [];
        setOptions(items);
      } catch {/* ignore */}
    })();
    return () => { alive = false };
  }, [q, classId]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  async function submit() {
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
    
    setError(null);
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
      
      // POST /api/uploads/essay (sem Content-Type; deixe o browser definir o boundary)
      await uploadEssay(fd);
      toast.success('Redação enviada');
      onSuccess(); // fechar modal, inserir item na lista, toast "Redação enviada"
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Erro ao enviar';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={onKey}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-ys-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Nova Redação</h3>
          <button className="text-ys-ink" onClick={onClose} aria-label="Fechar">Fechar</button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[#111827]">Arquivo (PDF/Imagem) ou URL</label>
              <label className="flex items-center gap-2 text-xs text-ys-ink-2">
                <input type="checkbox" checked={useUrl} onChange={e=> setUseUrl(e.target.checked)} /> 
                Usar URL
              </label>
            </div>
            {!useUrl ? (
              <div>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  onChange={e => setFile(e.target.files?.[0] || null)} 
                  className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                />
                {file && (
                  <p className="mt-1 text-xs text-green-600">✓ Arquivo selecionado: {file.name}</p>
                )}
              </div>
            ) : (
              <div>
                <input 
                  placeholder="https://exemplo.com/redacao.pdf" 
                  value={fileUrl} 
                  onChange={e=> setFileUrl(e.target.value)} 
                  className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                />
                {fileUrl.trim() && (
                  <p className="mt-1 text-xs text-green-600">✓ URL informada</p>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-ys-ink-2">* Obrigatório: selecione um arquivo OU informe uma URL</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Aluno</label>
            <input
              placeholder="Buscar aluno..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="max-h-40 overflow-auto rounded-lg border border-[#E5E7EB]">
              {options.map(o => (
                <button key={o._id || o.id} className={`w-full text-left px-3 py-2 hover:bg-[#F3F4F6] ${studentId === (o._id || o.id) ? 'bg-[#FEF3C7]' : ''}`} onClick={() => { setStudentId(o._id || o.id); setClassId(o.class || o.classId); }}>
                  <span className="text-sm text-[#111827]">{o.name}</span>
                  <span className="ml-2 text-xs text-ys-ink-2">{o.email}</span>
                </button>
              ))}
              {options.length === 0 && <div className="p-3 text-sm text-ys-ink-2">Digite para buscar alunos…</div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Tema</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Bimestre</label>
              <select value={bimester} onChange={e=> setBimester(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Selecione…</option>
                <option value="1">1º</option>
                <option value="2">2º</option>
                <option value="3">3º</option>
                <option value="4">4º</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827]">Tipo</label>
              <select value={type} onChange={e=> setType(e.target.value as any)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="PAS">PAS</option>
                <option value="ENEM">ENEM</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button className="rounded-lg border border-[#E5E7EB] px-4 py-2" onClick={onClose}>Cancelar</button>
            <button className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50" onClick={submit} disabled={loading}>{loading ? 'Enviando…' : 'Enviar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
