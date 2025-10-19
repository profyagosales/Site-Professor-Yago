import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { classColor, resolveClassColors } from '@/utils/classColor';
import { getClassDetails } from '@/services/classes.service';
import { TurmaResumo } from './TurmaResumo';
import { NotasTab } from './NotasTab';
import { NotasTabela } from '@/components/grades/NotasTabela';
import AnnouncementModal from '@/components/AnnouncementModal';

type TabKey = 'resumo' | 'alunos' | 'notas';

export default function TurmaPage() {
  const params = useParams();
  const navigate = useNavigate();
  const classId = params.id || params.classId;
  const [activeTab, setActiveTab] = useState<TabKey>('resumo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState<any>(null);

  useEffect(() => {
    if (!classId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await getClassDetails(classId);
        if (!alive) return;
        setClassInfo(detail);
      } catch (err) {
        console.error('Erro ao carregar detalhes da turma', err);
        if (alive) setError('Não foi possível carregar esta turma.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId]);

  const colors = useMemo(() => {
    if (!classInfo) return classColor(classId);
    return resolveClassColors(classInfo.color ?? null, classInfo.id || classId);
  }, [classInfo, classId]);

  const handleCreateAnnouncement = useCallback(() => {
    setAnnouncementDraft(null);
    setAnnouncementOpen(true);
  }, []);

  const handleEditAnnouncement = useCallback((announcement: any) => {
    setAnnouncementDraft(announcement);
    setAnnouncementOpen(true);
  }, []);

  if (!classId) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-3xl px-6 text-slate-600">Identificador de turma ausente.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:px-8">
        <button
          type="button"
          onClick={() => navigate('/professor/classes')}
          className="w-fit text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          ← Voltar para turmas
        </button>

        <header
          className="relative overflow-hidden rounded-3xl p-8 shadow-sm"
          style={{ background: colors.background, color: colors.textColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/20" />
          <div className="relative flex flex-col gap-3">
            <div className="text-sm font-semibold uppercase tracking-wide opacity-80">Turma</div>
            <h1 className="text-3xl font-semibold leading-tight">
              {classInfo?.name || 'Turma'}
            </h1>
            <p className="text-sm opacity-80">{classInfo?.discipline || classInfo?.subject || 'Disciplina não informada'}</p>
            <div className="flex flex-wrap gap-3 text-sm font-medium">
              <span className="rounded-full bg-white/30 px-3 py-1 backdrop-blur-sm">
                {classInfo?.studentsCount ?? 0} aluno{(classInfo?.studentsCount ?? 0) === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-white/30 px-3 py-1 backdrop-blur-sm">
                {classInfo?.teachersCount ?? 0} docente{(classInfo?.teachersCount ?? 0) === 1 ? '' : 's'}
              </span>
              {classInfo?.year && (
                <span className="rounded-full bg-white/30 px-3 py-1 backdrop-blur-sm">Ano letivo: {classInfo.year}</span>
              )}
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {([
            { key: 'resumo', label: 'Resumo' },
            { key: 'alunos', label: 'Alunos' },
            { key: 'notas', label: 'Notas' },
          ] as Array<{ key: TabKey; label: string }>).map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {loading && <p className="text-sm text-slate-500">Carregando turma…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && activeTab === 'resumo' && (
          <TurmaResumo
            classId={classId}
            classInfo={classInfo}
            onCreateAnnouncement={handleCreateAnnouncement}
            onEditAnnouncement={handleEditAnnouncement}
          />
        )}
        {!loading && !error && activeTab === 'notas' && classInfo && (
          <div className="space-y-6">
            <NotasTab
              classId={classId}
              year={classInfo.year ?? new Date().getFullYear()}
              students={(classInfo.students ?? []).map((student: any) => ({
                id: String(student.id ?? student._id ?? ''),
                name: student.name ?? '',
              })).filter((student: any) => student.id)}
            />
            <NotasTabela classId={classId} />
          </div>
        )}
        {!loading && !error && activeTab === 'alunos' && (
          <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            A gestão de alunos será integrada em uma atualização futura.
          </div>
        )}
      </div>

      <AnnouncementModal
        open={announcementOpen}
        onClose={() => {
          setAnnouncementOpen(false);
          setAnnouncementDraft(null);
        }}
        onSaved={() => {
          setAnnouncementOpen(false);
          setAnnouncementDraft(null);
        }}
        initialAnnouncement={announcementDraft}
        defaultClassIds={[classId]}
      />
    </div>
  );
}
