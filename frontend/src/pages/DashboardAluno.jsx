import { useEffect, useState } from 'react';
import axios from 'axios';
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

  const loadRedacoes = async () => {
    try {
      const res = await listarRedacoesAluno();
      setRedacoes(res);
    } catch (err) {
      console.error('Erro ao carregar redações', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/dashboard/student', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setData(res.data);
      } catch (err) {
        console.error('Erro ao carregar dashboard', err);
      }
    };

    fetchData();
    loadRedacoes();
  }, []);

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
          loadRedacoes();
        }}
      />
    </div>
  );
}

export default DashboardAluno;
