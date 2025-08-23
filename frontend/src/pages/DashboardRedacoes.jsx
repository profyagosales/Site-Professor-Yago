import { useEffect, useState } from 'react';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import { gradeEssay } from '@/services/essays';
import { toast } from 'react-toastify';
import { toArray } from '@/lib/http';

function DashboardRedacoes() {
  const [tab, setTab] = useState('pendentes');
  const [pendentes, setPendentes] = useState([]);
  const [corrigidas, setCorrigidas] = useState([]);
  const [filters, setFilters] = useState({ bimestre: '', turma: '', aluno: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalEssay, setModalEssay] = useState(null);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
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
    loadPendentes();
  }, []);

  useEffect(() => {
    if (tab !== 'corrigidas') return;
    const loadCorrigidas = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
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
      </div>

      {tab === 'pendentes' && (
        <div className="space-y-md">
          {arrify(pendentes).map((r) => (
            <div
              key={r._id}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-md">
                <img
                  src={r.student?.photo}
                  alt={r.student?.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">
                    {r.student?.rollNumber ? `Nº ${r.student.rollNumber}` : r.student?.name}
                  </p>
                  <p className="text-sm text-black/70">
                    {r.class?.series}ª{r.class?.letter} •
                    {' '}
                    {new Date(r.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button className="btn-primary" onClick={() => setModalEssay(r)}>Corrigir</button>
            </div>
          ))}
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
            {arrify(corrigidas).map((r) => (
              <div
                key={r._id}
                className="card flex items-center justify-between"
              >
                <div className="flex items-center gap-md">
                  <img
                    src={r.student?.photo}
                    alt={r.student?.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">
                      {r.student?.rollNumber ? `Nº ${r.student.rollNumber}` : r.student?.name}
                    </p>
                    <p className="text-sm text-black/70">
                      {r.class?.series}ª{r.class?.letter} •
                      {' '}
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                  <button className="btn-secondary">Visualizar</button>
                </div>
              ))}
            </div>
        </div>
      )}

      {modalEssay && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-md space-y-md">
            <p>Corrigir redação</p>
            <button
              className="btn-primary"
              onClick={async () => {
                const fd = new FormData();
                fd.append('bimestreWeight', '1');
                if (modalEssay.type === 'ENEM') {
                  ['c1','c2','c3','c4','c5'].forEach(k => fd.append(`enemCompetencies[${k}]`, '0'));
                } else {
                  fd.append('pasBreakdown[NC]', '0');
                  fd.append('pasBreakdown[NE]', '0');
                  fd.append('pasBreakdown[NL]', '1');
                }
                await gradeEssay(modalEssay._id, fd);
                setModalEssay(null);
              }}
            >
              Enviar
            </button>
            <button className="btn-secondary" onClick={() => setModalEssay(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardRedacoes;
