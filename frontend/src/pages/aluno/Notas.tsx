import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  listStudentGrades, 
  computeTermTotals, 
  computeTermAverages,
  formatGrade,
  formatPercentage,
  type StudentGrades 
} from '@/services/grades';
import { getStudentProfile } from '@/services/student';
import { ROUTES } from '@/routes';
import { toast } from 'react-toastify';

export default function AlunoNotas() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<StudentGrades[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar perfil do aluno
  useEffect(() => {
    const loadStudent = async () => {
      try {
        const studentData = await getStudentProfile();
        setStudent(studentData);
      } catch (error) {
        console.error('Erro ao carregar perfil do aluno:', error);
        toast.error('Erro ao carregar perfil');
        navigate(ROUTES.aluno.login);
      }
    };

    loadStudent();
  }, [navigate]);

  // Carregar notas do aluno
  useEffect(() => {
    if (!student?.id) return;
    
    const loadGrades = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Carregar notas de todos os bimestres
        const allGrades = await Promise.all([
          listStudentGrades({ studentId: student.id, term: 1 }).catch(() => null),
          listStudentGrades({ studentId: student.id, term: 2 }).catch(() => null),
          listStudentGrades({ studentId: student.id, term: 3 }).catch(() => null),
          listStudentGrades({ studentId: student.id, term: 4 }).catch(() => null),
        ]);
        
        setGrades(allGrades.filter(Boolean) as StudentGrades[]);
      } catch (error) {
        console.error('Erro ao carregar notas:', error);
        setError('Erro ao carregar notas');
        toast.error('Erro ao carregar notas');
      } finally {
        setLoading(false);
      }
    };
    
    loadGrades();
  }, [student?.id]);

  const handleRefresh = () => {
    if (student?.id) {
      const loadGrades = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const allGrades = await Promise.all([
            listStudentGrades({ studentId: student.id, term: 1 }).catch(() => null),
            listStudentGrades({ studentId: student.id, term: 2 }).catch(() => null),
            listStudentGrades({ studentId: student.id, term: 3 }).catch(() => null),
            listStudentGrades({ studentId: student.id, term: 4 }).catch(() => null),
          ]);
          
          setGrades(allGrades.filter(Boolean) as StudentGrades[]);
        } catch (error) {
          console.error('Erro ao recarregar notas:', error);
          toast.error('Erro ao recarregar notas');
        } finally {
          setLoading(false);
        }
      };
      
      loadGrades();
    }
  };

  const selectedGrade = grades.find(g => g.term === selectedTerm);
  const yearAverage = grades.length > 0 
    ? grades.reduce((sum, g) => sum + g.averageScore, 0) / grades.length 
    : 0;

  if (!student) {
    return (
      <Page title='Minhas Notas'>
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500'></div>
        </div>
      </Page>
    );
  }

  return (
    <Page title='Minhas Notas'>
      <div className='space-y-6'>
        {/* Header com controles */}
        <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Minhas Notas</h1>
            <p className='text-gray-600'>
              Acompanhe seu desempenho acadêmico por bimestre
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant='outline'
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>

        {/* Seletor de bimestre */}
        <Card className='p-6'>
          <div className='flex items-center gap-4'>
            <label htmlFor='term-select' className='text-sm font-medium text-gray-700'>
              Bimestre:
            </label>
            <select
              id='term-select'
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(Number(e.target.value))}
              className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
              disabled={loading}
            >
              {[1, 2, 3, 4].map(term => (
                <option key={term} value={term}>
                  {term}º Bimestre
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Resumo anual */}
        <Card className='p-6 bg-blue-50 border-blue-200'>
          <h2 className='text-lg font-semibold text-blue-900 mb-4'>
            Resumo do Ano Letivo
          </h2>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
            {[1, 2, 3, 4].map(term => {
              const termGrade = grades.find(g => g.term === term);
              return (
                <div key={term} className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {termGrade ? termGrade.averageScore.toFixed(1) : '-'}
                  </div>
                  <div className='text-sm text-blue-700'>{term}º Bimestre</div>
                </div>
              );
            })}
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {yearAverage.toFixed(1)}
              </div>
              <div className='text-sm text-green-700'>Média Anual</div>
            </div>
          </div>
        </Card>

        {/* Loading state */}
        {loading && (
          <Card className='p-8'>
            <div className='flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500'></div>
              <span className='ml-2 text-gray-600'>Carregando notas...</span>
            </div>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className='p-4 bg-red-50 border-red-200'>
            <div className='flex items-center justify-between'>
              <p className='text-red-600'>{error}</p>
              <Button onClick={handleRefresh} variant='outline' size='sm'>
                Tentar Novamente
              </Button>
            </div>
          </Card>
        )}

        {/* Notas do bimestre selecionado */}
        {!loading && !error && selectedGrade && (
          <Card className='p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Notas do {selectedTerm}º Bimestre
            </h2>
            
            {selectedGrade.evaluations.length === 0 ? (
              <div className='text-center py-8'>
                <svg
                  className='mx-auto h-12 w-12 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                  />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900'>
                  Nenhuma avaliação encontrada
                </h3>
                <p className='mt-1 text-sm text-gray-500'>
                  Não há avaliações para este bimestre ainda.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {/* Tabela de notas */}
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Avaliação
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Nota
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Peso
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Nota Máxima
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {selectedGrade.evaluations.map((evaluation) => {
                        const grade = selectedGrade.grades.find(g => g.evaluationId === evaluation.id);
                        return (
                          <tr key={evaluation.id} className='hover:bg-gray-50'>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <div className='text-sm font-medium text-gray-900'>
                                {evaluation.name}
                              </div>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <div className='text-sm text-gray-900'>
                                {grade ? grade.score.toFixed(1) : '-'}
                              </div>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {evaluation.weight}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {evaluation.maxScore}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Estatísticas do bimestre */}
                <div className='bg-gray-50 rounded-lg p-4'>
                  <h4 className='text-sm font-medium text-gray-900 mb-3'>
                    Estatísticas do {selectedTerm}º Bimestre:
                  </h4>
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                    <div>
                      <div className='text-sm text-gray-600'>Pontuação Total</div>
                      <div className='text-lg font-semibold text-gray-900'>
                        {selectedGrade.totalScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className='text-sm text-gray-600'>Média do Bimestre</div>
                      <div className='text-lg font-semibold text-gray-900'>
                        {selectedGrade.averageScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className='text-sm text-gray-600'>Máximo Possível</div>
                      <div className='text-lg font-semibold text-gray-900'>
                        {selectedGrade.maxPossibleScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Empty state quando não há notas */}
        {!loading && !error && grades.length === 0 && (
          <Card className='p-6'>
            <div className='text-center py-8'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                Nenhuma nota disponível
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                Suas notas aparecerão aqui quando as avaliações forem lançadas pelos professores.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
