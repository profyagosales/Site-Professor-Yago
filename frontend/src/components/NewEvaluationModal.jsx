import { useEffect, useState } from 'react';
import { listClasses } from '@/services/classes';
import { createEvaluation } from '@/services/evaluations';
import { toArray } from '@/services/api';
import { toast } from 'react-toastify';

function NewEvaluationModal({ isOpen, onClose, onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [dates, setDates] = useState({});
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [bimester, setBimester] = useState('');

  const arrify = v => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (isOpen) {
      listClasses()
        .then(res => setClasses(arrify(res)))
        .catch(err => {
          console.error('Erro ao carregar turmas', err);
          toast.error(err.response?.data?.message ?? 'Erro ao carregar turmas');
        });
    }
  }, [isOpen]);

  const toggleClass = id => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleDateChange = (id, date) => {
    setDates(prev => ({ ...prev, [id]: date }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createEvaluation({
        name,
        value: Number(value),
        bimester: Number(bimester),
        classes: selectedClasses.map(id => ({
          classId: id,
          date: dates[id],
        })),
      });
      toast.success('Avaliação criada com sucesso');
      setName('');
      setValue('');
      setBimester('');
      setSelectedClasses([]);
      setDates({});
      onClose();
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Erro ao criar avaliação', err);
      toast.error(err.response?.data?.message ?? 'Erro ao criar avaliação');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
      <div className='ys-card w-full max-w-lg p-md'>
        <h2 className='text-xl mb-md'>Nova Avaliação</h2>
        <form onSubmit={handleSubmit} className='space-y-md'>
          <div>
            <label className='block mb-1'>Nome</label>
            <input
              type='text'
              className='w-full border p-sm rounded'
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className='block mb-1'>Valor</label>
            <input
              type='number'
              min='0'
              max='10'
              step='0.1'
              className='w-full border p-sm rounded'
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
          </div>
          <div>
            <label className='block mb-1'>Bimestre</label>
            <input
              type='number'
              min='1'
              max='4'
              className='w-full border p-sm rounded'
              value={bimester}
              onChange={e => setBimester(e.target.value)}
              required
            />
          </div>
          <div>
            <label className='block mb-1'>Turmas e Datas</label>
            <div className='space-y-sm max-h-60 overflow-y-auto'>
              {arrify(classes).map(cls => (
                <div key={cls.classId} className='flex items-center gap-sm'>
                  <label className='flex items-center flex-1'>
                    <input
                      type='checkbox'
                      className='mr-2'
                      checked={selectedClasses.includes(cls.classId)}
                      onChange={() => toggleClass(cls.classId)}
                    />
                    <span>
                      Turma {cls.series}
                      {cls.letter} - {cls.discipline}
                    </span>
                  </label>
                  {selectedClasses.includes(cls.classId) && (
                    <input
                      type='date'
                      className='border p-sm rounded'
                      value={dates[cls.classId] || ''}
                      onChange={e =>
                        handleDateChange(cls.classId, e.target.value)
                      }
                      required
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className='flex justify-end gap-sm'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 border rounded'
            >
              Cancelar
            </button>
            <button type='submit' className='ys-btn-primary'>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewEvaluationModal;
