import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import NewStudentModal from '@/components/NewStudentModal';
import { getClassById } from '@/services/classes';
import { listStudentsByClass } from '@/services/students';

function TurmaAlunos() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classData, setClassData] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
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

  const reloadStudents = () => {
    if (!classId) return;
    setLoading(true);
    listStudentsByClass(classId)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.response?.status !== 404) {
          toast.error('Erro ao carregar alunos');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadStudents();
  }, [classId]);

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
            setIsNewOpen(true);
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <NewStudentModal
        classId={classId}
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onCreated={reloadStudents}
      />
    </div>
  );
}

export default TurmaAlunos;
