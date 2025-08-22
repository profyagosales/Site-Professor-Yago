import { useEffect, useState } from 'react';

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

  const handleScheduleChange = (index, field, value) => {
    const updated = schedule.slice();
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const addSchedule = () => {
    setSchedule([...schedule, { day: '', slot: '' }]);
  };

  const removeSchedule = (index) => {
    setSchedule(schedule.filter((_, i) => i !== index));
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
            {schedule.map((s, idx) => (
              <div key={idx} className="flex items-center gap-sm mb-sm">
                <select
                  aria-label="Dia"
                  className="border p-sm rounded"
                  value={s.day}
                  onChange={(e) =>
                    handleScheduleChange(idx, 'day', e.target.value)
                  }
                >
                  <option value="">Dia</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                </select>
                <input
                  type="number"
                  aria-label="Slot"
                  className="border p-sm rounded w-24"
                  value={s.slot}
                  onChange={(e) =>
                    handleScheduleChange(idx, 'slot', e.target.value)
                  }
                />
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => removeSchedule(idx)}
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              className="px-3 py-1 border rounded"
              onClick={addSchedule}
            >
              Adicionar Horário
            </button>
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
