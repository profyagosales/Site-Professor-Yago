import { useEffect, useMemo, useState } from 'react';
import {
  GradeActivity,
  bulkSetActivityGrades,
  createGradeActivity,
  deleteGradeActivity,
  listGradeActivities,
  updateGradeActivity,
} from '@/services/gradeActivities';
import { AtividadeModal } from '@/components/grades/AtividadeModal';
import { LancamentoNotasModal } from '@/components/grades/LancamentoNotasModal';

type StudentLite = {
  id: string;
  name: string;
};

type NotasTabProps = {
  classId: string;
  year: number;
  students: StudentLite[];
};

type ModalState =
  | { type: 'none' }
  | { type: 'new'; bimester: number }
  | { type: 'edit'; activity: GradeActivity }
  | { type: 'grades'; activity: GradeActivity };

export function NotasTab({ classId, year, students }: NotasTabProps) {
  const [activities, setActivities] = useState<GradeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const grouped = useMemo(() => {
    const map = new Map<number, GradeActivity[]>();
    activities.forEach((activity) => {
      if (!map.has(activity.bimester)) {
        map.set(activity.bimester, []);
      }
      map.get(activity.bimester)!.push(activity);
    });
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    }
    return map;
  }, [activities]);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listGradeActivities({ classId, year });
      setActivities(list);
    } catch (err) {
      console.error('Erro ao carregar atividades', err);
      setError('Não foi possível carregar as atividades avaliativas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [classId, year]);

  const openNewModal = (bimester: number) => setModal({ type: 'new', bimester });
  const openEditModal = (activity: GradeActivity) => setModal({ type: 'edit', activity });
  const openGradesModal = (activity: GradeActivity) => setModal({ type: 'grades', activity });

  const closeModal = () => setModal({ type: 'none' });

  const handleCreate = async (payload: { bimester: number; label: string; value: number; order?: number }) => {
    await createGradeActivity({ classId, year, ...payload });
    await loadActivities();
  };

  const handleUpdate = async (activity: GradeActivity, payload: { bimester: number; label: string; value: number; order?: number }) => {
    await updateGradeActivity(activity.id, payload);
    await loadActivities();
  };

  const handleDelete = async (activity: GradeActivity) => {
    if (!window.confirm('Deseja remover esta atividade?')) return;
    await deleteGradeActivity(activity.id);
    await loadActivities();
  };

  const handleGradesSubmit = async (activity: GradeActivity, grades: Array<{ studentId: string; points: number }>) => {
    await bulkSetActivityGrades(activity.id, grades);
    await loadActivities();
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Carregando atividades…</p>}

      {[1, 2, 3, 4].map((bimester) => {
        const list = grouped.get(bimester) ?? [];
        const sum = list.reduce((acc, activity) => acc + activity.value, 0);
        return (
          <section key={bimester} className="rounded-3xl bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{bimester}º bimestre</h2>
                <p className="text-sm text-slate-500">Soma do bimestre: {sum.toFixed(2)} / 10</p>
              </div>
              <button
                type="button"
                onClick={() => openNewModal(bimester)}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Adicionar atividade
              </button>
            </header>

            {list.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma atividade cadastrada neste bimestre.</p>
            ) : (
              <ul className="grid gap-3">
                {list.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{activity.label}</h3>
                      <p className="text-sm text-slate-600">Valor: {activity.value.toFixed(2)} • Ordem: {activity.order}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(activity)}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => openGradesModal(activity)}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-100"
                      >
                        Lançar notas
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(activity)}
                        className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-500/20"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {modal.type === 'new' && (
        <AtividadeModal
          open
          mode="create"
          onClose={closeModal}
          onSubmit={(payload) => handleCreate({ ...payload, bimester: modal.bimester })}
          currentTotal={grouped.get(modal.bimester)?.reduce((acc, a) => acc + a.value, 0) ?? 0}
          limit={10}
        />
      )}

      {modal.type === 'edit' && (
        <AtividadeModal
          open
          mode="edit"
          initialData={modal.activity}
          onClose={closeModal}
          onSubmit={(payload) => handleUpdate(modal.activity, payload)}
          currentTotal={
            (grouped
              .get(modal.activity.bimester)
              ?.filter((activity) => activity.id !== modal.activity.id)
              .reduce((acc, a) => acc + a.value, 0) ?? 0)
          }
          limit={10}
        />
      )}

      {modal.type === 'grades' && (
        <LancamentoNotasModal
          open
          activity={modal.activity}
          students={students}
          onClose={closeModal}
          onSubmit={(grades) => handleGradesSubmit(modal.activity, grades)}
        />
      )}
    </div>
  );
}

export default NotasTab;
