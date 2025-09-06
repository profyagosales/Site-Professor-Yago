import { Page } from '@/components/Page';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentProfile } from '@/services/student';
import { 
  listStudentAnnouncements, 
  processAnnouncements, 
  type Announcement 
} from '@/services/announcements';
import { ROUTES } from '@/routes';
import { toast } from 'react-toastify';

export default function RecadosAluno() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentId, setStudentId] = useState<string | null>(null);

  const loadAnnouncements = async (page = 1, append = false) => {
    if (!studentId) return;
    
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const data = await listStudentAnnouncements(studentId, {
        limit: 10,
        page,
      });

      const processedData = processAnnouncements(data);
      
      if (append) {
        setAnnouncements(prev => [...prev, ...processedData]);
      } else {
        setAnnouncements(processedData);
      }

      setHasMore(data.length === 10);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar recados:', error);
      toast.error('Erro ao carregar recados');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadAnnouncements(currentPage + 1, true);
  };

  const handleRefresh = () => {
    loadAnnouncements(1, false);
  };

  useEffect(() => {
    const initializeStudent = async () => {
      try {
        const student = await getStudentProfile();
        setStudentId(student.id);
      } catch (error) {
        console.error('Erro ao carregar perfil do aluno:', error);
        toast.error('Erro ao carregar perfil');
        navigate(ROUTES.aluno.login);
      }
    };

    initializeStudent();
  }, [navigate]);

  useEffect(() => {
    if (studentId) {
      loadAnnouncements(1, false);
    }
  }, [studentId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Page title='Recados'>
        <div className='space-y-4'>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className='p-6'>
              <div className='animate-pulse'>
                <div className='h-4 bg-gray-200 rounded w-3/4 mb-2'></div>
                <div className='h-3 bg-gray-200 rounded w-1/2'></div>
              </div>
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page title='Recados'>
      <div className='space-y-4'>
        {/* Header com botão de refresh */}
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Recados</h1>
            <p className='text-gray-600'>
              {announcements.length} recado{announcements.length !== 1 ? 's' : ''} disponível{announcements.length !== 1 ? 'is' : ''}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant='outline'
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>

        {/* Lista de recados */}
        {announcements.length === 0 ? (
          <Card className='p-8'>
            <div className='text-center'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                Nenhum recado disponível
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                Os recados do professor aparecerão aqui quando disponíveis.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {announcements.map((announcement) => (
              <Card key={announcement.id} className='p-6 hover:shadow-md transition-shadow'>
                <div className='space-y-3'>
                  {/* Header do recado */}
                  <div className='flex justify-between items-start'>
                    <div className='flex-1'>
                      {announcement.title && (
                        <h3 className='text-lg font-semibold text-gray-900 mb-1'>
                          {announcement.title}
                        </h3>
                      )}
                      <p className='text-sm text-gray-600'>
                        {announcement.teacherName && `Por: ${announcement.teacherName}`}
                        {announcement.className && ` • ${announcement.className}`}
                      </p>
                    </div>
                    <span className='text-sm text-gray-500 whitespace-nowrap ml-4'>
                      {formatDate(announcement.publishAt || announcement.createdAt)}
                    </span>
                  </div>

                  {/* Conteúdo do recado */}
                  <div className='text-gray-800 whitespace-pre-wrap'>
                    {announcement.message}
                  </div>
                </div>
              </Card>
            ))}

            {/* Botão Carregar mais */}
            {hasMore && (
              <div className='text-center pt-4'>
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant='outline'
                >
                  {loadingMore ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
