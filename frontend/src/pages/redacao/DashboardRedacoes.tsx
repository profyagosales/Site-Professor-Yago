import { useEffect, useState } from 'react';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import { gradeEssay, sendCorrectionEmail } from '@/services/essays.service';
import { toast } from 'react-toastify';
import { toArray, api } from '@/lib/api';
import { FaPen } from 'react-icons/fa';
import NovaRedacaoModal from './NovaRedacaoModal';
import Avatar from '@/components/Avatar';
import ThemeCombo from '@/components/redacao/ThemeCombo';
import { FaFilePdf } from 'react-icons/fa';
import { searchStudents } from '@/services/students2';

function DashboardRedacoes() {
  const [tab, setTab] = useState('pendentes');
  const [pendentes, setPendentes] = useState([]);
  const [corrigidas, setCorrigidas] = useState([]);
  const [filters, setFilters] = useState({ bimestre: '', turma: '', aluno: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalEssay, setModalEssay] = useState(null);
  const [editEssay, setEditEssay] = useState<any>(null);
  const [editTheme, setEditTheme] = useState<{ id?: string; name: string }>({ name: '' });
  const [editBimester, setEditBimester] = useState('');
  const [editType, setEditType] = useState<'ENEM' | 'PAS'>('PAS');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editStudentQuery, setEditStudentQuery] = useState('');
  const [editStudentOptions, setEditStudentOptions] = useState<any[]>([]);
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (editEssay) {
      setEditTheme({
        id: editEssay.theme?._id || editEssay.theme?.id,
        name: editEssay.customTheme || editEssay.theme?.name || '',
      });
      setEditBimester(editEssay.bimester ? String(editEssay.bimester) : '');
      setEditType(editEssay.type || 'PAS');
      setEditFile(null);
      setEditStudent(editEssay.student || null);
      setEditStudentQuery(editEssay.student?.name || '');
    }
  }, [editEssay]);

  useEffect(() => {
    if (!editStudentQuery) {
      setEditStudentOptions([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await searchStudents({ q: editStudentQuery, page: 1, pageSize: 10 });
        if (!alive) return;
        setEditStudentOptions(Array.isArray(r?.items) ? r.items : []);
      } catch {
        if (alive) setEditStudentOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editStudentQuery]);

  async function handleSendEmail(id: string) {
    try {
      await sendCorrectionEmail(id);
      const sentAt = new Date().toISOString();
      setPendentes((prev) => prev.map((p) => (p._id === id ? { ...p, lastEmailSentAt: sentAt } : p)));
      setCorrigidas((prev) => prev.map((c) => (c._id === id ? { ...c, lastEmailSentAt: sentAt } : c)));
      toast.success('Email enviado');
    } catch (err: any) {
      console.error('Erro ao enviar email', err);
      const message = err.response?.data?.message ?? 'Erro ao enviar email';
      toast.error(message);
    }
  }

  async function handleUpdateEssay() {
    if (!editEssay) return;
    try {
      const fd = new FormData();
      if (editStudent) {
        fd.append('studentId', editStudent._id || editStudent.id);
      }
      if (editTheme?.id) fd.append('themeId', editTheme.id);
      else if (editTheme.name) fd.append('customTheme', editTheme.name);
      if (editBimester) fd.append('bimester', editBimester);
      if (editType) fd.append('type', editType);
      if (editFile) fd.append('file', editFile);
      const res = await api.put(`/essays/${editEssay._id}`, fd);
      const updated = res.data;
      setPendentes((prev) => prev.map((p) => (p._id === editEssay._id ? { ...p, ...updated } : p)));
      setCorrigidas((prev) => prev.map((c) => (c._id === editEssay._id ? { ...c, ...updated } : c)));
      toast.success('Redação atualizada');
      setEditEssay(null);
    } catch (err: any) {
      console.error('Erro ao atualizar redação', err);
      const message = err.response?.data?.message ?? 'Erro ao atualizar redação';
      toast.error(message);
    }
  }

  const loadPendentes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPendentes();
      setPendentes(arrify(data.redacoes));
      toast.success('Dados carregados');
    } catch (err) {
      console.error('Erro ao carregar pendentes', err);
      const message = err.response?.data?.message ?? 'Erro ao carregar pendentes';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendentes();
  }, []);

  useEffect(() => {
    if (tab !== 'corrigidas') return;
    const loadCorrigidas = async () => {
      setLoading(true);
      setError(null);
      try {
  const params: any = {};
        if (filters.bimestre) params.bimestre = filters.bimestre;
        if (filters.turma) params.turma = filters.turma;
        if (filters.aluno) params.aluno = filters.aluno;
        const data = await listarCorrigidas(params);
        setCorrigidas(arrify(data.redacoes));
        toast.success('Dados carregados');
      } catch (err) {
        console.error('Erro ao carregar corrigidas', err);
        const message = err.response?.data?.message ?? 'Erro ao carregar corrigidas';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadCorrigidas();
  }, [tab, filters]);

  if (loading) {
    return (
      <div className="pt-20 p-md">
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 p-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="pt-20 p-md">
      <div className="flex gap-md mb-md">
        <button
          className={`px-4 py-2 rounded ${tab === 'pendentes' ? 'bg-orange text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('pendentes')}
        >
          Pendentes
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'corrigidas' ? 'bg-orange text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('corrigidas')}
        >
          Corrigidas
        </button>
        <button className="ys-btn-primary ml-auto" onClick={() => setNewModalOpen(true)}>
          Nova redação
        </button>
      </div>

      {tab === 'pendentes' && (
        <div className="space-y-md">
          {arrify(pendentes).map((r) => {
            const photo = r.student?.photoUrl || r.student?.avatarUrl || r.student?.photo;
            return (
              <div
                key={r._id}
                className="ys-card flex items-center justify-between"
              >
                <div className="flex items-center gap-md">
                  <Avatar
                    src={photo}
                    name={r.student?.name}
                    className="w-12 h-12"
                  />
                  <div>
                    <p className="font-semibold">
                      {r.student?.rollNumber ? `Nº ${r.student.rollNumber}` : r.student?.name}
                    </p>
                    <p className="text-sm text-black/70">{r.theme?.name || r.customTheme || '-'}</p>
                    <p className="text-sm text-black/70">
                      {r.class?.series}ª{r.class?.letter} •{' '}
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-md">
                  {r.lastEmailSentAt ? (
                    <>
                      <span className="text-green-600">Enviado</span>
                      <button className="ys-btn-ghost" onClick={() => handleSendEmail(r._id)}>
                        Enviar novamente
                      </button>
                    </>
                  ) : (
                    <button className="ys-btn-ghost" onClick={() => handleSendEmail(r._id)}>
                      Enviar por e-mail
                    </button>
                  )}
                  <a
                    className="ys-btn-ghost"
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Arquivo"
                  >
                    <FaFilePdf />
                  </a>
                  <button className="ys-btn-ghost" onClick={() => setEditEssay(r)} aria-label="Editar">
                    <FaPen />
                  </button>
                  <button className="ys-btn-primary" onClick={() => setModalEssay(r)}>
                    Corrigir
                  </button>
                </div>
              </div>
            );
          })}
          </div>
      )}

      {tab === 'corrigidas' && (
        <div>
          <div className="flex gap-md mb-md">
            <select
              value={filters.bimestre}
              onChange={(e) => setFilters({ ...filters, bimestre: e.target.value })}
              className="border rounded px-2 py-1"
            >
              <option value="">Bimestre</option>
              <option value="1">1º</option>
              <option value="2">2º</option>
              <option value="3">3º</option>
              <option value="4">4º</option>
            </select>
            <input
              value={filters.turma}
              onChange={(e) => setFilters({ ...filters, turma: e.target.value })}
              placeholder="Turma"
              className="border rounded px-2 py-1"
            />
            <input
              value={filters.aluno}
              onChange={(e) => setFilters({ ...filters, aluno: e.target.value })}
              placeholder="Aluno"
              className="border rounded px-2 py-1"
            />
          </div>
          <div className="space-y-md">
            {arrify(corrigidas).map((r) => {
              const photo = r.student?.photoUrl || r.student?.avatarUrl || r.student?.photo;
              return (
                <div
                  key={r._id}
                  className="ys-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-md">
                    <Avatar
                      src={photo}
                      name={r.student?.name}
                      className="w-12 h-12"
                    />
                    <div>
                      <p className="font-semibold">
                        {r.student?.rollNumber ? `Nº ${r.student.rollNumber}` : r.student?.name}
                      </p>
                      <p className="text-sm text-black/70">{r.theme?.name || r.customTheme || '-'}</p>
                      <p className="text-sm text-black/70">
                        {r.class?.series}ª{r.class?.letter} •{' '}
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    {r.lastEmailSentAt ? (
                      <>
                        <span className="text-green-600">Enviado</span>
                        <button className="ys-btn-ghost" onClick={() => handleSendEmail(r._id)}>
                          Enviar novamente
                        </button>
                      </>
                    ) : (
                      <button className="ys-btn-ghost" onClick={() => handleSendEmail(r._id)}>
                        Enviar por e-mail
                      </button>
                    )}
                    <a
                      className="ys-btn-ghost"
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Arquivo"
                    >
                      <FaFilePdf />
                    </a>
                    <button className="ys-btn-ghost" onClick={() => setEditEssay(r)} aria-label="Editar">
                      <FaPen />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
        </div>
      )}
      {newModalOpen && (
        <NovaRedacaoModal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          onCreated={loadPendentes}
        />
      )}

      {modalEssay && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-md space-y-md">
            <p>Corrigir redação</p>
            <button
              className="ys-btn-primary"
              onClick={async () => {
                const essayType = modalEssay.type === 'ENEM' ? 'ENEM' : 'PAS';
                if (essayType === 'ENEM') {
                  await gradeEssay(modalEssay._id, {
                    essayType: 'ENEM',
                    weight: 1,
                    annul: false,
                    enemCompetencies: { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 },
                    comments: '',
                  });
                } else {
                  await gradeEssay(modalEssay._id, {
                    essayType: 'PAS',
                    weight: 1,
                    annul: false,
                    pas: { NC: 0, NL: 1 },
                    comments: '',
                  });
                }
                setModalEssay(null);
              }}
            >
              Enviar
            </button>
            <button className="ys-btn-ghost" onClick={() => setModalEssay(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {editEssay && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-md space-y-md w-full max-w-md">
            <p className="font-semibold">Editar redação</p>
            <div>
              <label className="block text-sm font-medium">Aluno</label>
              <input
                value={editStudentQuery}
                onChange={(e) => setEditStudentQuery(e.target.value)}
                placeholder="Buscar aluno..."
                className="w-full border rounded px-2 py-1 mb-1"
              />
              <div className="max-h-40 overflow-auto border rounded">
                {editStudentOptions.map((s) => (
                  <button
                    type="button"
                    key={s._id || s.id}
                    className={`w-full text-left px-2 py-1 hover:bg-[#F3F4F6] ${
                      editStudent && (editStudent._id || editStudent.id) === (s._id || s.id)
                        ? 'bg-[#FEF3C7]'
                        : ''
                    }`}
                    onClick={() => setEditStudent(s)}
                  >
                    {s.name}
                  </button>
                ))}
                {editStudentOptions.length === 0 && (
                  <div className="p-2 text-sm text-ys-ink-2">Digite para buscar alunos…</div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Tema</label>
              <ThemeCombo allowCreate value={editTheme} onChange={setEditTheme} />
            </div>
            <select
              value={editBimester}
              onChange={(e) => setEditBimester(e.target.value)}
              className="w-full border rounded px-2 py-1"
            >
              <option value="">Bimestre</option>
              <option value="1">1º</option>
              <option value="2">2º</option>
              <option value="3">3º</option>
              <option value="4">4º</option>
            </select>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              className="w-full border rounded px-2 py-1"
            >
              <option value="ENEM">ENEM</option>
              <option value="PAS">PAS</option>
            </select>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setEditFile(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end gap-md">
              <button className="ys-btn-primary" onClick={handleUpdateEssay}>
                Salvar
              </button>
              <button className="ys-btn-ghost" onClick={() => setEditEssay(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardRedacoes;
