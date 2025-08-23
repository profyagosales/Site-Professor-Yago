import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import StudentModal from '@/components/StudentModal';
import { getClassById, listStudents } from '@/services/classes';
import { createStudent, updateStudent } from '@/services/students';

function TurmaAlunos() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classData, setClassData] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!classId) return;
    setClassLoading(true);
    setNotFound(false);
    getClassById(classId)
      .then(setClassData)
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Erro ao carregar turma');
        }
      })
      .finally(() => setClassLoading(false));
  }, [classId]);

  const loadStudents = () => {
    if (!classId) return;
    setLoading(true);
    listStudents(classId)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.response?.status !== 404) {
          toast.error('Erro ao carregar alunos');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const handleSubmit = async (form) => {
    try {
      if (selectedStudent && selectedStudent._id) {
        await updateStudent(selectedStudent._id, form);
        toast.success('Aluno atualizado');
      } else {
        await createStudent(classId, form);
        toast.success('Aluno salvo');
      }
      setModalOpen(false);
      loadStudents();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('E-mail já utilizado');
      } else {
        const message = err.response?.data?.message || 'Erro ao salvar aluno';
        toast.error(message);
      }
    }
  };

  if (notFound) {
    return (
      <div className="pt-20 p-md">
        <p>Turma não encontrada</p>
      </div>
    );
  }

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h1 className="text-xl">
          {classLoading
            ? 'Carregando...'
            : classData
            ? `${classData.series}º ${classData.letter} — ${classData.discipline}`
            : `Turma ${classId}`}
        </h1>
        <button
          onClick={() => {
            setSelectedStudent(null);
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          Novo Aluno
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-sm border">Foto</th>
                <th className="p-sm border">Nº</th>
                <th className="p-sm border">Nome</th>
                <th className="p-sm border">Telefone</th>
                <th className="p-sm border">E-mail</th>
                <th className="p-sm border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-sm border text-center text-gray-500"
                  >
                    Nenhum aluno cadastrado
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student._id || student.id}
                    className="hover:bg-gray-50 text-center"
                  >
                    <td className="p-sm border">
                      <img
                        src={student.photo || 'https://via.placeholder.com/40'}
                        alt="foto"
                        className="w-10 h-10 rounded-full object-cover mx-auto"
                      />
                    </td>
                    <td className="p-sm border">{student.number}</td>
                    <td className="p-sm border">{student.name}</td>
                    <td className="p-sm border">{student.phone}</td>
                    <td className="p-sm border">{student.email}</td>
                    <td className="p-sm border">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setModalOpen(true);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <StudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedStudent}
      />
    </div>
  );
}

export default TurmaAlunos;
