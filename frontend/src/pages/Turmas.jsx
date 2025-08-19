import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClassModal from '../components/ClassModal';
import { toast } from 'react-toastify';

function Turmas() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.get('http://localhost:5000/classes');
      setClasses(res.data);
      setSuccess('Turmas carregadas');
      toast.success('Turmas carregadas');
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
      const message = 'Erro ao carregar turmas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await axios.put(`http://localhost:5000/classes/${editing._id}`, data);
      } else {
        await axios.post('http://localhost:5000/classes', data);
      }
      setShowModal(false);
      setEditing(null);
      fetchClasses();
      setSuccess('Turma salva com sucesso');
      toast.success('Turma salva com sucesso');
    } catch (err) {
      console.error('Erro ao salvar turma', err);
      const message = 'Erro ao salvar turma';
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir esta turma?')) return;
    try {
      await axios.delete(`http://localhost:5000/classes/${id}`);
      fetchClasses();
      setSuccess('Turma excluída');
      toast.success('Turma excluída');
    } catch (err) {
      console.error('Erro ao deletar turma', err);
      const message = 'Erro ao deletar turma';
      setError(message);
      toast.error(message);
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
      {error && <p className="text-red-500 mt-md">{error}</p>}
      {success && <p className="text-green-500 mt-md">{success}</p>}
    </div>
  );
}

export default Turmas;
