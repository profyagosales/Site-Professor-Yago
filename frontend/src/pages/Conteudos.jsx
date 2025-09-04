import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { listClasses } from '@/services/classes';
import {
  listContents,
  createContent,
  updateContent,
  deleteContent,
} from '@/services/contents';
import { toArray } from '@/services/api';

function Conteudos() {
  const [contents, setContents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    classId: '',
    bimester: '',
    title: '',
    description: '',
    date: '',
    done: false,
  });
  const [loading, setLoading] = useState(false);

  const arrify = v => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([listContents(), listClasses()])
      .then(([cts, cls]) => {
        setContents(arrify(cts));
        setClasses(arrify(cls));
      })
      .catch(() => toast.error('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = arrify(contents).filter(
    c =>
      (!selectedClass || c.classId === selectedClass) &&
      (!selectedBimester || String(c.bimester) === String(selectedBimester))
  );

  const resetForm = () => {
    setForm({
      classId: '',
      bimester: '',
      title: '',
      description: '',
      date: '',
      done: false,
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const data = { ...form, bimester: Number(form.bimester) };
    const action = editing
      ? updateContent(editing._id, data)
      : createContent(data);
    action
      .then(() => {
        toast.success('Conteúdo salvo com sucesso');
        setShowForm(false);
        setEditing(null);
        resetForm();
        loadData();
      })
      .catch(() => toast.error('Erro ao salvar conteúdo'));
  };

  const handleEdit = item => {
    setEditing(item);
    setForm({
      classId: item.classId || '',
      bimester: item.bimester || '',
      title: item.title || '',
      description: item.description || '',
      date: item.date ? item.date.split('T')[0] : '',
      done: Boolean(item.done),
    });
    setShowForm(true);
  };

  const handleDelete = id => {
    if (!window.confirm('Deseja excluir este conteúdo?')) return;
    deleteContent(id)
      .then(() => {
        toast.success('Conteúdo removido');
        loadData();
      })
      .catch(() => toast.error('Erro ao excluir conteúdo'));
  };

  const toggleDone = item => {
    updateContent(item._id, { done: !item.done })
      .then(() => {
        toast.success('Conteúdo atualizado');
        loadData();
      })
      .catch(() => toast.error('Erro ao atualizar conteúdo'));
  };

  if (loading) {
    return (
      <div className='pt-20 p-md'>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className='pt-20 p-md'>
      <div className='flex justify-between items-center mb-md'>
        <h1 className='text-2xl text-orange'>Conteúdos</h1>
        <button
          className='ys-btn-primary'
          onClick={() => {
            setEditing(null);
            resetForm();
            setShowForm(true);
          }}
        >
          Novo Conteúdo
        </button>
      </div>

      <div className='flex gap-md mb-md'>
        <select
          className='border p-sm rounded'
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          <option value=''>Todas as turmas</option>
          {arrify(classes).map(cls => (
            <option key={cls._id} value={cls._id}>
              {cls.series}ª{cls.letter}
            </option>
          ))}
        </select>
        <select
          className='border p-sm rounded'
          value={selectedBimester}
          onChange={e => setSelectedBimester(e.target.value)}
        >
          <option value=''>Todos os bimestres</option>
          {[1, 2, 3, 4].map(b => (
            <option key={b} value={b}>
              {b}º bimestre
            </option>
          ))}
        </select>
      </div>

      <div className='space-y-sm'>
        {filtered.map(c => (
          <div
            key={c._id}
            className='ys-card flex justify-between items-center'
          >
            <div>
              <h3 className='text-lg text-orange'>{c.title}</h3>
              <p className='text-black/70'>{c.description}</p>
            </div>
            <div className='flex items-center gap-sm'>
              <input
                type='checkbox'
                checked={Boolean(c.done)}
                onChange={() => toggleDone(c)}
              />
              <button
                className='px-3 py-1 border rounded'
                onClick={() => handleEdit(c)}
              >
                Editar
              </button>
              <button
                className='px-3 py-1 border rounded text-red-600'
                onClick={() => handleDelete(c._id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
          <div className='ys-card w-full max-w-md p-md'>
            <h2 className='text-xl text-orange'>
              {editing ? 'Editar Conteúdo' : 'Novo Conteúdo'}
            </h2>
            <form onSubmit={handleSubmit} className='space-y-md'>
              <div>
                <label className='block mb-1'>Turma</label>
                <select
                  className='w-full border p-sm rounded'
                  value={form.classId}
                  onChange={e => setForm({ ...form, classId: e.target.value })}
                >
                  <option value=''>Selecione</option>
                  {arrify(classes).map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.series}ª{cls.letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block mb-1'>Bimestre</label>
                <select
                  className='w-full border p-sm rounded'
                  value={form.bimester}
                  onChange={e => setForm({ ...form, bimester: e.target.value })}
                >
                  <option value=''>Selecione</option>
                  {[1, 2, 3, 4].map(b => (
                    <option key={b} value={b}>
                      {b}º bimestre
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block mb-1'>Título</label>
                <input
                  type='text'
                  className='w-full border p-sm rounded'
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className='block mb-1'>Descrição</label>
                <textarea
                  className='w-full border p-sm rounded'
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className='block mb-1'>Data</label>
                <input
                  type='date'
                  className='w-full border p-sm rounded'
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className='flex items-center'>
                <input
                  type='checkbox'
                  className='mr-sm'
                  checked={form.done}
                  onChange={e => setForm({ ...form, done: e.target.checked })}
                />
                <span>Concluído</span>
              </div>
              <div className='flex justify-end space-x-sm'>
                <button
                  type='button'
                  className='px-4 py-2 border rounded'
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Cancelar
                </button>
                <button type='submit' className='ys-btn-primary'>
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Conteudos;
