import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { pickData, toArray } from '@/services/api';
import { toast } from 'react-toastify';
import SendEmailModal from '@/components/SendEmailModal';
import NotificationsPanel from '@/components/NotificationsPanel';
import CalendarIcon from '@/components/icons/CalendarIcon';
import ListIcon from '@/components/icons/ListIcon';
import BoardIcon from '@/components/icons/BoardIcon';

function DashboardProfessor() {
  const [evaluations, setEvaluations] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await api.get('/dashboard');
        const data = (pickData ? pickData(res) : (res?.data?.data ?? res?.data ?? res)) || {};
        const arrify = toArray ? toArray : (v) => (Array.isArray(v) ? v : v ? [v] : []);
        setEvaluations(arrify(data.upcomingEvaluations || data.evaluations));
        setSchedule(arrify(data.schedule || data.schedules));
        setProgress(data.contentProgress ?? data.progress ?? 0);
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

    fetchData();
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
      <div className="flex gap-md mb-md">
        <button className="btn-primary" onClick={() => setShowEmailModal(true)}>
          Enviar e-mail
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate('/dashboard-redacoes')}
        >
          Redações
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        <div className="card flex items-center">
          <CalendarIcon className="w-6 h-6 text-orange mr-3" />
          <div>
            <p className="font-semibold">Próximas Avaliações</p>
            <p className="text-sm text-black/70">
              {evaluations.length || 0} agendadas
            </p>
          </div>
        </div>

        <div className="card flex items-center">
          <ListIcon className="w-6 h-6 text-orange mr-3" />
          <div>
            <p className="font-semibold">Horários de Aula</p>
            <p className="text-sm text-black/70">
              {schedule.length || 0} próximos
            </p>
          </div>
        </div>

        <div className="card flex items-center">
          <BoardIcon className="w-6 h-6 text-orange mr-3" />
          <div className="flex-1">
            <p className="font-semibold">Progresso do Conteúdo</p>
            <div className="w-full bg-lightGray rounded-full h-2 mt-1">
              <div
                className="bg-orange h-2 rounded-full"
                style={{ width: `${progress || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-black/70 mt-1">
              {progress || 0}% concluído
            </p>
          </div>
        </div>
      </div>
      <div className="mt-md">
        <NotificationsPanel />
      </div>
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
}

export default DashboardProfessor;
