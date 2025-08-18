import { useParams } from 'react-router-dom';
import { useState } from 'react';
import AlunosDaTurma from '../components/AlunosDaTurma';
import StudentModal from '../components/StudentModal';

function TurmaAlunos() {
  const { id } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleAdd = () => {
    setSelectedStudent(null);
    setModalOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleClose = () => setModalOpen(false);

  const handleSubmit = (student) => {
    // TODO: Implementar envio para API
    console.log('Enviar aluno', student);
    setModalOpen(false);
  };

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h1 className="text-xl">Alunos da Turma {id}</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-orange text-white rounded"
        >
          Adicionar Aluno
        </button>
      </div>
      <AlunosDaTurma classId={id} onEdit={handleEdit} onDelete={() => {}} />
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
