import { useEffect, useState } from 'react';
import { listClasses } from '@/services/classes';
import { createContent } from '@/services/contents';
import { toArray } from '@/lib/api';
import { toast } from 'react-toastify';

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  if (value.classId) return String(value.classId);
  return '';
};

function NewContentModal({ isOpen, onClose, onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [bimester, setBimester] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (isOpen) {
      listClasses()
        .then((res) => setClasses(arrify(res)))
        .catch((err) => {
          console.error('Erro ao carregar turmas', err);
          toast.error(err.response?.data?.message ?? 'Erro ao carregar turmas');
        });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createContent({ classId, bimester: Number(bimester), title, description });
      toast.success('Conteúdo criado com sucesso');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('contents:refresh'));
      }
      setClassId('');
      setBimester('');
      setTitle('');
      setDescription('');
      onClose();
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Erro ao criar conteúdo', err);
      toast.error(err.response?.data?.message ?? 'Erro ao criar conteúdo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="ys-card w-full max-w-lg p-md">
        <h2 className="text-xl mb-md">Novo Conteúdo</h2>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block mb-1">Turma</label>
            <select
              className="w-full border p-sm rounded"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {arrify(classes).map((cls) => {
                const id = toId(cls);
                const name = cls?.name || cls?.nome;
                const gradePart = cls?.series ? `${cls.series}º${cls.letter ?? ''}`.trim() : '';
                const discipline = cls?.discipline || cls?.subject || '';
                const fallback = [gradePart && `Turma ${gradePart}`, discipline].filter(Boolean).join(' - ');
                const label = name || fallback || 'Turma';
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block mb-1">Bimestre</label>
            <input
              type="number"
              min="1"
              max="4"
              className="w-full border p-sm rounded"
              value={bimester}
              onChange={(e) => setBimester(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">Título</label>
            <input
              type="text"
              className="w-full border p-sm rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">Descrição</label>
            <textarea
              className="w-full border p-sm rounded"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button type="submit" className="ys-btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewContentModal;
