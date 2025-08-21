import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'react-toastify';
import AlunosDaTurma from '@/components/AlunosDaTurma';
import StudentModal from '@/components/StudentModal';

function TurmaAlunos() {
  const { id } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      console.log('Enviar aluno', student);
      setSuccess('Aluno salvo');
      toast.success('Aluno salvo');
      setModalOpen(false);
    } catch (err) {
      const message = 'Erro ao salvar aluno';
      setError(message);
      toast.error(message);
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
        <h1 className="text-xl">Alunos da Turma {id}</h1>
        <button onClick={handleAdd} className="btn-primary">
          Adicionar Aluno
        </button>
      </div>
      <AlunosDaTurma classId={id} onEdit={handleEdit} onDelete={() => {}} />
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <StudentModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={selectedStudent}
      />
    </div>
  );
}

export default TurmaAlunos;
