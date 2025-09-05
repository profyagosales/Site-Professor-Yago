import { useEffect, useState } from 'react';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import { gradeEssay, sendCorrectionEmail } from '@/services/essays.service';
import { toast } from 'react-toastify';
import { toArray, api } from '@/services/api';
import { FaPen } from 'react-icons/fa';
import NovaRedacaoModal from './NovaRedacaoModal';
import Avatar from '@/components/Avatar';
import ThemeCombo from '@/components/redacao/ThemeCombo';
import { FaFilePdf } from 'react-icons/fa';
import { searchStudents } from '@/services/students2';
import { useDashboardEssaysWithCache } from '@/hooks/useDashboardEssaysWithCache';
import Pagination from '@/components/Pagination';
import EmptyEssaysState from '@/components/EmptyState';
import { useEssayHighlight } from '@/hooks/useEssayHighlight';
import { listClasses } from '@/services/classes';
import ExportButton from '@/components/ExportButton';

function DashboardRedacoes() {
  // Estados locais para modais e edição
  const [modalEssay, setModalEssay] = useState(null);
  const [editEssay, setEditEssay] = useState<any>(null);
  const [editTheme, setEditTheme] = useState<{ id?: string; name: string }>({
    name: '',
  });
  const [editBimester, setEditBimester] = useState('');
  const [editType, setEditType] = useState<'ENEM' | 'PAS'>('PAS');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editStudentQuery, setEditStudentQuery] = useState('');
  const [editStudentOptions, setEditStudentOptions] = useState<any[]>([]);
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  // Hook de highlight
  const { isHighlighted } = useEssayHighlight();

  // Função para carregar dados
  const loadData = async (filters: any) => {
    try {
      const params: any = {
        page: filters.page,
        pageSize: filters.pageSize,
      };

      if (filters.q) params.aluno = filters.q;
      if (filters.classId) params.turma = filters.classId;
      if (filters.bimester) params.bimestre = filters.bimester;
      if (filters.type) params.type = filters.type;

      let result;
      if (filters.status === 'pendentes') {
        result = await listarPendentes(params);
      } else {
        result = await listarCorrigidas(params);
      }

      const items = Array.isArray(result?.redacoes) ? result.redacoes : [];
      const total = result?.total || items.length;
      const totalPages = Math.ceil(total / filters.pageSize);

      return {
        items,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
      };
    } catch (error) {
      throw new Error('Erro ao carregar redações');
    }
  };

  // Hook principal do dashboard com cache
  const {
    filters,
    data,
    loading,
    isRefreshing,
    error,
    setStatus,
    setQuery,
    setClassId,
    setBimester,
    setType,
    setPage,
    setPageSize,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    reload,
    clearFilters,
    isUrlLoading,
    isStale,
    isFresh,
  } = useDashboardEssaysWithCache({ cacheTtlMs: 30000 });

  // Carrega classes para filtros
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await listClasses();
        const arr = Array.isArray(res?.data)
          ? res.data
          : res?.data?.data || res || [];
        setClasses(arr);
      } catch (error) {
        console.error('Erro ao carregar classes', error);
      }
    };

    loadClasses();
  }, []);

  const arrify = v => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (editEssay) {
      setEditTheme({
        id: editEssay.theme?._id || editEssay.theme?.id,
        name: editEssay.customTheme || editEssay.theme?.name || '',
      });
      setEditBimester(editEssay.bimester ? String(editEssay.bimester) : '');
      setEditType(editEssay.type || 'PAS');
      setEditFile(null);
      setEditStudent(editEssay.student || null);
      setEditStudentQuery(editEssay.student?.name || '');
    }
  }, [editEssay]);

  useEffect(() => {
    if (!editStudentQuery) {
      setEditStudentOptions([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await searchStudents({
          q: editStudentQuery,
          page: 1,
          pageSize: 10,
        });
        if (!alive) return;
        setEditStudentOptions(Array.isArray(r?.items) ? r.items : []);
      } catch {
        if (alive) setEditStudentOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editStudentQuery]);

  async function handleSendEmail(id: string) {
    try {
      const result = await sendCorrectionEmail(id);
      // Recarrega os dados após enviar email
      reload();
      toast.success(result.message || 'E-mail enviado com sucesso');
    } catch (err: any) {
      console.error('Erro ao enviar email', err);
      const message = err.message || err.response?.data?.message ?? 'Erro ao enviar email';
      toast.error(message);
    }
  }

  async function handleUpdateEssay() {
    if (!editEssay) return;
    setSaving(true);
    try {
      const payload: any = {
        student:
          editStudent?._id || editStudent?.id || editStudent?.name || undefined,
        theme: editTheme.id || editTheme.name || undefined,
        type: editType,
        bimester: editBimester ? Number(editBimester) : undefined,
      };

      let updated;
      if (editFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined) fd.append(k, String(v));
        });
        fd.append('file', editFile);
        ({ data: updated } = await api.put(`/essays/${editEssay._id}`, fd));
      } else {
        ({ data: updated } = await api.put(
          `/essays/${editEssay._id}`,
          payload
        ));
      }

      // Recarrega os dados após atualizar redação
      reload();
      toast.success('Redação atualizada');
      setEditEssay(null);
    } catch (err: any) {
      console.error('Erro ao atualizar redação', err);
      const message =
        err.response?.data?.message ?? 'Erro ao atualizar redação';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // Função para recarregar dados após operações
  const handleReload = () => {
    reload();
  };

  if (loading || isUrlLoading) {
    return (
      <div className='pt-20 p-md'>
        <div className='flex items-center justify-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500'></div>
          <span className='ml-2'>Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='pt-20 p-md'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <p className='text-red-600'>{error}</p>
          <button
            onClick={handleReload}
            className='mt-2 text-sm text-red-600 hover:text-red-800 underline'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const currentData = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className='pt-20 p-md'>
      {/* Cabeçalho com abas e botão nova redação */}
      <div className='flex gap-md mb-md'>
        <button
          className={`px-4 py-2 rounded ${filters.status === 'pendentes' ? 'bg-orange text-white' : 'bg-gray-200'}`}
          onClick={() => setStatus('pendentes')}
        >
          Pendentes
        </button>
        <button
          className={`px-4 py-2 rounded ${filters.status === 'corrigidas' ? 'bg-orange text-white' : 'bg-gray-200'}`}
          onClick={() => setStatus('corrigidas')}
        >
          Corrigidas
        </button>
        <ExportButton
          type="essays"
          data={{ essays: essays || [] }}
          filename={`Redacoes_${filters.status || 'Todas'}`}
          status={filters.status}
          variant="outline"
          size="sm"
          className="mr-2"
        >
          Exportar CSV
        </ExportButton>
        <button
          className='ys-btn-primary ml-auto'
          onClick={() => setNewModalOpen(true)}
        >
          Nova redação
        </button>
      </div>

      {/* Indicador de refresh em background */}
      {isRefreshing && (
        <div className='mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2'></div>
          <span className='text-sm text-blue-700'>
            Atualizando dados em background...
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className='flex gap-md mb-md flex-wrap'>
        <select
          value={filters.bimester}
          onChange={e => setBimester(e.target.value)}
          className='border rounded px-2 py-1'
        >
          <option value=''>Bimestre</option>
          <option value='1'>1º</option>
          <option value='2'>2º</option>
          <option value='3'>3º</option>
          <option value='4'>4º</option>
        </select>

        <select
          value={filters.classId}
          onChange={e => setClassId(e.target.value)}
          className='border rounded px-2 py-1'
        >
          <option value=''>Turma</option>
          {classes.map(c => (
            <option key={c._id || c.id} value={c._id || c.id}>
              {`${c.series || ''}${c.letter || ''}`}{' '}
              {c.discipline ? `— ${c.discipline}` : ''}
            </option>
          ))}
        </select>

        <input
          value={filters.q}
          onChange={e => setQuery(e.target.value)}
          placeholder='Buscar aluno...'
          className='border rounded px-2 py-1'
        />

        <select
          value={filters.type}
          onChange={e => setType(e.target.value)}
          className='border rounded px-2 py-1'
        >
          <option value=''>Tipo</option>
          <option value='ENEM'>ENEM</option>
          <option value='PAS'>PAS</option>
        </select>

        <button
          onClick={clearFilters}
          className='px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50'
        >
          Limpar filtros
        </button>
      </div>

      {/* Lista de redações */}
      {currentData.length === 0 ? (
        <EmptyEssaysState
          status={filters.status}
          onNewEssay={() => setNewModalOpen(true)}
        />
      ) : (
        <>
          <div className='space-y-md'>
            {currentData.map(r => {
              const isHighlightedNow = isHighlighted(r._id);
              return (
                <div
                  key={r._id}
                  className={`ys-card flex items-center justify-between ${
                    isHighlightedNow
                      ? 'ring-2 ring-green-400 ring-opacity-50 bg-green-50'
                      : ''
                  }`}
                >
                  <div className='flex items-center gap-md'>
                    <Avatar
                      src={r.student?.photoUrl}
                      name={r.student?.name}
                      className='w-12 h-12'
                    />
                    <div>
                      <p className='font-semibold'>
                        {r.student?.rollNumber
                          ? `Nº ${r.student.rollNumber}`
                          : r.student?.name}
                      </p>
                      <p className='text-sm text-black/70'>
                        {r.theme?.name || r.customTheme || '-'}
                      </p>
                      <p className='text-sm text-black/70'>
                        {r.class?.series}ª{r.class?.letter} •{' '}
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-md'>
                    <button
                      className='ys-btn-ghost'
                      onClick={() => setEditEssay(r)}
                      aria-label='Editar'
                    >
                      <FaPen />
                    </button>
                    {filters.status === 'pendentes' ? (
                      <button
                        className='ys-btn-primary'
                        onClick={() => setModalEssay(r)}
                      >
                        Corrigir
                      </button>
                    ) : (
                      <>
                        {r.sentAt ? (
                          <>
                            <span className='text-green-600' title={`Enviado em: ${new Date(r.sentAt).toLocaleString('pt-BR')}`}>
                              📧 Enviado
                            </span>
                            <button
                              className='ys-btn-ghost'
                              onClick={() => handleSendEmail(r._id)}
                              title={`Reenviar e-mail (enviado em: ${new Date(r.sentAt).toLocaleString('pt-BR')})`}
                            >
                              Reenviar
                            </button>
                          </>
                        ) : (
                          <button
                            className={`ys-btn-ghost ${
                              r.status === 'GRADED' 
                                ? '' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                            onClick={() => handleSendEmail(r._id)}
                            disabled={r.status !== 'GRADED'}
                            title={
                              r.status !== 'GRADED' 
                                ? 'Apenas redações corrigidas podem ter o e-mail enviado'
                                : 'Enviar e-mail de correção'
                            }
                          >
                            Enviar por e-mail
                          </button>
                        )}
                        <a
                          className='ys-btn-ghost'
                          href={r.fileUrl}
                          target='_blank'
                          rel='noreferrer'
                          aria-label='Arquivo'
                        >
                          <FaFilePdf />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className='mt-6'>
              <Pagination
                currentPage={filters.page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={filters.pageSize}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                pageSizeOptions={[5, 10, 20, 50]}
                showTotal={true}
                showFirstLast={true}
                showPrevNext={true}
                showPageInput={true}
                disabled={loading}
                loading={isUrlLoading}
              />
            </div>
          )}
        </>
      )}

      {newModalOpen && (
        <NovaRedacaoModal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          onCreated={() => {
            handleReload();
            setNewModalOpen(false);
          }}
        />
      )}

      {modalEssay && (
        <div
          role='dialog'
          className='fixed inset-0 bg-black/50 flex items-center justify-center'
        >
          <div className='bg-white p-md space-y-md'>
            <p>Corrigir redação</p>
            <button
              className='ys-btn-primary'
              onClick={async () => {
                const essayType = modalEssay.type === 'ENEM' ? 'ENEM' : 'PAS';
                if (essayType === 'ENEM') {
                  await gradeEssay(modalEssay._id, {
                    essayType: 'ENEM',
                    weight: 1,
                    annul: false,
                    enemCompetencies: { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 },
                    comments: '',
                  });
                } else {
                  await gradeEssay(modalEssay._id, {
                    essayType: 'PAS',
                    weight: 1,
                    annul: false,
                    pas: { NC: 0, NL: 1 },
                    comments: '',
                  });
                }
                setModalEssay(null);
              }}
            >
              Enviar
            </button>
            <button
              className='ys-btn-ghost'
              onClick={() => setModalEssay(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {editEssay && (
        <div
          role='dialog'
          className='fixed inset-0 bg-black/50 flex items-center justify-center'
        >
          <div className='bg-white p-md space-y-md w-full max-w-md'>
            <p className='font-semibold'>Editar redação</p>
            <div>
              <label className='block text-sm font-medium'>Aluno</label>
              <input
                value={editStudentQuery}
                onChange={e => setEditStudentQuery(e.target.value)}
                placeholder='Buscar aluno...'
                className='w-full border rounded px-2 py-1 mb-1'
              />
              <div className='max-h-40 overflow-auto border rounded'>
                {editStudentOptions.map(s => (
                  <button
                    type='button'
                    key={s._id || s.id}
                    className={`w-full text-left px-2 py-1 hover:bg-[#F3F4F6] ${
                      editStudent &&
                      (editStudent._id || editStudent.id) === (s._id || s.id)
                        ? 'bg-[#FEF3C7]'
                        : ''
                    }`}
                    onClick={() => setEditStudent(s)}
                  >
                    {s.name}
                  </button>
                ))}
                {editStudentOptions.length === 0 && (
                  <div className='p-2 text-sm text-ys-ink-2'>
                    Digite para buscar alunos…
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium'>Tema</label>
              <ThemeCombo
                allowCreate
                value={editTheme}
                onChange={setEditTheme}
              />
            </div>
            <select
              value={editBimester}
              onChange={e => setEditBimester(e.target.value)}
              className='w-full border rounded px-2 py-1'
            >
              <option value=''>Bimestre</option>
              <option value='1'>1º</option>
              <option value='2'>2º</option>
              <option value='3'>3º</option>
              <option value='4'>4º</option>
            </select>
            <select
              value={editType}
              onChange={e => setEditType(e.target.value as any)}
              className='w-full border rounded px-2 py-1'
            >
              <option value='ENEM'>ENEM</option>
              <option value='PAS'>PAS</option>
            </select>
            <input
              type='file'
              accept='application/pdf'
              onChange={e => setEditFile(e.target.files?.[0] || null)}
            />
            <div className='flex justify-end gap-md'>
              <button
                className='ys-btn-primary'
                onClick={handleUpdateEssay}
                disabled={saving}
              >
                Salvar
              </button>
              <button
                className='ys-btn-ghost'
                onClick={() => setEditEssay(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardRedacoes;
