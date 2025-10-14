import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import SchedulePicker from './SchedulePicker';

function ClassModal({ isOpen, onClose, onSubmit, initialData }) {
  const [series, setSeries] = useState('');
  const [letter, setLetter] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [schedules, setSchedules] = useState([{ day: '', slot: '', time: '' }]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setSeries(String(initialData.series));
      setLetter(initialData.letter);
      setDiscipline(initialData.discipline);
      const schedArray = Array.isArray(initialData.schedule)
        ? initialData.schedule
        : initialData.schedule
        ? [initialData.schedule]
        : [{ day: '', slot: '', time: '' }];
      setSchedules(
        schedArray.map((s) => ({
          day: String(s.day || ''),
          slot: String(s.slot || ''),
          time: s.time || ''
        }))
      );
    } else {
      setSeries('');
      setLetter('');
      setDiscipline('');
      setSchedules([{ day: '', slot: '', time: '' }]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!series) newErrors.series = 'Selecione a série';
    if (!letter.trim()) newErrors.letter = 'Informe a letra';
    if (!discipline.trim()) newErrors.discipline = 'Informe a disciplina';
    if (
      !schedules.length ||
      schedules.some((s) => !s.day || !s.slot)
    ) {
      newErrors.schedule = 'Preencha os horários';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    const normalizedSchedule = schedules.map((s) => ({
      day: s.day,
      slot: Number(s.slot),
      time: s.time,
    }));
    try {
      setSubmitting(true);
      await Promise.resolve(onSubmit({
        series: Number(series),
        letter,
        discipline,
        schedule: normalizedSchedule,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800">
          {initialData ? 'Editar turma' : 'Nova turma'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Série</label>
            <select
              className="w-full rounded-xl border border-slate-200 p-2 text-sm"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            >
              <option value="">Selecione</option>
              {[1,2,3,4,5,6,7,8,9].map((s) => (
                <option key={s} value={s}>{s}ª</option>
              ))}
            </select>
            {errors.series && <p className="mt-1 text-sm text-red-600">{errors.series}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Letra</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
              />
              {errors.letter && <p className="mt-1 text-sm text-red-600">{errors.letter}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Disciplina</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
              />
              {errors.discipline && (
                <p className="mt-1 text-sm text-red-600">{errors.discipline}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Horários</label>
            <div className="space-y-2">
              {schedules.map((sched, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <SchedulePicker
                    value={sched}
                    onChange={(val) =>
                      setSchedules((prev) =>
                        prev.map((p, i) => (i === idx ? val : p))
                      )
                    }
                  />
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() =>
                        setSchedules((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700"
              onClick={() =>
                setSchedules((prev) => [...prev, { day: '', slot: '', time: '' }])
              }
            >
              + Adicionar horário
            </button>
            {errors.schedule && (
              <p className="mt-1 text-sm text-red-600">{errors.schedule}</p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : initialData ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ClassModal;
