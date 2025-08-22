import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AlunosDaTurma from '@/components/AlunosDaTurma';
import StudentModal from '@/components/StudentModal';
import { toArray } from '@api';
import { listStudents, createStudent, updateStudent, deleteStudent } from '@/services/students';
import { getClass } from '@/services/classes';

function TurmaAlunos() {
  const { classId } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [classData, setClassData] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState(null);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadStudents = () => {
    if (!classId) return;
    setLoading(true);
    listStudents({ class: classId })
      .then((res) => setStudents(arrify(res)))
      .catch(() => toast.error('Erro ao carregar alunos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!classId) return;
    setClassLoading(true);
    setClassError(null);
    getClass(classId)
      .then((res) => setClassData(res))
      .catch((err) => {
        const message = err.response?.data?.message || 'Erro ao carregar turma';
        setClassError(message);
        toast.error(message);
      })
      .finally(() => setClassLoading(false));
  }, [classId]);

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (student) => {
    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await updateStudent(editing._id, student);
      } else {
        await createStudent({ ...student, class: classId });
      }
      toast.success('Aluno salvo');
      handleClose();
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

  const handleDelete = async (student) => {
    if (!window.confirm('Deseja excluir este aluno?')) return;
    setLoading(true);
    setError(null);
    try {
      await deleteStudent(student._id || student.id);
      toast.success('Aluno excluído');
      loadStudents();
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao excluir aluno';
      setError(message);
      toast.error(message);
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

  if (classLoading || loading) {
    return (
      <div className="pt-20 p-md">
        <p>Carregando...</p>
      </div>
    );
  }

  if (classError) {
    return (
      <div className="pt-20 p-md">
        <p className="text-red-500">{classError}</p>
      </div>
    );
  }

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h1 className="text-xl">
          {classData
            ? `${classData.series}º ${classData.letter} — ${classData.discipline}`
            : `Turma ${classId}`}
        </h1>
        <button onClick={handleAdd} className="btn-primary">
          Adicionar Aluno
        </button>
      </div>
      <AlunosDaTurma
        classId={classId}
        students={arrify(students)}
        onEdit={(st) => {
          setEditing(st);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
      />
      {error && <p className="text-red-500">{error}</p>}
      <StudentModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={editing || {}}
      />
    </div>
  );
}

export default TurmaAlunos;
