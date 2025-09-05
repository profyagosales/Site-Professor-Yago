import { useEffect, useState } from 'react';
import SchedulePicker from './SchedulePicker';
import { validateClassData, generateClassName } from '@/services/classes';

function ClassModal({ isOpen, onClose, onSubmit, initialData, isLoading = false }) {
  const [series, setSeries] = useState('');
  const [letter, setLetter] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [schedules, setSchedules] = useState([{ day: '', slot: '', time: '' }]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        schedArray.map(s => ({
          day: String(s.day || ''),
          slot: String(s.slot || ''),
          time: s.time || '',
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

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    const payload = {
      series: Number(series),
      letter: letter.trim(),
      discipline: discipline.trim(),
      schedule: schedules.map(s => ({
        day: s.day,
        slot: Number(s.slot),
        time: s.time,
      })),
    };
    
    // Validação usando o serviço
    const validation = validateClassData(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      await onSubmit(payload);
    } catch (error) {
      // Erro será tratado pelo componente pai
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
      <div className='ys-card w-full max-w-md p-md'>
        <h2 className='text-xl text-orange'>
          {initialData ? 'Editar Turma' : 'Nova Turma'}
        </h2>
        {initialData && (
          <p className='text-sm text-gray-600 mb-4'>
            {generateClassName(Number(series), letter)}
          </p>
        )}
        <form onSubmit={handleSubmit} className='space-y-md'>
          <div>
            <label className='block mb-1'>Série</label>
            <select
              className='w-full border p-sm rounded'
              value={series}
              onChange={e => setSeries(e.target.value)}
              disabled={isSubmitting}
            >
              <option value=''>Selecione</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => (
                <option key={s} value={s}>
                  {s}ª
                </option>
              ))}
            </select>
            {errors.series && (
              <p className='text-red-600 text-sm mt-1'>{errors.series}</p>
            )}
          </div>
          <div>
            <label className='block mb-1'>Letra</label>
            <input
              type='text'
              className='w-full border p-sm rounded'
              value={letter}
              onChange={e => setLetter(e.target.value)}
              disabled={isSubmitting}
              maxLength={2}
              placeholder="Ex: A, B, C"
            />
            {errors.letter && (
              <p className='text-red-600 text-sm mt-1'>{errors.letter}</p>
            )}
          </div>
          <div>
            <label className='block mb-1'>Disciplina</label>
            <input
              type='text'
              className='w-full border p-sm rounded'
              value={discipline}
              onChange={e => setDiscipline(e.target.value)}
              disabled={isSubmitting}
              maxLength={50}
              placeholder="Ex: Matemática, Português"
            />
            {errors.discipline && (
              <p className='text-red-600 text-sm mt-1'>{errors.discipline}</p>
            )}
          </div>
          <div>
            <label className='block mb-1'>Horários</label>
            {schedules.map((sched, idx) => (
              <div key={idx} className='flex items-center gap-sm mb-sm'>
                <SchedulePicker
                  value={sched}
                  onChange={val =>
                    setSchedules(prev =>
                      prev.map((p, i) => (i === idx ? val : p))
                    )
                  }
                />
                {schedules.length > 1 && (
                  <button
                    type='button'
                    className='text-red-600'
                    onClick={() =>
                      setSchedules(prev => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type='button'
              className='px-2 py-1 border rounded'
              onClick={() =>
                setSchedules(prev => [...prev, { day: '', slot: '', time: '' }])
              }
              disabled={isSubmitting}
            >
              Adicionar horário
            </button>
            {errors.schedule && (
              <p className='text-red-600 text-sm mt-1'>{errors.schedule}</p>
            )}
          </div>
          <div className='flex justify-end space-x-sm'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 border rounded'
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type='submit' 
              className='ys-btn-primary'
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {initialData ? 'Salvando...' : 'Criando...'}
                </div>
              ) : (
                initialData ? 'Salvar' : 'Criar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassModal;
