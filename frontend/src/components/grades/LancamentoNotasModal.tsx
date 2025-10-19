import { FormEvent, useEffect, useState } from 'react';
import type { GradeActivity, GradeActivityGrade } from '@/services/gradeActivities';

type StudentItem = {
  id: string;
  name: string;
};

type LancamentoNotasModalProps = {
  open: boolean;
  onClose: () => void;
  activity: GradeActivity | null;
  students: StudentItem[];
  initialGrades?: GradeActivityGrade[];
  onSubmit: (grades: GradeActivityGrade[]) => Promise<void>;
};

export function LancamentoNotasModal({ open, onClose, activity, students, initialGrades = [], onSubmit }: LancamentoNotasModalProps) {
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const map: Record<string, number> = {};
    initialGrades.forEach((grade) => {
      map[grade.studentId] = grade.points;
    });
    setEntries(map);
    setError(null);
  }, [open, initialGrades]);

  if (!open || !activity) return null;

  const handleChange = (studentId: string, value: string) => {
    const numeric = value === '' ? NaN : Number(value);
    setEntries((prev) => ({
      ...prev,
      [studentId]: Number.isNaN(numeric) ? 0 : numeric,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const grades: GradeActivityGrade[] = students
        .map((student) => {
          const points = entries[student.id];
          if (points === undefined || Number.isNaN(points)) return null;
          return {
            studentId: student.id,
            points,
          };
        })
        .filter((item): item is GradeActivityGrade => item !== null);
      await onSubmit(grades);
      onClose();
    } catch (err: any) {
      console.error('Erro ao lançar notas', err);
      setError(err?.response?.data?.message ?? 'Erro ao salvar notas da atividade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <header className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Lançar notas</h2>
          <p className="text-sm text-slate-500">
            Informe a pontuação de cada aluno para a atividade <strong>{activity.label}</strong> (valor máximo {activity.value}).
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Aluno</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Pontuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 text-slate-700">{student.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={activity.value}
                        step={0.1}
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={entries[student.id] ?? ''}
                        onChange={(event) => handleChange(student.id, event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Salvando…' : 'Salvar notas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LancamentoNotasModal;
