import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function NotasClasse() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [bimester, setBimester] = useState('0');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get('http://localhost:5000/classes');
        setClasses(res.data);
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
      }
    };
    fetchClasses();
  }, []);

  const loadGrades = async (cls) => {
    setSelectedClass(cls);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        axios.get(`http://localhost:5000/students?class=${cls._id}`),
        axios.get(`http://localhost:5000/grades/class/${cls._id}`),
      ]);
      setStudents(studentsRes.data);
      setGrades(gradesRes.data);
    } catch (err) {
      console.error('Erro ao carregar notas', err);
    }
  };

  const displayedBimesters = () => {
    if (bimester === '0') return [0, 1, 2, 3];
    return [Number(bimester) - 1];
  };

  const handleExport = () => {
    if (!selectedClass) return;
    window.open(`http://localhost:5000/grades/class/${selectedClass._id}/export`, '_blank');
  };

  return (
    <div className="pt-20 p-md">
      {!selectedClass ? (
        <div>
          <h1 className="text-2xl text-orange mb-md">Notas por Turma</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {classes.map((cls) => (
              <div
                key={cls._id}
                className="bg-gray-50/30 backdrop-blur-md border border-gray-300 rounded-lg p-md shadow-subtle cursor-pointer"
                onClick={() => loadGrades(cls)}
              >
                <h3 className="text-orange text-lg font-semibold">
                  {cls.series}ª{cls.letter}
                </h3>
                <p className="text-black/70">Disciplina: {cls.discipline}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-xl text-orange">
              {selectedClass.series}ª{selectedClass.letter} - {selectedClass.discipline}
            </h2>
            <button className="link-primary" onClick={() => setSelectedClass(null)}>
              Voltar
            </button>
          </div>
          <div className="flex justify-between items-center mb-md">
            <select
              className="border p-sm rounded"
              value={bimester}
              onChange={(e) => setBimester(e.target.value)}
            >
              <option value="0">Todos os bimestres</option>
              <option value="1">1º Bimestre</option>
              <option value="2">2º Bimestre</option>
              <option value="3">3º Bimestre</option>
              <option value="4">4º Bimestre</option>
            </select>
            <button className="btn-primary" onClick={handleExport}>
              Exportar PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-orange-500 text-white text-left">
                  <th className="p-sm border">Aluno</th>
                  {displayedBimesters().map((b) => (
                    <th key={b} className="p-sm border text-center">{b + 1}º Bim</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
                  <tr
                    key={student._id}
                    className={i % 2 === 0 ? 'bg-gray-100' : ''}
                  >
                    <td className="p-sm border link-primary cursor-pointer" onClick={() => navigate('/alunos/' + student._id + '/notas')}>{student.name}</td>
                    {displayedBimesters().map((b) => (
                      <td key={b} className="p-sm border text-center">
                        {grades[i] && grades[i][b] !== '-' && grades[i][b] !== undefined
                          ? grades[i][b]
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotasClasse;
