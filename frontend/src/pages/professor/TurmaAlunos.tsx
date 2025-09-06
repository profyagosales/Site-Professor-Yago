import { Page } from '@/components/Page';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import React, { useState } from 'react';
import EditStudentModal from '@/components/EditStudentModal';
import { useParams, Link } from 'react-router-dom';
import { getClassById } from '@/services/classes';
import NewStudentModal from '@/components/NewStudentModal';
import InviteStudentModal from '@/components/InviteStudentModal';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';
import { useStudents } from '@/hooks/useStudents';
import { ROUTES } from '@/routes';

export default function TurmaAlunosPage() {
  const { id: classId } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [classeInfo, setClasseInfo] = useState<any | null>(null);

  // Hook para gerenciar estudantes
  const {
    students: alunos,
    total,
    totalPages,
    currentPage,
    pageSize,
    isLoading: loading,
    isCreating,
    isUpdating,
    isDeleting,
    isInviting,
    error: err,
    searchQuery,
    setSearchQuery,
    goToPage,
    setPageSize,
    createStudent: handleCreateStudent,
    updateStudent: handleUpdateStudent,
    deleteStudent: handleDeleteStudent,
    inviteStudent: handleInviteStudent,
    clearError,
  } = useStudents({
    classId: classId || '',
    autoLoad: true,
    showToasts: true,
    enableLogging: true,
    syncWithUrl: true,
  });

  // Carregar informações da turma
  React.useEffect(() => {
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

  const titulo = classeInfo
    ? `${classeInfo.series || ''}º ${classeInfo.letter || ''} — ${classeInfo.discipline || ''}`.trim()
    : 'Turma';
  return (
    <Page title={titulo} subtitle='Alunos cadastrados'>
      <div className='mb-4'>
        <div className='mb-4 flex items-center justify-between'>
          <Link
            to={ROUTES.prof.turmas}
            className='text-sm text-ys-ink-2 hover:text-ys-ink'
          >
            ← Voltar para Turmas
          </Link>
        </div>
        
        {/* Barra de busca */}
        <div className='mb-4'>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar alunos por nome ou e-mail..."
            loading={loading}
            className="max-w-md"
          />
        </div>
        
        {/* Botões de ação */}
        <div className='flex gap-2 mb-4'>
          <Button disabled={!classId} onClick={() => setModalOpen(true)}>
            Novo Aluno
          </Button>
          <Button 
            variant="outline" 
            disabled={!classId} 
            onClick={() => setIsInviteOpen(true)}
          >
            📧 Convidar por E-mail
          </Button>
        </div>
      </div>

      {/* Mensagem de erro */}
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
      
      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-ys-ink-2">Carregando alunos…</span>
        </div>
      ) : (
        <>
          {/* Tabela de alunos */}
          <div className="mb-4">
            <Table>
              <thead>
                <tr>
                  <Th>Aluno</Th>
                  <Th>E-mail</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a: any) => {
                  const isProcessing = (isUpdating && selectedStudent?.id === a.id) || 
                                      (isDeleting && selectedStudent?.id === a.id);
                  
                  return (
                    <tr key={a._id || a.id} className={isProcessing ? 'opacity-50' : ''}>
                      <Td>
                        <div className='flex items-center gap-3'>
                          {a.photo && (
                            <img
                              src={
                                /^data:/.test(a.photo)
                                  ? a.photo
                                  : `data:image/jpeg;base64,${a.photo}`
                              }
                              alt={a.name || a.nome}
                              className='h-10 w-10 rounded-full object-cover'
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <span>{a.name || a.nome}</span>
                            {isProcessing && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>{a.email || '-'}</Td>
                      <Td>
                        <div className='flex gap-2'>
                          <Button
                            variant='ghost'
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(a);
                              setIsEditOpen(true);
                            }}
                            disabled={isProcessing}
                          >
                            Editar
                          </Button>
                          <Button
                            variant='ghost'
                            size="sm"
                            onClick={async () => {
                              if (!confirm('Remover aluno?')) return;
                              setSelectedStudent(a);
                              await handleDeleteStudent(a._id || a.id);
                            }}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remover
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            
            {/* Estado vazio */}
            {alunos.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className='text-ys-ink-2 mb-4'>
                  {searchQuery ? 'Nenhum aluno encontrado para a busca.' : 'Nenhum aluno cadastrado nesta turma.'}
                </p>
                {!searchQuery && (
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setModalOpen(true)}>
                      Cadastrar primeiro aluno
                    </Button>
                    <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
                      Convidar por e-mail
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
              loading={loading}
            />
          )}
        </>
      )}

      <NewStudentModal
        classId={classId!}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={async (student) => {
          await handleCreateStudent(student);
        }}
      />
      <EditStudentModal
        classId={classId!}
        student={selectedStudent}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedStudent(null);
        }}
        onUpdated={async (student) => {
          if (selectedStudent) {
            await handleUpdateStudent(selectedStudent._id || selectedStudent.id, student);
          }
        }}
      />
      <InviteStudentModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInviteStudent}
        isLoading={isInviting}
      />
    </Page>
  );
}
