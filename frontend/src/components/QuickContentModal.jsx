import { useEffect, useState } from 'react';
import { listClasses } from '@/services/classes';
import { quickCreateContent } from '@/services/contents';
import { toArray } from '@/services/api';
import { toast } from 'react-toastify';

export default function QuickContentModal({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [done, setDone] = useState(false);

  const arrify = v => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (open) {
      listClasses()
        .then(res => setClasses(arrify(res)))
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await quickCreateContent({
        classId,
        term: Number(term),
        title,
        description,
        date,
        done,
      });
      toast.success('Conteúdo criado');
      onClose();
      onSaved && onSaved();
      setClassId('');
      setTerm('');
      setTitle('');
      setDescription('');
      setDate('');
      setDone(false);
    } catch (err) {
      toast.error('Erro ao criar conteúdo');
    }
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
      <div className='ys-card w-full max-w-lg p-md'>
        <h2 className='text-xl mb-md'>Adicionar conteúdo</h2>
        <form onSubmit={handleSubmit} className='space-y-md'>
          <div>
            <label className='block mb-1'>Turma</label>
            <select
              className='w-full border p-sm rounded'
              value={classId}
              onChange={e => setClassId(e.target.value)}
              required
            >
              <option value=''>Selecione</option>
              {arrify(classes).map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  Turma {cls.series}
                  {cls.letter} - {cls.discipline}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className='block mb-1'>Bimestre</label>
            <input
              type='number'
              min='1'
              max='4'
              className='w-full border p-sm rounded'
              value={term}
              onChange={e => setTerm(e.target.value)}
              required
            />
          </div>
          <div>
            <label className='block mb-1'>Título</label>
            <input
              type='text'
              className='w-full border p-sm rounded'
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className='block mb-1'>Descrição</label>
            <textarea
              className='w-full border p-sm rounded'
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className='block mb-1'>Data</label>
            <input
              type='date'
              className='w-full border p-sm rounded'
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <label className='flex items-center gap-2'>
            <input
              type='checkbox'
              checked={done}
              onChange={e => setDone(e.target.checked)}
            />{' '}
            Concluído?
          </label>
          <div className='flex justify-end gap-sm pt-sm'>
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
