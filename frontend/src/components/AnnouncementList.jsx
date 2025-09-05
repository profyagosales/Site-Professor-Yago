import { useState, useEffect } from 'react';
import { 
  listAnnouncements, 
  deleteAnnouncement, 
  publishAnnouncement,
  scheduleAnnouncement,
  cancelSchedule,
  getAnnouncementStatus,
  canEditAnnouncement,
  formatPublishDate
} from '@/services/announcements';
import type { Announcement } from '@/services/announcements';
import { toast } from 'react-toastify';

export default function AnnouncementList({ 
  classId, 
  onEdit, 
  onRefresh,
  limit
}: { 
  classId?: string; 
  onEdit?: (announcement: Announcement) => void;
  onRefresh?: () => void;
  limit?: number;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Carregar avisos
  useEffect(() => {
    loadAnnouncements();
  }, [classId, statusFilter]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAnnouncements({ 
        classId, 
        status: statusFilter || undefined,
        limit: limit || 50
      });
      setAnnouncements(data);
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
      setError('Erro ao carregar avisos');
      toast.error('Erro ao carregar avisos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
    
    try {
      await deleteAnnouncement(id);
      toast.success('Aviso excluído com sucesso');
      loadAnnouncements();
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Erro ao excluir aviso:', error);
      toast.error('Erro ao excluir aviso');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishAnnouncement(id);
      toast.success('Aviso publicado com sucesso');
      loadAnnouncements();
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Erro ao publicar aviso:', error);
      toast.error('Erro ao publicar aviso');
    }
  };

  const handleSchedule = async (id: string, publishAt: string) => {
    try {
      await scheduleAnnouncement(id, publishAt);
      toast.success('Aviso agendado com sucesso');
      loadAnnouncements();
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Erro ao agendar aviso:', error);
      toast.error('Erro ao agendar aviso');
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await cancelSchedule(id);
      toast.success('Agendamento cancelado com sucesso');
      loadAnnouncements();
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    const status = getAnnouncementStatus(announcement);
    
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClasses[status.color]}`}>
        <span className="mr-1">{status.icon}</span>
        {status.status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
      normal: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
      high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.normal;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Carregando avisos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadAnnouncements}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunhos</option>
          <option value="scheduled">Agendados</option>
          <option value="published">Publicados</option>
        </select>
        
        <button
          onClick={loadAnnouncements}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Atualizar
        </button>
      </div>

      {/* Lista de avisos */}
      {announcements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum aviso encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    {getStatusBadge(announcement)}
                    {getPriorityBadge(announcement.priority)}
                  </div>
                  
                  <p className="text-gray-700 mb-3">
                    {announcement.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Criado em: {new Date(announcement.createdAt).toLocaleString('pt-BR')}
                    </span>
                    {announcement.publishAt && (
                      <span>
                        Publicar em: {formatPublishDate(announcement.publishAt)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {canEditAnnouncement(announcement) && (
                    <button
                      onClick={() => onEdit && onEdit(announcement)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      data-testid={`edit-announcement-${announcement.id}`}
                    >
                      Editar
                    </button>
                  )}
                  
                  {announcement.isDraft && (
                    <button
                      onClick={() => handlePublish(announcement.id)}
                      className="px-3 py-1 text-sm text-green-600 hover:text-green-800"
                      data-testid={`publish-announcement-${announcement.id}`}
                    >
                      Publicar
                    </button>
                  )}
                  
                  {announcement.isScheduled && (
                    <button
                      onClick={() => handleCancelSchedule(announcement.id)}
                      className="px-3 py-1 text-sm text-orange-600 hover:text-orange-800"
                      data-testid={`cancel-schedule-${announcement.id}`}
                    >
                      Cancelar
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    data-testid={`delete-announcement-${announcement.id}`}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
