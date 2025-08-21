import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@api';
import { toast } from 'react-toastify';
import { asArray } from '@/utils/safe';
import { getClassMatrix, exportClassPdf } from '../services/grades';

function NotasClasse() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [bimester, setBimester] = useState('0');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [errorClasses, setErrorClasses] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [errorGrades, setErrorGrades] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setErrorClasses(null);
      try {
        const res = await api.get('/classes');
        const classes = asArray(res?.data?.data || res?.data);
        setClasses(classes);
        setSuccess('Turmas carregadas');
        toast.success('Turmas carregadas');
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
        const message = 'Erro ao carregar turmas';
        setErrorClasses(message);
        toast.error(message);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const loadGrades = async (cls) => {
    setSelectedClass(cls);
    setLoadingGrades(true);
    setErrorGrades(null);
    try {
      const { students: stud, grades: grd } = await getClassMatrix(cls._id);
      const students = asArray(stud);
      const grades = asArray(grd);
      setStudents(students);
      setGrades(grades);
      setSuccess('Notas carregadas');
      toast.success('Notas carregadas');
    } catch (err) {
      console.error('Erro ao carregar notas', err);
      const message = 'Erro ao carregar notas';
      setErrorGrades(message);
      toast.error(message);
    } finally {
      setLoadingGrades(false);
    }
  };

  const displayedBimesters = () => {
    if (bimester === '0') return [0, 1, 2, 3];
    return [Number(bimester) - 1];
  };

  const handleExport = async () => {
    if (!selectedClass) return;
    try {
      const blob = await exportClassPdf(selectedClass._id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
      const message = 'PDF exportado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      console.error('Erro ao exportar PDF', err);
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <div className="pt-20 p-md">
      {!selectedClass ? (
        <div>
          <h1 className="text-2xl text-orange">Notas por Turma</h1>
          {loadingClasses ? (
            <p>Carregando turmas...</p>
          ) : errorClasses ? (
            <p className="text-red-500">{errorClasses}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
              {classes.map((cls) => (
                <div
                  key={cls._id}
                  className="card cursor-pointer"
                  onClick={() => loadGrades(cls)}
                >
                  <h3 className="text-orange text-lg font-semibold">
                    {cls.series}ª{cls.letter}
                  </h3>
                  <p className="text-black/70">Disciplina: {cls.discipline}</p>
                </div>
              ))}
            </div>
          )}
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
          {loadingGrades ? (
            <p>Carregando notas...</p>
          ) : errorGrades ? (
            <p className="text-red-500">{errorGrades}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-orange-500 text-white text-left">
                    <th className="p-sm border">Aluno</th>
                    {displayedBimesters().map((b) => (
                      <th key={b} className="p-sm border text-center">
                        {b + 1}º Bim
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => (
                    <tr
                      key={student._id}
                      className={i % 2 === 0 ? 'bg-gray-100' : ''}
                    >
                      <td
                        className="p-sm border link-primary cursor-pointer"
                        onClick={() => navigate(`/alunos/${student._id}/notas`)}
                      >
                        {student.name}
                      </td>
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
          )}
          {success && <p className="text-green-500 mt-md">{success}</p>}
        </div>
      )}
    </div>
  );
}

export default NotasClasse;
