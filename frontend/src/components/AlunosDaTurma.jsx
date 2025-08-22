import { useEffect, useState } from 'react';
import { listStudents } from '@/services/students';
import { toArray } from '@api';

function AlunosDaTurma({ classId, students: externalStudents, onEdit, onDelete }) {
  const [students, setStudents] = useState([]);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (externalStudents !== undefined) {
      setStudents(externalStudents);
      return;
    }
    if (!classId) return;
    listStudents({ class: classId })
      .then((data) => setStudents(arrify(data)))
      .catch((err) => console.error('Erro ao buscar alunos:', err));
  }, [classId, externalStudents]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-sm border">Foto</th>
            <th className="p-sm border">Nº</th>
            <th className="p-sm border">Nome</th>
            <th className="p-sm border">E-mail</th>
            <th className="p-sm border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {arrify(students).map((student) => (
            <tr key={student._id || student.id} className="hover:bg-gray-50 text-center">
              <td className="p-sm border">
                <img
                  src={student.photo || 'https://via.placeholder.com/40'}
                  alt="foto"
                  className="w-10 h-10 rounded-full object-cover mx-auto"
                />
              </td>
              <td className="p-sm border">{student.rollNumber}</td>
              <td className="p-sm border">{student.name}</td>
              <td className="p-sm border">{student.email}</td>
              <td className="p-sm border space-x-sm">
                <button
                  onClick={() => onEdit && onEdit(student)}
                  className="link-primary"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete && onDelete(student)}
                  className="text-red-600"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlunosDaTurma;
