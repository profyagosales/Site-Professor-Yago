import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ProfileHeader from '@/components/ProfileHeader';
import ScheduleTable from '@/components/ScheduleTable';
import SendEmailModal from '@/components/SendEmailModal';
import QuickContentModal from '@/components/QuickContentModal';
import AnnouncementModal from '@/components/AnnouncementModal';
import ClassSelectorModal from '@/components/ClassSelectorModal';
import { getCurrentUser } from '@/services/auth';
import { api } from '@/services/api';
import { listUpcomingContents } from '@/services/contents';
import { listUpcomingExams } from '@/services/exams';
import { listAnnouncements } from '@/services/announcements';
import AnnouncementList from '@/components/AnnouncementList';
import { getTeacherWeeklySchedule } from '@/services/schedule';
import { listClasses } from '@/services/classes';
import { ROUTES } from '@/routes';
import { useProfessorDashboard } from '@/hooks/useProfessorDashboard';
import { logger } from '@/lib/logger';
import ProximasAulasWidget from '@/components/schedule/ProximasAulasWidget';

function DashboardProfessor() {
  const [user, setUser] = useState(null);
  const [contents, setContents] = useState([]);
  const [exams, setExams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [classSelectorOpen, setClassSelectorOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  // Hook do dashboard com cache
  const {
    summary,
    stats,
    isLoading: dashboardLoading,
    isRefreshing: dashboardRefreshing,
    error: dashboardError,
    refresh: refreshDashboard,
    pendingEssays,
    recentAnnouncements,
    upcomingExams,
    classStats,
    studentStats,
  } = useProfessorDashboard({
    cacheTtlMs: 30000, // 30 segundos
    enableTelemetry: true,
    autoRefetch: true,
  });

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (abort) return;
        setUser(u);
        if (!u?.id) return;

        // Telemetria leve em DEV
        if (process.env.NODE_ENV === 'development') {
          logger.info('prof_summary_view', {
            action: 'dashboard',
            component: 'DashboardProfessor',
            userId: u.id,
            timestamp: new Date().toISOString(),
          });
        }
        const [c, e, a, s, classesData] = await Promise.all([
          listUpcomingContents({ teacherId: u.id }).catch(() => {
            toast.error('Não foi possível carregar conteúdos');
            return [];
          }),
          listUpcomingExams({ teacherId: u.id }).catch(() => {
            toast.error('Não foi possível carregar avaliações');
            return [];
          }),
          listAnnouncements({ teacherId: u.id }).catch(() => {
            toast.error('Não foi possível carregar avisos');
            return [];
          }),
          getTeacherWeeklySchedule(u.id).catch(() => {
            toast.error('Não foi possível carregar horário');
            return [];
          }),
          listClasses({ teacherId: u.id }).catch(() => {
            console.warn('Não foi possível carregar turmas');
            return [];
          }),
        ]);
        if (abort) return;
        setContents(c);
        setExams(e);
        setAnnouncements(a);
        setSchedule(s);
        setClasses(classesData);
      } catch {
        if (!abort) toast.error('Não foi possível carregar usuário');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
    navigate(ROUTES.auth.loginProf);
  };

  const handleViewContents = () => {
    if (classes.length === 0) {
      toast.error('Nenhuma turma encontrada');
      return;
    }
    
    if (classes.length === 1) {
      // Se há apenas uma turma, vai direto para o caderno
      navigate(ROUTES.prof.turmaCaderno(classes[0].id || classes[0]._id));
    } else {
      // Se há múltiplas turmas, abre o modal de seleção
      setClassSelectorOpen(true);
    }
  };

  const handleClassSelect = (classId) => {
    navigate(ROUTES.prof.turmaCaderno(classId));
  };

  const reloadContents = async () => {
    if (!user?.id) return;
    try {
      const data = await listUpcomingContents({ teacherId: user.id });
      setContents(data);
    } catch {
      toast.error('Não foi possível carregar conteúdos');
    }
  };

  const reloadAnnouncements = async () => {
    if (!user?.id) return;
    try {
      const data = await listAnnouncements({ teacherId: user.id });
      setAnnouncements(data);
    } catch {
      toast.error('Não foi possível carregar avisos');
    }
  };

  if (!user)
    return (
      <div className='pt-20 p-md'>
        <p>Carregando...</p>
      </div>
    );

  return (
    <div className='pt-4 p-md space-y-md' data-testid="professor-dashboard">
      <ProfileHeader
        name={user.name}
        subtitle='Professor'
        avatarUrl={user.photoUrl || user.avatarUrl}
        onLogout={handleLogout}
        data-testid="profile-header"
      />

      <div className='flex flex-wrap gap-md' data-testid="action-buttons">
        <button className='ys-btn-primary' onClick={() => setShowEmail(true)} data-testid="send-email-button">
          Enviar e-mail
        </button>
        <button
          className='ys-btn-primary'
          onClick={() => setAnnouncementOpen(true)}
          data-testid="add-announcement-button"
        >
          Adicionar aviso
        </button>
        <button className='ys-btn-primary' onClick={() => setContentOpen(true)} data-testid="add-content-button">
          Adicionar conteúdo
        </button>
      </div>

      {/* Cards de resumo com contagens */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-md' data-testid="summary-cards">
        {/* Redações Pendentes */}
        <div className='ys-card bg-red-50 border-red-200' data-testid="pending-essays-card">
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-red-600 font-semibold'>Redações Pendentes</h3>
            <button
              className='link-primary text-red-600'
              onClick={() => navigate(ROUTES.prof.redacao)}
              data-testid="view-essays-button"
            >
              Ver todas
            </button>
          </div>
          {dashboardLoading ? (
            <div className='animate-pulse'>
              <div className='h-8 bg-red-200 rounded mb-2'></div>
              <div className='h-4 bg-red-200 rounded w-3/4'></div>
            </div>
          ) : (
            <div>
              <div className='text-3xl font-bold text-red-600 mb-1'>
                {summary?.pendingEssays || 0}
              </div>
              <p className='text-sm text-red-600'>
                {summary?.pendingEssays === 1 ? 'redação aguardando' : 'redações aguardando'}
              </p>
            </div>
          )}
        </div>

        {/* Avisos Recentes */}
        <div className='ys-card bg-blue-50 border-blue-200'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-blue-600 font-semibold'>Avisos Recentes</h3>
            <button
              className='link-primary text-blue-600'
              onClick={() => navigate(ROUTES.prof.resumo)}
            >
              Ver todos
            </button>
          </div>
          {dashboardLoading ? (
            <div className='animate-pulse'>
              <div className='h-8 bg-blue-200 rounded mb-2'></div>
              <div className='h-4 bg-blue-200 rounded w-3/4'></div>
            </div>
          ) : (
            <div>
              <div className='text-3xl font-bold text-blue-600 mb-1'>
                {summary?.recentAnnouncements || 0}
              </div>
              <p className='text-sm text-blue-600'>
                {summary?.recentAnnouncements === 1 ? 'aviso recente' : 'avisos recentes'}
              </p>
            </div>
          )}
        </div>

        {/* Próximas Avaliações */}
        <div className='ys-card bg-green-50 border-green-200'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-green-600 font-semibold'>Próximas Avaliações</h3>
            <button
              className='link-primary text-green-600'
              onClick={() => navigate(ROUTES.prof.notasClasse)}
            >
              Ver todas
            </button>
          </div>
          {dashboardLoading ? (
            <div className='animate-pulse'>
              <div className='h-8 bg-green-200 rounded mb-2'></div>
              <div className='h-4 bg-green-200 rounded w-3/4'></div>
            </div>
          ) : (
            <div>
              <div className='text-3xl font-bold text-green-600 mb-1'>
                {summary?.upcomingExams || 0}
              </div>
              <p className='text-sm text-green-600'>
                {summary?.upcomingExams === 1 ? 'avaliação próxima' : 'avaliações próximas'}
              </p>
            </div>
          )}
        </div>

        {/* Total de Alunos */}
        <div className='ys-card bg-purple-50 border-purple-200'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-purple-600 font-semibold'>Total de Alunos</h3>
            <button
              className='link-primary text-purple-600'
              onClick={() => navigate(ROUTES.prof.alunos)}
            >
              Ver todos
            </button>
          </div>
          {dashboardLoading ? (
            <div className='animate-pulse'>
              <div className='h-8 bg-purple-200 rounded mb-2'></div>
              <div className='h-4 bg-purple-200 rounded w-3/4'></div>
            </div>
          ) : (
            <div>
              <div className='text-3xl font-bold text-purple-600 mb-1'>
                {summary?.totalStudents || 0}
              </div>
              <p className='text-sm text-purple-600'>
                {summary?.totalStudents === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Widget de Próximas Aulas */}
      <div className="mb-md">
        <ProximasAulasWidget />
      </div>

      {/* Indicador de refresh em background */}
      {dashboardRefreshing && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-blue-700">Atualizando dados em background...</span>
        </div>
      )}

      {/* Cards detalhados */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-md'>
        <div className='ys-card'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-orange font-semibold'>Próximos conteúdos</h3>
            <button
              className='link-primary'
              onClick={handleViewContents}
            >
              Ver todos
            </button>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : contents.length ? (
            <ul className='space-y-1'>
              {contents.map(c => (
                <li key={c.id} className='text-sm'>
                  {c.title} — {c.className} —{' '}
                  {new Date(c.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-black/60'>Nenhum conteúdo próximo</p>
          )}
        </div>

        <div className='ys-card'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-orange font-semibold'>Próximas Avaliações</h3>
            <button
              className='link-primary'
              onClick={() => navigate(ROUTES.prof.notasClasse)}
            >
              Ver todos
            </button>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : exams.length ? (
            <ul className='space-y-1'>
              {exams.map(e => (
                <li key={e.id} className='text-sm'>
                  {e.title} — {e.className} —{' '}
                  {new Date(e.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-black/60'>Sem avaliações</p>
          )}
        </div>

        <div className='ys-card'>
          <div className='flex items-center justify-between mb-sm'>
            <h3 className='text-orange font-semibold'>Avisos recentes</h3>
            <button
              className='link-primary'
              onClick={() => navigate(ROUTES.prof.resumo)}
            >
              Ver todos
            </button>
          </div>
          <AnnouncementList 
            limit={3}
            onRefresh={reloadAnnouncements}
          />
        </div>

        <ScheduleTable schedules={schedule} />
      </div>

      <SendEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />
      <QuickContentModal
        open={contentOpen}
        onClose={() => setContentOpen(false)}
        onSaved={reloadContents}
      />
      <AnnouncementModal
        open={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
        onSaved={reloadAnnouncements}
      />
      <ClassSelectorModal
        isOpen={classSelectorOpen}
        onClose={() => setClassSelectorOpen(false)}
        onClassSelect={handleClassSelect}
        title="Selecionar Turma"
        description="Escolha uma turma para visualizar o caderno:"
        actionText="Abrir Caderno"
      />
    </div>
  );
}

export default DashboardProfessor;
