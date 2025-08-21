import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AlunosDaTurma from '@/components/AlunosDaTurma';
import StudentModal from '@/components/StudentModal';
import { listStudents, deleteStudent } from '@/services/students';
import { toArray } from '@/services/api';

function TurmaAlunos() {
  const { id } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [students, setStudents] = useState([]);

  const loadAlunos = () => {
    setLoading(true);
    listStudents({ class: id })
      .then((res) => setStudents(toArray(res)))
      .catch(() => toast.error('Erro ao carregar alunos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlunos();
  }, [id]);

  const handleAdd = () => {
    setSelectedStudent(null);
    setModalOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleClose = () => setModalOpen(false);

  const handleSubmit = async (student) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // TODO: Implementar envio para API
      setSuccess('Aluno salvo');
      toast.success('Aluno salvo');
    } catch (err) {
      const message = 'Erro ao salvar aluno';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (student) => {
    if (!window.confirm('Deseja excluir este aluno?')) return;
    deleteStudent(student.id)
      .then(() => {
        toast.success('Aluno excluído');
        loadAlunos();
      })
      .catch(() => toast.error('Erro ao excluir aluno'));
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
        <h1 className="text-xl">Alunos da Turma {id}</h1>
        <button onClick={handleAdd} className="btn-primary">
          Adicionar Aluno
        </button>
      </div>
      <AlunosDaTurma
        classId={id}
        students={students}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <StudentModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={selectedStudent}
        onSaved={() => loadAlunos()}
      />
    </div>
  );
}

export default TurmaAlunos;
