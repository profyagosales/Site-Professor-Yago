import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { toArray } from '@/lib/api';
import { toast } from 'react-toastify';
import { getClassMatrix, exportClassPdf } from '@/services/grades';
import { listClasses } from '@/services/classes';

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

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setErrorClasses(null);
      try {
        const res = await listClasses();
        setClasses(arrify(res));
        setSuccess('Turmas carregadas');
        toast.success('Turmas carregadas');
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
        const message = err.response?.data?.message ?? 'Erro ao carregar turmas';
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
      const students = arrify(stud);
      const grades = arrify(grd);
      setStudents(students);
      setGrades(grades);
      setSuccess('Notas carregadas');
      toast.success('Notas carregadas');
    } catch (err) {
      console.error('Erro ao carregar notas', err);
      const message = err.response?.data?.message ?? 'Erro ao carregar notas';
      setErrorGrades(message);
      toast.error(message);
    } finally {
      setLoadingGrades(false);
    }
  };

  const getAssessmentsScore = (grade) => {
    if (grade === '-' || grade === undefined || grade === null) return '-';
    if (typeof grade === 'object') return grade.assessments ?? '-';
    return grade;
  };

  const getTotalScore = (grade) => {
    if (grade === '-' || grade === undefined || grade === null) return '-';
    if (typeof grade === 'object') {
      const assessments = Number(grade.assessments) || 0;
      const caderno = Number(grade.caderno) || 0;
      return assessments + caderno;
    }
    return grade;
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
              {arrify(classes).map((cls) => (
                <div
                  key={cls._id}
                  className="ys-card cursor-pointer"
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
            <button className="ys-btn-primary" onClick={handleExport}>
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
                      <Fragment key={b}>
                        <th className="p-sm border text-center">{b + 1}º Bim</th>
                        <th className="p-sm border text-center">Total</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {arrify(students).map((student, i) => (
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
                      {displayedBimesters().map((b) => {
                        const grade = grades[i] ? grades[i][b] : undefined;
                        const assessment = getAssessmentsScore(grade);
                        const total = getTotalScore(grade);
                        const totalClass =
                          typeof total === 'number'
                            ? total < 5
                              ? 'text-red-600'
                              : 'text-green-600'
                            : '';
                        return (
                          <Fragment key={b}>
                            <td className="p-sm border text-center">
                              {assessment !== undefined ? assessment : '-'}
                            </td>
                            <td className={`p-sm border text-center ${totalClass}`}>
                              {total !== '-' ? total : '-'}
                            </td>
                          </Fragment>
                        );
                      })}
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
