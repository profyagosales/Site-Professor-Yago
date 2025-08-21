import { useEffect, useState } from 'react';
import api from '@api';
import { toast } from 'react-toastify';
import EnviarRedacaoModal from '../components/EnviarRedacaoModal';
import { listarRedacoesAluno } from '../services/redacoes';
import CalendarIcon from '../components/icons/CalendarIcon';
import ListIcon from '../components/icons/ListIcon';
import BoardIcon from '../components/icons/BoardIcon';

function DashboardAluno() {
  const [data, setData] = useState({
    evaluations: [],
    schedules: [],
    progress: 0,
  });
  const [redacoes, setRedacoes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get('/dashboard/student');
      setData(res.data);
      const reda = await listarRedacoesAluno();
      setRedacoes(reda);
      setSuccess('Dados carregados');
      toast.success('Dados carregados');
    } catch (err) {
      console.error('Erro ao carregar dashboard', err);
      const message = 'Erro ao carregar dashboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        <div className="card flex items-center">
          <CalendarIcon className="w-6 h-6 text-orange mr-3" />
          <div>
            <p className="font-semibold">Próximas Avaliações</p>
            <p className="text-sm text-black/70">{data.evaluations?.length || 0} agendadas</p>
          </div>
        </div>

        <div className="card flex items-center">
          <ListIcon className="w-6 h-6 text-orange mr-3" />
          <div>
            <p className="font-semibold">Horários de Aula</p>
            <p className="text-sm text-black/70">{data.schedules?.length || 0} próximos</p>
          </div>
        </div>

        <div className="card flex items-center">
          <BoardIcon className="w-6 h-6 text-orange mr-3" />
          <div className="flex-1">
            <p className="font-semibold">Progresso do Curso</p>
            <div className="w-full bg-lightGray rounded-full h-2 mt-1">
              <div className="bg-orange h-2 rounded-full" style={{ width: `${data.progress || 0}%` }}></div>
            </div>
            <p className="text-sm text-black/70 mt-1">{data.progress || 0}% concluído</p>
          </div>
        </div>
      </div>

      <div className="mt-xl">
        <div className="flex justify-between items-center mb-md">
          <h2 className="text-xl font-semibold">Minhas Redações</h2>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Enviar Redação
          </button>
        </div>
        {redacoes.length ? (
          <ul className="space-y-sm">
            {redacoes.map((r) => (
              <li key={r.id} className="flex justify-between p-sm border rounded">
                <span>{new Date(r.date).toLocaleDateString()}</span>
                <span className="font-semibold">{r.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70">Nenhuma redação enviada.</p>
        )}
      </div>

      <EnviarRedacaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}

export default DashboardAluno;
