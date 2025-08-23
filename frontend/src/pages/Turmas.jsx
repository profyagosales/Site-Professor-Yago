import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClasses, createClass, updateClass, deleteClass } from '@/services/classes';
import ClassModal from '@/components/ClassModal';
import { toast } from 'react-toastify';
import { toArray } from '@/lib/http';

function Turmas() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadTurmas = async () => {
    setLoading(true);
    try {
      const res = await listClasses();
      setClasses(arrify(res));
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        status === 404
          ? 'Serviço de turmas indisponível (404). Verifique a URL da API.'
          : 'Erro ao carregar turmas. Tente novamente.';
      toast.error(msg);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadTurmas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (data) => {
    setLoading(true);
    const action = editing
      ? updateClass(editing._id, data)
      : createClass(data);
    action
      .then(() => {
        toast.success('Turma salva com sucesso');
        setShowModal(false);
        setEditing(null);
        loadTurmas();
      })
      .catch(() => toast.error('Erro ao salvar turma'))
      .finally(() => setLoading(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Deseja excluir esta turma?')) return;
    setLoading(true);
    deleteClass(id)
      .then(() => {
        toast.success('Turma excluída');
        loadTurmas();
      })
      .catch(() => toast.error('Erro ao deletar turma'))
      .finally(() => setLoading(false));
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
        {arrify(classes).map((cls) => (
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
