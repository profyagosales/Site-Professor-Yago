import { useEffect, useState } from 'react';
import axios from 'axios';
import SendEmailModal from '../components/SendEmailModal';

function DashboardProfessor() {
  const [data, setData] = useState({
    evaluations: [],
    schedules: [],
    progress: 0,
  });
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/dashboard/teacher', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setData(res.data);
      } catch (err) {
        console.error('Erro ao carregar dashboard', err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pt-20 p-md">
      <button
        className="mb-md px-4 py-2 bg-orange text-white rounded"
        onClick={() => setShowEmailModal(true)}
      >
        Enviar e-mail
      </button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="flex items-center p-md rounded-lg bg-white/30 backdrop-blur-md border border-white/20 shadow-subtle">
          <svg
            className="w-6 h-6 text-orange mr-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z"></path>
          </svg>
          <div>
            <p className="font-semibold">Próximas Avaliações</p>
            <p className="text-sm text-black/70">
              {data.evaluations?.length || 0} agendadas
            </p>
          </div>
        </div>

        <div className="flex items-center p-md rounded-lg bg-white/30 backdrop-blur-md border border-white/20 shadow-subtle">
          <svg
            className="w-6 h-6 text-orange mr-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"></path>
            <circle cx="12" cy="12" r="9"></circle>
          </svg>
          <div>
            <p className="font-semibold">Horários de Aula</p>
            <p className="text-sm text-black/70">
              {data.schedules?.length || 0} próximos
            </p>
          </div>
        </div>

        <div className="flex items-center p-md rounded-lg bg-white/30 backdrop-blur-md border border-white/20 shadow-subtle">
          <svg
            className="w-6 h-6 text-orange mr-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2 2 4-4m0 6l2 2 4-4m0 6l2 2 4-4"></path>
          </svg>
          <div className="flex-1">
            <p className="font-semibold">Progresso do Conteúdo</p>
            <div className="w-full bg-lightGray rounded-full h-2 mt-1">
              <div
                className="bg-orange h-2 rounded-full"
                style={{ width: `${data.progress || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-black/70 mt-1">
              {data.progress || 0}% concluído
            </p>
          </div>
        </div>
      </div>
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
}

export default DashboardProfessor;
