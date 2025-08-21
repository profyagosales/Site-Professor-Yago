import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@api';
import { asArray } from '@/utils/safe';
import ClassModal from '../components/ClassModal';
import { toast } from 'react-toastify';

function Turmas() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      const classes = asArray(res?.data?.data || res?.data);
      setClasses(classes);
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      let res;
      if (editing) {
        res = await api.put(
          `/classes/${editing._id}`,
          data
        );
        setClasses((prev) =>
          prev.map((cls) => (cls._id === editing._id ? res.data : cls))
        );
      } else {
        res = await api.post('/classes', data);
        setClasses((prev) => [...prev, res.data]);
      }
      toast.success('Turma salva com sucesso');
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      console.error('Erro ao salvar turma', err);
      toast.error('Erro ao salvar turma');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir esta turma?')) return;
    setLoading(true);
    try {
      await api.delete(`/classes/${id}`);
      setClasses((prev) => prev.filter((cls) => cls._id !== id));
      toast.success('Turma excluída');
    } catch (err) {
      console.error('Erro ao deletar turma', err);
      toast.error('Erro ao deletar turma');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 p-md">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h1 className="text-2xl text-orange">Turmas</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          Nova Turma
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {classes.map((cls) => (
          <div
            key={cls._id}
            className="card"
          >
            <h3 className="text-orange text-lg font-semibold">
              {cls.series}ª{cls.letter}
            </h3>
            <p className="text-black/70">Disciplina: {cls.discipline}</p>
            <div className="mt-md flex justify-between items-center">
              <button
                className="btn-primary px-3 py-1"
                onClick={() => navigate(`/turmas/${cls._id}/alunos`)}
              >
                Ver alunos
              </button>
              <div className="space-x-sm">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => {
                    setEditing(cls);
                    setShowModal(true);
                  }}
                >
                  Editar
                </button>
                <button
                  className="px-3 py-1 border rounded text-red-600"
                  onClick={() => handleDelete(cls._id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ClassModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialData={editing}
      />
    </div>
  );
}

export default Turmas;
