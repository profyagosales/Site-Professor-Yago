import { useEffect, useState } from 'react';
import { listarPendentes, listarCorrigidas } from '../services/redacoes';
import { toast } from 'react-toastify';

function DashboardRedacoes() {
  const [tab, setTab] = useState('pendentes');
  const [pendentes, setPendentes] = useState([]);
  const [corrigidas, setCorrigidas] = useState([]);
  const [filters, setFilters] = useState({ bimestre: '', turma: '', aluno: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadPendentes = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await listarPendentes();
        setPendentes(data.redacoes || []);
        setSuccess('Dados carregados');
        toast.success('Dados carregados');
      } catch (err) {
        console.error('Erro ao carregar pendentes', err);
        const message = 'Erro ao carregar pendentes';
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
      setSuccess(null);
      try {
        const params = {};
        if (filters.bimestre) params.bimestre = filters.bimestre;
        if (filters.turma) params.turma = filters.turma;
        if (filters.aluno) params.aluno = filters.aluno;
        const data = await listarCorrigidas(params);
        setCorrigidas(data.redacoes || []);
        setSuccess('Dados carregados');
        toast.success('Dados carregados');
      } catch (err) {
        console.error('Erro ao carregar corrigidas', err);
        const message = 'Erro ao carregar corrigidas';
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
          {pendentes.map((r) => (
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
              <button className="btn-primary">Corrigir</button>
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
            {corrigidas.map((r) => (
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
    </div>
  );
}

export default DashboardRedacoes;
