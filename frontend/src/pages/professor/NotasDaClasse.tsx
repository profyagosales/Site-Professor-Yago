import { Page } from '@/components/Page';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import GradeMatrix from '@/components/GradeMatrix';
import ExportButton from '@/components/ExportButton';
import { getClassById } from '@/services/classes';
import { 
  listClassGrades, 
  computeTermTotals, 
  computeTermAverages,
  type ClassGradesMatrix 
} from '@/services/grades';
import { GradesExport, showExportFormatSelector } from '@/utils/export';
import { ROUTES } from '@/routes';
import { toast } from 'react-toastify';

export default function NotasDaClasse() {
  const { id: classId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classeInfo, setClasseInfo] = useState<any | null>(null);
  const [term, setTerm] = useState(searchParams.get('term') || '1');
  const [gradesMatrix, setGradesMatrix] = useState<ClassGradesMatrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar informações da turma
  useEffect(() => {
    if (!classId) return;
    
    const loadClassInfo = async () => {
      try {
        const info = await getClassById(classId);
        setClasseInfo(info);
      } catch (error) {
        console.error('Erro ao carregar informações da turma:', error);
      }
    };
    
    loadClassInfo();
  }, [classId]);

  // Carregar notas da turma
  useEffect(() => {
    if (!classId) return;
    
    const loadGrades = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await listClassGrades({
          classId,
          term: parseInt(term)
        });
        
        setGradesMatrix(data);
      } catch (error) {
        console.error('Erro ao carregar notas:', error);
        setError('Erro ao carregar notas da turma');
        toast.error('Erro ao carregar notas da turma');
      } finally {
        setLoading(false);
      }
    };
    
    loadGrades();
  }, [classId, term]);

  const titulo = classeInfo
    ? `${classeInfo.series || ''}º ${classeInfo.letter || ''} — ${classeInfo.discipline || ''}`.trim()
    : 'Notas da Classe';

  const handleExport = () => {
    if (!gradesMatrix) return;
    
    // Preparar dados para exportação
    const exportData = [];
    
    gradesMatrix.students.forEach(student => {
      gradesMatrix.evaluations.forEach(evaluation => {
        const grade = gradesMatrix.grades.find(
          g => g.studentId === student.id && g.evaluationId === evaluation.id
        );
        
        exportData.push({
          studentName: student.name,
          evaluationName: evaluation.name,
          score: grade?.score || '-',
          bimester: term
        });
      });
    });
    
    showExportFormatSelector((format) => {
      try {
        GradesExport.exportClassGrades(exportData, format);
        toast.success(`Notas exportadas para ${format.toUpperCase()}`);
      } catch (error) {
        console.error('Erro ao exportar notas:', error);
        toast.error('Erro ao exportar notas');
      }
    });
  };

  const handleRefresh = () => {
    if (classId) {
      const loadGrades = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const data = await listClassGrades({
            classId,
            term: parseInt(term)
          });
          
          setGradesMatrix(data);
        } catch (error) {
          console.error('Erro ao recarregar notas:', error);
          setError('Erro ao recarregar notas');
          toast.error('Erro ao recarregar notas');
        } finally {
          setLoading(false);
        }
      };
      
      loadGrades();
    }
  };

  if (!classId) {
    return (
      <Page title="Notas da Classe" subtitle="Selecione uma turma para visualizar as notas.">
        <div className="text-center py-8">
          <p className="text-ys-ink-2">Turma não encontrada.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title={titulo} subtitle="Matriz de notas editável">
      <div className="space-y-6">
        {/* Cabeçalho com controles */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Seletor de bimestre */}
          <div className="flex items-center gap-4">
            <label htmlFor="term-select" className="text-sm font-medium text-gray-700">
              Bimestre:
            </label>
            <select
              id="term-select"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1º Bimestre</option>
              <option value="2">2º Bimestre</option>
              <option value="3">3º Bimestre</option>
              <option value="4">4º Bimestre</option>
            </select>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button
              onClick={handleExport}
              disabled={!gradesMatrix || loading}
              variant="primary"
              size="sm"
            >
              Exportar CSV/XLSX
            </Button>
          </div>
        </div>

        {/* Estado de erro */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <p className="text-red-600">{error}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Tentar Novamente
              </Button>
            </div>
          </Card>
        )}

        {/* Estado de loading */}
        {loading && (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">Carregando notas...</span>
            </div>
          </Card>
        )}

        {/* Matriz de notas */}
        {!loading && !error && (
          <GradeMatrix
            classId={classId}
            term={term}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          />
        )}

        {/* Resumo de notas */}
        {gradesMatrix && !loading && !error && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Resumo do {term}º Bimestre
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {gradesMatrix.students.length}
                </div>
                <div className="text-sm text-blue-700">Alunos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {gradesMatrix.evaluations.length}
                </div>
                <div className="text-sm text-green-700">Avaliações</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {gradesMatrix.grades.length}
                </div>
                <div className="text-sm text-orange-700">Notas Lançadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    Object.values(gradesMatrix.termAverages).reduce((a, b) => a + b, 0) / 
                    Object.values(gradesMatrix.termAverages).length * 10
                  ) / 10 || 0}
                </div>
                <div className="text-sm text-purple-700">Média da Turma</div>
              </div>
            </div>
          </Card>
        )}

        {/* Informações adicionais */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Instruções:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Digite notas de 0 a 10 com até 1 casa decimal (ex: 8.5)</li>
            <li>• Use as setas do teclado para navegar entre as células</li>
            <li>• Pressione Enter para ir para a próxima linha</li>
            <li>• As notas são salvas automaticamente com debounce de 800ms</li>
            <li>• A média é calculada automaticamente com base nos pesos das avaliações</li>
          </ul>
        </div>
      </div>
    </Page>
  );
}
