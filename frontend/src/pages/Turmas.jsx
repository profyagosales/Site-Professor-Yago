import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClassModal from '../components/ClassModal';

function Turmas() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/classes');
      setClasses(res.data);
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
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
    } catch (err) {
      console.error('Erro ao salvar turma', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir esta turma?')) return;
    try {
      await axios.delete(`http://localhost:5000/classes/${id}`);
      fetchClasses();
    } catch (err) {
      console.error('Erro ao deletar turma', err);
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {classes.map((cls) => (
          <div
            key={cls._id}
            className="bg-gray-50/30 backdrop-blur-md border border-gray-300 rounded-lg p-md shadow-subtle"
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
