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
  const [items, setItems] = useState<ProfessorClass[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; data: ProfessorClass | null } | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const startFetch = useCallback(() => {
    if (!auth?.user) return;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus('loading');
    setErrorMsg(undefined);

    fetchProfessorClasses()
      .then((list) => {
        if (controller.signal.aborted) return;
        setItems(list);
        setErrorMsg(undefined);
        setStatus('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setItems([]);
        setErrorMsg('Falha ao carregar turmas.');
        setStatus('error');
      });
  }, [auth?.user]);

  const reload = useCallback(() => {
    startFetch();
  }, [startFetch]);

  useEffect(() => {
    if (!auth || auth.loading || !auth.user) return;
    startFetch();
    return () => {
      controllerRef.current?.abort();
    };
  }, [auth, startFetch]);

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
      await reload();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Erro ao salvar turma';
      toast.error(message);
      throw e;
    }
  }, [modalState, reload]);

  const handleJoin = useCallback(async (cls: ProfessorClass) => {
    const id = cls?._id || cls?.id;
    if (!id) return;
    try {
      await joinClassAsTeacher(id);
      toast.success('Você agora é professor desta turma.');
      await reload();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Não foi possível entrar na turma.';
      toast.error(message);
    }
  }, [reload]);

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

  if (status === 'loading') {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <p>Carregando…</p>
      </Page>
    );
  }

  if (status === 'error') {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <div className="space-y-4">
          <p>{errorMsg ?? 'Falha ao carregar turmas.'}</p>
          <div>
            <button
              type="button"
              className="rounded bg-ys-ink text-white px-4 py-2"
              onClick={reload}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </Page>
    );
  }

  if (!items.length) {
    return (
      <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
        <div className="mb-4">
          <Button onClick={() => setModalState({ mode: 'create', data: null })}>Nova Turma</Button>
        </div>
        <p>Nenhuma turma encontrada.</p>
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
        {items.map((t) => {
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

