import { Page } from "@/components/Page";
import { Card, CardBody, CardTitle, CardSub } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { listClasses, createClass, updateClass, joinClassAsTeacher, fetchProfessorClasses } from "@/services/classes";
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
  const [turmas, setTurmas] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; data: any | null } | null>(null);

  const loadClasses = useCallback(() => {
    setLoading(true);
    setMessage(null);
    return fetchProfessorClasses()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTurmas(list);
        if (list.length === 0) {
          setMessage('Nenhuma turma encontrada.');
        }
      })
      .catch((e: any) => {
        console.error('classes', e);
        setTurmas([]);
        const status = e?.response?.status;
        const friendly = status === 401
          ? 'Sessão expirada, faça login novamente.'
          : 'Não foi possível carregar as turmas agora.';
        setMessage(friendly);
        if (status === 401) {
          nav('/login-professor?next=/professor/classes', { replace: true });
        }
        throw e;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [nav]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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
      await loadClasses();
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
      await loadClasses();
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

      {loading && <p className="text-ys-ink-2">Carregando turmas…</p>}
      {!loading && message && (
        <p className="text-ys-ink-2 mb-4">{message}</p>
      )}
      {!loading && (!message || turmas.length > 0) && (
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
          {turmas.length === 0 && !message && <p className="text-ys-ink-2">Nenhuma turma encontrada.</p>}
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

