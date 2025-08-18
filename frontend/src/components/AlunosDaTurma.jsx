import { useEffect, useState } from 'react';

function AlunosDaTurma({ classId, onEdit, onDelete }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId) return;
    fetch(`/students?class=${classId}`)
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error('Erro ao buscar alunos:', err));
  }, [classId]);

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
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 text-center">
              <td className="p-sm border">
                <img
                  src={student.photo || 'https://via.placeholder.com/40'}
                  alt="foto"
                  className="w-10 h-10 rounded-full object-cover mx-auto"
                />
              </td>
              <td className="p-sm border">{student.number}</td>
              <td className="p-sm border">{student.name}</td>
              <td className="p-sm border">{student.email}</td>
              <td className="p-sm border space-x-sm">
                <button
                  onClick={() => onEdit && onEdit(student)}
                  className="text-blue-600"
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
