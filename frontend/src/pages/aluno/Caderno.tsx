import { Page } from '@/components/Page';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentProfile } from '@/services/student';
import { 
  getNotebookEntries, 
  getStudentNotebookSummary,
  calculateStudentAttendance,
  formatNotebookDate,
  formatAttendancePercentage,
  type NotebookEntry,
  type NotebookSummary 
} from '@/services/notebook';
import { ROUTES } from '@/routes';
import { toast } from 'react-toastify';

export default function AlunoCaderno() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [summary, setSummary] = useState<NotebookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Carrega perfil do aluno
  useEffect(() => {
    const loadStudent = async () => {
      try {
        const studentData = await getStudentProfile();
        setStudent(studentData);
        
        // Se o aluno tem apenas uma turma, seleciona automaticamente
        if (studentData.classes && studentData.classes.length === 1) {
          setSelectedClass(studentData.classes[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar perfil do aluno:', error);
        toast.error('Erro ao carregar perfil');
        navigate(ROUTES.aluno.login);
      }
    };

    loadStudent();
  }, [navigate]);

  // Carrega dados do caderno quando turma e bimestre são selecionados
  useEffect(() => {
    const loadNotebookData = async () => {
      if (!selectedClass || !student?.id) return;

      try {
        setLoading(true);
        setError(null);

        const [entriesData, summaryData] = await Promise.all([
          getNotebookEntries(selectedClass, selectedTerm),
          getStudentNotebookSummary(student.id, selectedTerm),
        ]);

        setEntries(entriesData);
        setSummary(summaryData);
      } catch (error) {
        console.error('Erro ao carregar dados do caderno:', error);
        setError('Erro ao carregar dados do caderno');
        toast.error('Erro ao carregar dados do caderno');
      } finally {
        setLoading(false);
      }
    };

    loadNotebookData();
  }, [selectedClass, selectedTerm, student?.id]);

  const handleRefresh = () => {
    if (selectedClass && student?.id) {
      const loadData = async () => {
        try {
          setLoading(true);
          setError(null);

          const [entriesData, summaryData] = await Promise.all([
            getNotebookEntries(selectedClass, selectedTerm),
            getStudentNotebookSummary(student.id, selectedTerm),
          ]);

          setEntries(entriesData);
          setSummary(summaryData);
        } catch (error) {
          console.error('Erro ao recarregar dados:', error);
          toast.error('Erro ao recarregar dados');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  };

  const attendanceStats = calculateStudentAttendance(entries, student?.id || '');

  if (!student) {
    return (
      <Page title='Caderno'>
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500'></div>
        </div>
      </Page>
    );
  }

  return (
    <Page title='Caderno'>
      <div className='space-y-6'>
        {/* Header com controles */}
        <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Meu Caderno</h1>
            <p className='text-gray-600'>
              Acompanhe sua presença e atividades por bimestre
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant='outline'
            disabled={loading || !selectedClass}
          >
            Atualizar
          </Button>
        </div>

        {/* Seletores */}
        <Card className='p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Seletor de Turma */}
            <div>
              <label 
                htmlFor='class-select' 
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Turma
              </label>
              <select
                id='class-select'
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                disabled={loading}
              >
                <option value=''>Selecione uma turma</option>
                {student.classes?.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.series}ª série
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Bimestre */}
            <div>
              <label 
                htmlFor='term-select' 
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Bimestre
              </label>
              <select
                id='term-select'
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(Number(e.target.value))}
                className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                disabled={loading || !selectedClass}
              >
                {[1, 2, 3, 4].map(term => (
                  <option key={term} value={term}>
                    {term}º Bimestre
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Resumo de Presença */}
        {selectedClass && summary && (
          <Card className='p-6 bg-blue-50 border-blue-200'>
            <h2 className='text-lg font-semibold text-blue-900 mb-4'>
              Resumo do {selectedTerm}º Bimestre
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-blue-600'>
                  {summary.totalItems}
                </div>
                <div className='text-sm text-blue-700'>Total de Atividades</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-600'>
                  {summary.seenCount}
                </div>
                <div className='text-sm text-green-700'>Vistas</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-orange-600'>
                  {summary.totalValue}
                </div>
                <div className='text-sm text-orange-700'>Valor Total</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-purple-600'>
                  {attendanceStats.attendanceRate}%
                </div>
                <div className='text-sm text-purple-700'>Presença</div>
              </div>
            </div>
          </Card>
        )}

        {/* Lista de Entradas */}
        {selectedClass ? (
          <Card className='p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Registros do Caderno
            </h2>
            
            {loading ? (
              <div className='space-y-3'>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className='animate-pulse'>
                    <div className='h-4 bg-gray-200 rounded w-3/4 mb-2'></div>
                    <div className='h-3 bg-gray-200 rounded w-1/2'></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className='text-center py-8'>
                <div className='text-red-600 mb-2'>{error}</div>
                <Button onClick={handleRefresh} variant='outline'>
                  Tentar Novamente
                </Button>
              </div>
            ) : entries.length === 0 ? (
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
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900'>
                  Nenhum registro encontrado
                </h3>
                <p className='mt-1 text-sm text-gray-500'>
                  Não há registros no caderno para este bimestre.
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Título
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Data
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Presença
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        % da Classe
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {entries.map((entry) => (
                      <tr key={entry._id} className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm font-medium text-gray-900'>
                            {entry.title || '-'}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {formatNotebookDate(entry.date)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {entry.alunos_feitos}/{entry.total_alunos}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {formatAttendancePercentage(entry.percentual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card className='p-8'>
            <div className='text-center'>
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
                  d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                Selecione uma turma
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                Escolha uma turma para visualizar os registros do caderno.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
