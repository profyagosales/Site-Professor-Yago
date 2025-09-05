import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDiary } from '@/hooks/useDiary';
import DiaryEntry from '@/components/DiaryEntry';
import DiaryHistoryDrawer from '@/components/DiaryHistoryDrawer';
import ExportButton from '@/components/ExportButton';
import { getClassById, listClasses } from '@/services/classes';
import { getCurrentUser } from '@/services/auth';
import { formatDiaryDate, getTodayDate } from '@/services/diary';
import { ROUTES } from '@/routes';
import { generateClassName } from '@/services/classes';

export default function CadernoProf() {
  const { id: classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classeInfo, setClasseInfo] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getTodayDate());
  const [showHistory, setShowHistory] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Hook do diário
  const {
    diaryData,
    students,
    entries,
    history,
    isLoading,
    isSaving,
    isHistoryLoading,
    error,
    updateEntry,
    saveDiary,
    loadHistory,
    clearError,
    hasUnsavedChanges,
    lastSavedAt,
  } = useDiary({
    classId: classId || '',
    date: selectedDate,
    enableAutosave: true,
    showToasts: true,
    enableLogging: true,
  });

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

  // Carregar turmas quando não há classId
  useEffect(() => {
    if (classId) return;
    
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const user = await getCurrentUser();
        if (!user?.id) return;

        const classesData = await listClasses({ teacherId: user.id });
        setClasses(classesData);
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
      } finally {
        setLoadingClasses(false);
      }
    };
    
    loadClasses();
  }, [classId]);

  // Atualizar URL quando data muda
  useEffect(() => {
    if (classId) {
      setSearchParams({ date: selectedDate });
    }
  }, [selectedDate, classId, setSearchParams]);

  // Carregar histórico quando drawer abre
  useEffect(() => {
    if (showHistory && history.length === 0) {
      loadHistory();
    }
  }, [showHistory, history.length, loadHistory]);

  const titulo = classeInfo
    ? `${classeInfo.series || ''}º ${classeInfo.letter || ''} — ${classeInfo.discipline || ''}`.trim()
    : 'Caderno (Professor)';

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleHistoryDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowHistory(false);
  };

  const handleSaveNow = async () => {
    await saveDiary();
  };

  const handleClassSelect = (selectedClassId: string) => {
    navigate(ROUTES.prof.turmaCaderno(selectedClassId));
  };

  if (!classId) {
    return (
      <Page title="Caderno (Professor)" subtitle="Selecione uma turma para acessar o diário.">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Selecionar Turma
            </h2>
            <p className="text-gray-600 mb-6">
              Escolha uma turma para acessar o caderno de presença e atividades:
            </p>
            
            {loadingClasses ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Carregando turmas...</span>
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhuma turma encontrada
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Você precisa criar uma turma primeiro.
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => navigate(ROUTES.prof.turmas)}
                    variant="outline"
                  >
                    Ir para Turmas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((cls) => {
                  const className = cls.name || generateClassName(cls.series, cls.letter);
                  return (
                    <Card
                      key={cls.id || cls._id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-orange-300"
                      onClick={() => handleClassSelect(cls.id || cls._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{className}</h3>
                          <p className="text-sm text-gray-600">
                            {cls.discipline || cls.disciplina || 'Disciplina não definida'}
                          </p>
                          {cls.studentCount !== undefined && (
                            <p className="text-sm text-gray-500">
                              {cls.studentCount} {cls.studentCount === 1 ? 'aluno' : 'alunos'}
                            </p>
                          )}
                        </div>
                        <div className="text-orange-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </Page>
    );
  }

  return (
    <Page title={titulo} subtitle="Lançamentos diários de vistos e atividades">
      <div className="space-y-6">
        {/* Controles superiores */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Seletor de data */}
          <div className="flex items-center gap-4">
            <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
              Data:
            </label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {formatDiaryDate(selectedDate)}
            </span>
          </div>

                                {/* Botões de ação */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowHistory(true)}
                          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          Histórico
                        </button>
                        <ExportButton
                          type="attendance"
                          data={{ students, entries }}
                          filename={`Presenca_${classeInfo?.series || ''}${classeInfo?.letter || ''}_${selectedDate}`}
                          className={classeInfo ? `${classeInfo.series}${classeInfo.letter}` : ''}
                          date={selectedDate}
                          variant="outline"
                          size="sm"
                        >
                          Exportar CSV
                        </ExportButton>
                        <button
                          onClick={handleSaveNow}
                          disabled={!hasUnsavedChanges || isSaving}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? 'Salvando...' : 'Salvar Agora'}
                        </button>
                      </div>
        </div>

        {/* Status de salvamento */}
        {hasUnsavedChanges && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
            <span className="text-sm text-yellow-700">
              Alterações não salvas • Salvamento automático em andamento...
            </span>
          </div>
        )}

        {lastSavedAt && !hasUnsavedChanges && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700">
              Salvo automaticamente às {lastSavedAt.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 mb-2">{error}</p>
            <button 
              onClick={clearError}
              className="text-sm text-red-600 underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Lista de alunos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Carregando diário...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ys-ink-2">Nenhum aluno encontrado nesta turma.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const entry = entries.find(e => e.studentId === student.id);
              return (
                <DiaryEntry
                  key={student.id}
                  student={student}
                  entry={entry || null}
                  onUpdate={updateEntry}
                  disabled={isSaving}
                />
              );
            })}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Instruções:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Marque a presença de cada aluno</li>
            <li>• Descreva as atividades realizadas na aula</li>
            <li>• As alterações são salvas automaticamente após 1 segundo</li>
            <li>• Use o botão "Salvar Agora" para forçar o salvamento</li>
            <li>• Acesse o "Histórico" para ver os últimos 7 dias</li>
          </ul>
        </div>
      </div>

      {/* Drawer de histórico */}
      <DiaryHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        isLoading={isHistoryLoading}
        onDateSelect={handleHistoryDateSelect}
      />
    </Page>
  );
}
