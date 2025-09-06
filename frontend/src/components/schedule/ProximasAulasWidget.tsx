import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { 
  getUpcomingClasses, 
  getWeekdayName, 
  formatTime,
  type Schedule 
} from '@/services/schedules';
import { listClasses } from '@/services/classes';

interface ProximasAulasWidgetProps {
  classId?: string;
}

export default function ProximasAulasWidget({ classId }: ProximasAulasWidgetProps) {
  const [upcomingClasses, setUpcomingClasses] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar turmas e próximas aulas
  useEffect(() => {
    loadData();
  }, [selectedClassId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar turmas se não foi especificada uma turma
      if (!classId) {
        const classesData = await listClasses();
        setClasses(classesData);
        
        if (classesData.length > 0 && !selectedClassId) {
          setSelectedClassId(classesData[0].id);
          return; // Será recarregado no próximo useEffect
        }
      }

      // Carregar próximas aulas
      if (selectedClassId) {
        const upcoming = await getUpcomingClasses(selectedClassId, 5);
        setUpcomingClasses(upcoming);
      }
    } catch (error) {
      console.error('Erro ao carregar próximas aulas:', error);
      setError('Erro ao carregar próximas aulas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (schedule: Schedule) => {
    const today = new Date();
    const currentWeekday = today.getDay();
    
    if (schedule.weekday === currentWeekday) {
      return 'Hoje';
    }
    
    const daysUntil = (schedule.weekday - currentWeekday + 7) % 7;
    if (daysUntil === 1) {
      return 'Amanhã';
    }
    
    return `Em ${daysUntil} dias`;
  };

  const getTimeUntilClass = (schedule: Schedule) => {
    const today = new Date();
    const currentWeekday = today.getDay();
    const currentTime = today.toTimeString().slice(0, 5);
    
    if (schedule.weekday === currentWeekday) {
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
      
      const classMinutes = hours * 60 + minutes;
      const currentMinutesTotal = currentHours * 60 + currentMinutes;
      
      if (classMinutes > currentMinutesTotal) {
        const diffMinutes = classMinutes - currentMinutesTotal;
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        
        if (diffHours > 0) {
          return `${diffHours}h ${remainingMinutes}min`;
        }
        return `${remainingMinutes}min`;
      }
    }
    
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Carregando...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-2">
            Tentar Novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="proximas-aulas-widget">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Próximas Aulas
        </h3>
        {selectedClassId && (
          <Link to={ROUTES.prof.turmaDetalhes(selectedClassId)}>
            <Button variant="outline" size="sm">
              Ver Horário
            </Button>
          </Link>
        )}
      </div>

      {/* Seletor de turma */}
      {!classId && classes.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            data-testid="class-selector"
          >
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.series}º {classe.letter} - {classe.discipline}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de próximas aulas */}
      {upcomingClasses.length === 0 ? (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h4 className="mt-2 text-sm font-medium text-gray-900">
            Nenhuma aula agendada
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            Não há aulas próximas para esta turma.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingClasses.map((schedule) => {
            const timeUntil = getTimeUntilClass(schedule);
            
            return (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                data-testid={`upcoming-class-${schedule.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.subject}
                    </div>
                    {schedule.room && (
                      <div className="text-xs text-gray-500">
                        {schedule.room}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="text-xs text-gray-600">
                      {getWeekdayName(schedule.weekday)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatDate(schedule)}
                    </div>
                    {timeUntil && (
                      <div className="text-xs font-medium text-orange-600">
                        em {timeUntil}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {schedule.durationFormatted}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link para ver todos */}
      {upcomingClasses.length > 0 && selectedClassId && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link 
            to={ROUTES.prof.turmaDetalhes(selectedClassId)}
            className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            data-testid="view-all-schedule-link"
          >
            Ver horário completo →
          </Link>
        </div>
      )}
    </Card>
  );
}
