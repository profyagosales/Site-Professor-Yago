import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AlunosDaTurma from '@/components/AlunosDaTurma';
import StudentModal from '@/components/StudentModal';
import { listStudents, createStudent } from '@/services/students';
import { toArray } from '@api';

function TurmaAlunos() {
  const { classId } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);

  const loadStudents = () => {
    if (!classId) return;
    setLoading(true);
    listStudents({ class: classId })
      .then((res) => setStudents(toArray(res)))
      .catch(() => toast.error('Erro ao carregar alunos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const handleAdd = () => {
    setModalOpen(true);
  };

  const handleClose = () => setModalOpen(false);

  const handleCreate = async (student) => {
    setLoading(true);
    setError(null);
    try {
      await createStudent({ ...student, class: classId });
      toast.success('Aluno salvo');
      loadStudents();
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao salvar aluno';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (!classId) {
    return (
      <div className="pt-20 p-md">
        <p>Turma não encontrada</p>
      </div>
    );
  }

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
        <h1 className="text-xl">Alunos da Turma {classId}</h1>
        <button onClick={handleAdd} className="btn-primary">
          Adicionar Aluno
        </button>
      </div>
      <AlunosDaTurma classId={classId} students={students} />
      {error && <p className="text-red-500">{error}</p>}
      <StudentModal
        isOpen={modalOpen}
        onClose={handleClose}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default TurmaAlunos;
