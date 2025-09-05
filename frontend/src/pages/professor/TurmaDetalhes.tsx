import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClassById } from '@/services/classes';
import { ROUTES } from '@/routes';
import { toast } from 'react-toastify';
import { HorarioTurma } from '@/components/schedule/HorarioTurma';
import { AlunosTurma } from '@/components/schedule/AlunosTurma';
import { NotasTurma } from '@/components/schedule/NotasTurma';

export default function TurmaDetalhes() {
  const { id: classId } = useParams();
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'horario' | 'alunos' | 'notas'>('horario');

  const tabs = [
    {
      id: 'horario' as const,
      label: 'Horário',
      description: 'Grade semanal de aulas'
    },
    {
      id: 'alunos' as const,
      label: 'Alunos',
      description: 'Lista de estudantes'
    },
    {
      id: 'notas' as const,
      label: 'Notas',
      description: 'Notas da turma'
    }
  ];

  // Carregar informações da turma
  useEffect(() => {
    const loadClassInfo = async () => {
      if (!classId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getClassById(classId);
        setClassInfo(data);
      } catch (error) {
        console.error('Erro ao carregar turma:', error);
        setError('Erro ao carregar informações da turma');
        toast.error('Erro ao carregar informações da turma');
      } finally {
        setLoading(false);
      }
    };

    loadClassInfo();
  }, [classId]);

  if (loading) {
    return (
      <Page title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </Page>
    );
  }

  if (error || !classInfo) {
    return (
      <Page title="Turma não encontrada">
        <Card className="p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {error || 'Turma não encontrada'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Verifique se a turma existe e você tem permissão para acessá-la.
            </p>
            <div className="mt-6">
              <Link to={ROUTES.prof.turmas}>
                <Button variant="outline">
                  Voltar para Turmas
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page 
      title={`${classInfo.series}º ${classInfo.letter} - ${classInfo.discipline}`}
      subtitle={`Turma ${classInfo.series}${classInfo.letter}`}
    >
      <div className="space-y-6">
        {/* Informações da turma */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {classInfo.series}º {classInfo.letter} - {classInfo.discipline}
              </h2>
              <p className="text-gray-600 mt-1">
                {classInfo.description || 'Sem descrição'}
              </p>
              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Série:</span> {classInfo.series}º
                </div>
                <div>
                  <span className="font-medium">Turma:</span> {classInfo.letter}
                </div>
                <div>
                  <span className="font-medium">Disciplina:</span> {classInfo.discipline}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link to={ROUTES.prof.turmaAlunos(classId!)}>
                <Button variant="outline" size="sm">
                  Ver Alunos
                </Button>
              </Link>
              <Link to={ROUTES.prof.turmaCaderno(classId!)}>
                <Button variant="outline" size="sm">
                  Caderno
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Navegação por abas */}
        <Card className="p-1" data-testid="turma-tabs">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75 mt-1">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Conteúdo das abas */}
        <div className="space-y-6">
          {activeTab === 'horario' && <HorarioTurma classId={classId!} />}
          {activeTab === 'alunos' && <AlunosTurma classId={classId!} />}
          {activeTab === 'notas' && <NotasTurma classId={classId!} />}
        </div>
      </div>
    </Page>
  );
}
