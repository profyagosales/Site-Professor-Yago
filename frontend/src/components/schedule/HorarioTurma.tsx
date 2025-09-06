import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import Modal from '@/components/ui/modal.tsx';
import { Input } from '@/components/ui/input.tsx';
import Select from '@/components/ui/select.tsx';
import { toast } from 'react-toastify';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  validateSchedule,
  generateTimeOptions,
  getWeekdayName,
  getWeekdayShort,
  organizeSchedulesByWeekday,
  type Schedule,
  type CreateScheduleData,
  type UpdateScheduleData
} from '@/services/schedules';

interface HorarioTurmaProps {
  classId: string;
}

export default function HorarioTurma({ classId }: HorarioTurmaProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<CreateScheduleData>({
    classId,
    weekday: 1,
    startTime: '08:00',
    endTime: '09:00',
    subject: '',
    room: ''
  });

  const timeOptions = generateTimeOptions();
  const weekdays = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' }
  ];

  // Carregar horários
  useEffect(() => {
    loadSchedules();
  }, [classId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSchedules(classId);
      setSchedules(data);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setError('Erro ao carregar horários');
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSchedule(null);
    setFormData({
      classId,
      weekday: 1,
      startTime: '08:00',
      endTime: '09:00',
      subject: '',
      room: ''
    });
    setShowModal(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      classId,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject,
      room: schedule.room || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este horário?')) return;
    
    try {
      await deleteSchedule(id);
      toast.success('Horário excluído com sucesso');
      loadSchedules();
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      toast.error('Erro ao excluir horário');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    const validation = validateSchedule(formData);
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        toast.success('Horário atualizado com sucesso');
      } else {
        await createSchedule(formData);
        toast.success('Horário criado com sucesso');
      }
      
      setShowModal(false);
      loadSchedules();
    } catch (error: any) {
      console.error('Erro ao salvar horário:', error);
      const message = error?.response?.data?.message || 'Erro ao salvar horário';
      toast.error(message);
    }
  };

  const organizedSchedules = organizeSchedulesByWeekday(schedules);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Carregando horários...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Horário Semanal</h2>
          <p className="text-gray-600">Gerencie a grade de horários da turma</p>
        </div>
        <Button onClick={handleCreate} variant="primary" data-testid="create-schedule-button">
          Adicionar Aula
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadSchedules} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Grade semanal */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horário
                </th>
                {weekdays.map(day => (
                  <th key={day.value} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getWeekdayShort(day.value)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Gerar slots de horário das 7h às 22h */}
              {Array.from({ length: 16 }, (_, i) => {
                const hour = 7 + i;
                const timeSlots = Array.from({ length: 12 }, (_, j) => {
                  const minute = j * 5;
                  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                });
                
                return timeSlots.map((time, timeIndex) => (
                  <tr key={`${hour}-${timeIndex}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {time}
                    </td>
                    {weekdays.map(day => {
                      const schedule = organizedSchedules[day.value].find(s => 
                        s.startTime === time
                      );
                      
                      return (
                        <td key={day.value} className="px-2 py-4 text-center">
                          {schedule ? (
                            <div className="bg-orange-100 rounded-lg p-2 text-xs">
                              <div className="font-medium text-orange-900">
                                {schedule.subject}
                              </div>
                              {schedule.room && (
                                <div className="text-orange-700">
                                  {schedule.room}
                                </div>
                              )}
                              <div className="flex justify-center space-x-1 mt-1">
                                <button
                                  onClick={() => handleEdit(schedule)}
                                  className="text-orange-600 hover:text-orange-800"
                                  data-testid={`edit-schedule-${schedule.id}`}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="text-red-600 hover:text-red-800"
                                  data-testid={`delete-schedule-${schedule.id}`}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lista de horários */}
      {schedules.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lista de Horários
          </h3>
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900">
                    {getWeekdayName(schedule.weekday)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {schedule.startTime} - {schedule.endTime}
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {schedule.subject}
                  </div>
                  {schedule.room && (
                    <div className="text-sm text-gray-500">
                      Sala: {schedule.room}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEdit(schedule)}
                    variant="outline"
                    size="sm"
                    data-testid={`edit-schedule-list-${schedule.id}`}
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(schedule.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    data-testid={`delete-schedule-list-${schedule.id}`}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal de criação/edição */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingSchedule ? 'Editar Horário' : 'Adicionar Aula'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="weekday" className="block text-sm font-medium text-gray-700 mb-1">
              Dia da Semana *
            </label>
            <Select
              id="weekday"
              value={formData.weekday}
              onChange={(e) => setFormData({ ...formData, weekday: parseInt(e.target.value) })}
              required
            >
              {weekdays.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Início *
              </label>
              <Select
                id="startTime"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Fim *
              </label>
              <Select
                id="endTime"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Matéria *
            </label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Matemática, Física, Química"
              required
            />
          </div>
          
          <div>
            <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
              Sala (opcional)
            </label>
            <Input
              id="room"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="Ex: Sala 101, Laboratório 2"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingSchedule ? 'Atualizar' : 'Criar'} Horário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
