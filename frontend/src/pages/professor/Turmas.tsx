import { Page } from "@/components/Page";
import { Card, CardBody, CardTitle, CardSub } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { listClasses, createClass, updateClass, joinClassAsTeacher } from "@/services/classes";
import { fetchProfessorClasses } from '@/services/classes.service';
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; data: any | null } | null>(null);

  const fetchClasses = useCallback(async (options?: { skipFinally?: boolean }) => {
    setLoading(true);
    try {
      const data = await fetchProfessorClasses();
      setTurmas(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e: any) {
      console.error('turmas: falha ao carregar', e);
      setTurmas([]);
      const status = e?.response?.status;
      if (status === 401) {
        setErr('Sessão expirada. Faça login novamente.');
        nav('/login-professor?next=/professor/classes', { replace: true });
      } else {
        setErr(e?.response?.data?.message || 'Erro ao carregar turmas');
      }
      throw e;
    } finally {
      if (!options?.skipFinally) {
        setLoading(false);
      }
    }
  }, [nav]);

  useEffect(() => {
    // logClassesOnce();
    let active = true;

    fetchClasses({ skipFinally: true })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchClasses]);

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
      await fetchClasses();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Erro ao salvar turma';
      toast.error(message);
      throw e;
    }
  }, [modalState, fetchClasses]);

  const handleJoin = useCallback(async (cls: any) => {
    const id = cls?._id || cls?.id;
    if (!id) return;
    try {
      await joinClassAsTeacher(id);
      toast.success('Você agora é professor desta turma.');
      await fetchClasses();
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Não foi possível entrar na turma.';
      toast.error(message);
    }
  }, [fetchClasses]);

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

  return (
    <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
      <div className="mb-4">
        <Button onClick={() => setModalState({ mode: 'create', data: null })}>Nova Turma</Button>
      </div>

      {err && !loading && <p className="text-red-600 mb-4">{err}</p>}
      {loading && <p className="text-ys-ink-2">Carregando turmas…</p>}
      {!loading && !err && (
        <div className="grid sm:grid-cols-2 gap-4">
          {turmas.map((t: any) => {
            const key = t?._id || t?.id;
            const alreadyTeacher = isTeacherOf(t);
            return (
              <Card key={key || `${t.series}-${t.letter}`}>
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
          {turmas.length === 0 && <p className="text-ys-ink-2">Nenhuma turma encontrada.</p>}
        </div>
  )}
      <ClassModal
        isOpen={hasModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={modalInitialData}
      />
    </Page>
  );
}

