import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { getCurrentUser } from '@/services/auth';
import { listClasses } from '@/services/classes';
import { generateClassName } from '@/services/classes';

interface ClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionText?: string;
  onClassSelect?: (classId: string) => void;
}

export default function ClassSelectorModal({
  isOpen,
  onClose,
  title = 'Selecionar Turma',
  description = 'Escolha uma turma para continuar:',
  actionText = 'Abrir Caderno',
  onClassSelect,
}: ClassSelectorModalProps) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user?.id) return;

      const classesData = await listClasses({ teacherId: user.id });
      setClasses(classesData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (classId: string) => {
    if (onClassSelect) {
      onClassSelect(classId);
    } else {
      navigate(ROUTES.prof.turmaCaderno(classId));
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedClass('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
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
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {classes.map((cls) => {
                const className = cls.name || generateClassName(cls.series, cls.letter);
                return (
                  <button
                    key={cls.id || cls._id}
                    onClick={() => handleClassSelect(cls.id || cls._id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <div className="font-medium text-gray-900">{className}</div>
                    <div className="text-sm text-gray-600">
                      {cls.discipline || cls.disciplina || 'Disciplina não definida'}
                      {cls.studentCount !== undefined && (
                        <span className="ml-2">
                          • {cls.studentCount} {cls.studentCount === 1 ? 'aluno' : 'alunos'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
