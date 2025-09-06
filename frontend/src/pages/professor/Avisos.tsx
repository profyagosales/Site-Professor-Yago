import { Page } from '@/components/Page';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import AnnouncementModal from '@/components/AnnouncementModal';
import AnnouncementList from '@/components/AnnouncementList';
import { type Announcement } from '@/services/announcements';

export default function AvisosPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setShowModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
  };

  const handleSaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Page 
      title="Gerenciar Avisos" 
      subtitle="Crie, edite e agende avisos para suas turmas"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Avisos</h2>
            <p className="text-gray-600">Gerencie avisos e recados para suas turmas</p>
          </div>
          <Button onClick={handleCreate} variant="primary" data-testid="create-announcement-button">
            Criar Aviso
          </Button>
        </div>

        {/* Lista de avisos */}
        <Card className="p-6">
          <AnnouncementList 
            key={refreshKey}
            onEdit={handleEdit}
            onRefresh={handleSaved}
          />
        </Card>

        {/* Modal de criação/edição */}
        <AnnouncementModal
          open={showModal}
          onClose={handleModalClose}
          onSaved={handleSaved}
          editingAnnouncement={editingAnnouncement}
        />
      </div>
    </Page>
  );
}
