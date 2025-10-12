import { Page } from "@/components/Page";
import { Card, CardBody, CardTitle, CardSub } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { createClass, fetchProfessorClasses, joinClassAsTeacher, updateClass, ProfessorClass } from "@/services/classes";
import { useAuth } from "@/store/AuthContext";
import ClassModal from '@/components/ClassModal';
import { toast } from 'react-toastify';
// provisório: habilite se precisar inspecionar a resposta da API durante debug
// import { logClassesOnce } from '@/devtools/log-classes';

export default function TurmasPage() {
  const nav = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  if (!auth || auth.loading) {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <p className="text-ys-ink-2">Carregando…</p>
      </Page>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login-professor" replace state={{ from: location }} />;
  }

  const user = auth.user;
  const [turmas, setTurmas] = useState<ProfessorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; data: ProfessorClass | null } | null>(null);

  const reloadClasses = useCallback(async () => {
    console.log('[Turmas] GET /professor/classes');
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchProfessorClasses();
      console.log('[Turmas] ok', (list as any[]).length ?? 0);
      setTurmas(list as any);
    } catch (e: any) {
      console.error('[Turmas] fail', e?.response?.status, e);
      setTurmas([]);
      setErrorMsg(e?.response?.status === 401 ? 'Sessão expirada. Faça login.' : 'Falha ao carregar turmas.');
    } finally {
      setLoading(false);
      console.log('[Turmas] done');
    }
  }, []);

  useEffect(() => {
    let abort = false;
    console.log('[Turmas] mount');
    (async () => {
      try {
        console.log('[Turmas] GET /professor/classes');
        const list = await fetchProfessorClasses();
        if (abort) return;
        console.log('[Turmas] ok', (list as any[]).length ?? 0);
        setTurmas(list as any);
        setErrorMsg(null);
      } catch (e: any) {
        if (abort) return;
        console.error('[Turmas] fail', e?.response?.status, e);
        setTurmas([]);
        setErrorMsg(e?.response?.status === 401 ? 'Sessão expirada. Faça login.' : 'Falha ao carregar turmas.');
      } finally {
        if (!abort) {
          setLoading(false);
          console.log('[Turmas] done');
        }
      }
    })();
    return () => { abort = true; };
  }, []);

  const closeModal = () => setModalState(null);

  const handleSubmit = useCallback(async (payload: any) => {
    if (!modalState) return;
    const id = modalState.data?._id || modalState.data?.id;
    try {
      if (modalState.mode === 'edit' && id) {
        await updateClass(id, payload);
        toast.success('Turma atualizada com sucesso');
      } else {
        await createClass(payload);
        toast.success('Turma criada com sucesso');
      }
      closeModal();
      console.log('[Turmas] reloading after save');
      await reloadClasses();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Erro ao salvar turma';
      toast.error(message);
      throw e;
    }
  }, [modalState, reloadClasses]);

  const handleJoin = useCallback(async (cls: ProfessorClass) => {
    const id = cls?._id || cls?.id;
    if (!id) return;
    try {
      await joinClassAsTeacher(id);
      toast.success('Você agora é professor desta turma.');
      console.log('[Turmas] reloading after join');
      await reloadClasses();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Não foi possível entrar na turma.';
      toast.error(message);
    }
  }, [reloadClasses]);

  const isTeacherOf = useCallback((cls: any) => {
    const teachers = Array.isArray(cls?.teachers) ? cls.teachers : [];
    return teachers.some((t: any) => {
      if (!t) return false;
      if (typeof t === 'string') return t === user.id;
      if (typeof t === 'object') {
        return (t._id && t._id === user.id) || (t.id && t.id === user.id);
      }
      return false;
    });
  }, [user]);

  const modalInitialData = modalState?.mode === 'edit' ? modalState.data : null;
  const hasModalOpen = Boolean(modalState);

  if (loading) return <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações."><p>Carregando…</p></Page>;
  if (errorMsg) {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <p className="text-red-600">{errorMsg}</p>
        <div className="mt-4">
          <Button onClick={() => void reloadClasses()}>Tentar novamente</Button>
        </div>
      </Page>
    );
  }

  if (!turmas.length) {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <div className="mb-4">
          <Button onClick={() => setModalState({ mode: 'create', data: null })}>Nova Turma</Button>
        </div>
        <p>Nenhuma turma.</p>
        <ClassModal
          isOpen={hasModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          initialData={modalInitialData}
        />
      </Page>
    );
  }

  return (
    <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
      <div className="mb-4">
        <Button onClick={() => setModalState({ mode: 'create', data: null })}>Nova Turma</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {turmas.map((t) => {
          const key = t?._id || t?.id || `${t.series || ''}-${t.letter || ''}`;
          const alreadyTeacher = isTeacherOf(t);
          return (
            <Card key={key}>
              <CardBody>
                <CardTitle>{t.name || t.nome || `${t.series || ''} ${t.letter || ''}`}</CardTitle>
                <CardSub>Disciplina: {t.discipline || t.disciplina || '-'}</CardSub>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => nav(`/professor/classes/${key}/alunos`)}>Ver alunos</Button>
                  <Button onClick={() => setModalState({ mode: 'edit', data: t })}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleJoin(t)}
                    disabled={alreadyTeacher}
                  >
                    {alreadyTeacher ? 'Você é professor' : 'Tornar-me professor'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <ClassModal
        isOpen={hasModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={modalInitialData}
      />
    </Page>
  );
}

