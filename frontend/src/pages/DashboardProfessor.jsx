import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { pickData, toArray } from '@api';
import { toast } from 'react-toastify';
import SendEmailModal from '@/components/SendEmailModal';
import AvisosCard from '@/components/AvisosCard';
import NewContentModal from '@/components/NewContentModal';
import CalendarIcon from '@/components/icons/CalendarIcon';
import ListIcon from '@/components/icons/ListIcon';
import BoardIcon from '@/components/icons/BoardIcon';
import { listClasses } from '@/services/classes';

function DashboardProfessor() {
  const [evaluations, setEvaluations] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [contentProgress, setContentProgress] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [dashRes, classRes] = await Promise.all([
        api.get('/dashboard'),
        listClasses().catch(() => []),
      ]);
      const data =
        (pickData ? pickData(dashRes) : dashRes?.data?.data ?? dashRes?.data ?? dashRes) ||
        {};
      const arrify = (v) => {
        const r = toArray ? toArray(v) : undefined;
        return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
      };
      setEvaluations(arrify(data.upcomingEvaluations || data.evaluations));
      setSchedule(arrify(data.schedule || data.schedules));
      const clsMap = arrify(classRes).reduce((acc, c) => {
        acc[c.classId] = c;
        return acc;
      }, {});
      const progressArr = arrify(data.contentProgress).map((p) => ({
        ...p,
        completion: p.completion ?? p.progress ?? 0,
        className: clsMap[p.classId]
          ? `Turma ${clsMap[p.classId].series}${clsMap[p.classId].letter} - ${clsMap[p.classId].discipline}`
          : p.classId,
      }));
      setContentProgress(progressArr);
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
    loadDashboard();
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

        <div className="card">
          <div className="flex items-start">
            <BoardIcon className="w-6 h-6 text-orange mr-3 mt-1" />
            <div className="flex-1">
              <p className="font-semibold">Progresso do Conteúdo</p>
              <div className="space-y-sm mt-2">
                {contentProgress.map((p) => (
                  <div key={p.classId}>
                    <div className="flex justify-between text-sm">
                      <span>{p.className}</span>
                      <span>{Math.round(p.completion)}%</span>
                    </div>
                    <div className="w-full bg-lightGray rounded-full h-2">
                      <div
                        className="bg-orange h-2 rounded-full"
                        style={{ width: `${p.completion}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-sm mt-md">
                <button
                  className="btn-primary flex-1"
                  onClick={() => navigate('/conteudos')}
                >
                  Gerenciar conteúdos
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => setShowContentModal(true)}
                >
                  Novo conteúdo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-md">
        <AvisosCard />
      </div>
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
      <NewContentModal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}

export default DashboardProfessor;
