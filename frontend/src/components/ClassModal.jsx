import { useEffect, useState } from 'react';
import SchedulePicker from './SchedulePicker';

function ClassModal({ isOpen, onClose, onSubmit, initialData }) {
  const [series, setSeries] = useState('');
  const [letter, setLetter] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setSeries(String(initialData.series));
      setLetter(initialData.letter);
      setDiscipline(initialData.discipline);
      const sched = Array.isArray(initialData.schedule)
        ? initialData.schedule.map((s) => ({
            day: String(s.day),
            slot: String(s.slot),
          }))
        : [];
      setSchedule(sched);
    } else {
      setSeries('');
      setLetter('');
      setDiscipline('');
      setSchedule([]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!series) newErrors.series = 'Selecione a série';
    if (!letter.trim()) newErrors.letter = 'Informe a letra';
    if (!discipline.trim()) newErrors.discipline = 'Informe a disciplina';
    if (schedule.some((s) => !s.day || !s.slot)) {
      newErrors.schedule = 'Preencha todos os horários';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    const normalizedSchedule = schedule.map((s) => ({
      day: Number(s.day),
      slot: Number(s.slot),
    }));
    onSubmit({
      series: Number(series),
      letter,
      discipline,
      schedule: normalizedSchedule,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md p-md">
        <h2 className="text-xl text-orange">
          {initialData ? 'Editar Turma' : 'Nova Turma'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block mb-1">Série</label>
            <select
              className="w-full border p-sm rounded"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            >
              <option value="">Selecione</option>
              {[1,2,3,4,5,6,7,8,9].map((s) => (
                <option key={s} value={s}>{s}ª</option>
              ))}
            </select>
            {errors.series && <p className="text-red-600 text-sm mt-1">{errors.series}</p>}
          </div>
          <div>
            <label className="block mb-1">Letra</label>
            <input
              type="text"
              className="w-full border p-sm rounded"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
            {errors.letter && <p className="text-red-600 text-sm mt-1">{errors.letter}</p>}
          </div>
          <div>
            <label className="block mb-1">Disciplina</label>
            <input
              type="text"
              className="w-full border p-sm rounded"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            />
            {errors.discipline && (
              <p className="text-red-600 text-sm mt-1">{errors.discipline}</p>
            )}
          </div>
          <div>
            <label className="block mb-1">Horários</label>
            <SchedulePicker value={schedule} onChange={setSchedule} />
            {errors.schedule && (
              <p className="text-red-600 text-sm mt-1">{errors.schedule}</p>
            )}
          </div>
          <div className="flex justify-end space-x-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {initialData ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassModal;
