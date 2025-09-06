import { Page } from '@/components/Page';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClassModal from '@/components/ClassModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useClasses } from '@/hooks/useClasses';
import { ROUTES } from '@/routes';
import { generateClassName } from '@/services/classes';

export default function TurmasPage() {
  const nav = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [deletingClass, setDeletingClass] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Hook para gerenciar turmas
  const {
    classes: turmas,
    isLoading: loading,
    isCreating,
    isUpdating,
    isDeleting,
    error: err,
    createClass: handleCreateClass,
    updateClass: handleUpdateClass,
    deleteClass: handleDeleteClass,
    clearError,
  } = useClasses({
    autoLoad: true,
    showToasts: true,
    enableLogging: true,
  });

  // Handlers para CRUD
  const handleCreate = async (payload: any) => {
    const result = await handleCreateClass(payload);
    if (result) {
      setIsModalOpen(false);
    }
  };

  const handleEdit = (turma: any) => {
    setEditingClass(turma);
    setIsModalOpen(true);
  };

  const handleUpdate = async (payload: any) => {
    if (!editingClass) return;
    
    const result = await handleUpdateClass(editingClass.id || editingClass._id, payload);
    if (result) {
      setIsModalOpen(false);
      setEditingClass(null);
    }
  };

  const handleDeleteClick = (turma: any) => {
    setDeletingClass(turma);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClass) return;
    
    const result = await handleDeleteClass(deletingClass.id || deletingClass._id);
    if (result) {
      setIsConfirmOpen(false);
      setDeletingClass(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClass(null);
    clearError();
  };

  const handleConfirmClose = () => {
    setIsConfirmOpen(false);
    setDeletingClass(null);
  };

  return (
    <Page title='Turmas' subtitle='Gerencie turmas, alunos e avaliações.'>
      <div className='mb-4'>
        <Button onClick={() => setIsModalOpen(true)}>Nova Turma</Button>
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className='text-red-600'>{err}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm text-red-600 underline"
          >
            Fechar
          </button>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-ys-ink-2">Carregando turmas…</span>
        </div>
      )}
      
      {!loading && (
        <div className='grid sm:grid-cols-2 gap-4'>
          {turmas.map((t: any) => {
            const className = t.name || generateClassName(t.series, t.letter);
            const isProcessing = (isUpdating && editingClass?.id === t.id) || 
                                (isDeleting && deletingClass?.id === t.id);
            
            return (
              <Card key={t.id || t._id} className={isProcessing ? 'opacity-50' : ''}>
                <CardBody>
                  <CardTitle className="flex items-center justify-between">
                    <span>{className}</span>
                    {isProcessing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                    )}
                  </CardTitle>
                  <CardSub>
                    Disciplina: {t.discipline || t.disciplina || '-'}
                  </CardSub>
                  {t.studentCount !== undefined && (
                    <p className="text-sm text-gray-600 mt-1">
                      {t.studentCount} {t.studentCount === 1 ? 'aluno' : 'alunos'}
                    </p>
                  )}
                  <div className='mt-4 flex gap-2 flex-wrap'>
                    <Button
                      onClick={() => nav(ROUTES.prof.turmaDetalhes(t._id || t.id))}
                      disabled={isProcessing}
                      variant='primary'
                    >
                      Ver detalhes
                    </Button>
                    <Button
                      onClick={() => nav(ROUTES.prof.turmaAlunos(t._id || t.id))}
                      disabled={isProcessing}
                    >
                      Ver alunos
                    </Button>
                    <Button
                      onClick={() => nav(ROUTES.prof.turmaCaderno(t._id || t.id))}
                      disabled={isProcessing}
                      variant='outline'
                    >
                      Caderno
                    </Button>
                    <Button 
                      variant='ghost' 
                      onClick={() => handleEdit(t)}
                      disabled={isProcessing}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant='ghost' 
                      onClick={() => handleDeleteClick(t)}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
          {turmas.length === 0 && !loading && (
            <div className="col-span-full text-center py-8">
              <p className='text-ys-ink-2 mb-4'>Nenhuma turma encontrada.</p>
              <Button onClick={() => setIsModalOpen(true)}>
                Criar primeira turma
              </Button>
            </div>
          )}
        </div>
      )}
      <ClassModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={editingClass ? handleUpdate : handleCreate}
        initialData={editingClass}
        isLoading={isCreating || isUpdating}
      />
      
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleDeleteConfirm}
        title="Excluir Turma"
        message={`Tem certeza que deseja excluir a turma "${deletingClass ? generateClassName(deletingClass.series, deletingClass.letter) : ''}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />
    </Page>
  );
}
