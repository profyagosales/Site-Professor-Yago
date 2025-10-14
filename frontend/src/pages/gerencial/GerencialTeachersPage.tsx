import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  createGerencialTeacher,
  deleteGerencialTeacher,
  listGerencialTeachers,
  updateGerencialTeacher,
  type GerencialTeacher,
} from '@/services/gerencial.service';
import { TeacherFormModal, TeacherFormValues } from './TeacherFormModal';

export default function GerencialTeachersPage() {
  const [teachers, setTeachers] = useState<GerencialTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [selected, setSelected] = useState<GerencialTeacher | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const didMountRef = useRef(false);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const fetchTeachers = useCallback(
    async (term: string, { spinner = false }: { spinner?: boolean } = {}) => {
      const trimmed = term.trim();
      setStatus(null);
      if (spinner) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      try {
        const data = await listGerencialTeachers(trimmed);
        setTeachers(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao listar professores.';
        setStatus({ type: 'error', message });
      } finally {
        if (spinner) {
          setLoading(false);
        } else {
          setSearching(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchTeachers('', { spinner: true });
  }, [fetchTeachers]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      fetchTeachers(normalizedQuery, { spinner: false });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [normalizedQuery, fetchTeachers]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelected(null);
    setModalOpen(true);
  };

  const openEditModal = (teacher: GerencialTeacher) => {
    setSelected(teacher);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleModalSubmit = async (values: TeacherFormValues) => {
    setModalLoading(true);
    try {
      if (modalMode === 'create') {
        await createGerencialTeacher({
          name: values.name,
          email: values.email,
          password: values.password ?? '',
          phone: values.phone ?? undefined,
          photo: values.photo ?? null,
        });
        setStatus({ type: 'success', message: 'Professor cadastrado com sucesso.' });
      } else if (selected) {
        await updateGerencialTeacher(selected.id, {
          name: values.name,
          email: values.email,
          password: values.password || undefined,
          phone: values.phone ?? null,
          photo: values.photo ?? null,
          removePhoto: values.removePhoto,
        });
        setStatus({ type: 'success', message: 'Dados do professor atualizados.' });
      }
      await fetchTeachers(normalizedQuery, { spinner: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar o professor.';
      setStatus({ type: 'error', message });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (teacher: GerencialTeacher) => {
    const confirmed = window.confirm(`Remover ${teacher.name}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    setDeletingId(teacher.id);
    try {
      await deleteGerencialTeacher(teacher.id);
      setStatus({ type: 'success', message: 'Professor removido.' });
      await fetchTeachers(normalizedQuery, { spinner: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao remover professor.';
      setStatus({ type: 'error', message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelected(null);
    setModalLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ys-ink">Professores cadastrados</h2>
          <p className="text-sm text-ys-graphite">Crie, atualize ou remova contas de docentes.</p>
        </div>
        <Button onClick={openCreateModal}>Adicionar professor</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={handleSearchChange}
            placeholder="Buscar por nome ou e-mail"
            className="w-72 rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ys-graphite">Buscando…</span>
          )}
        </div>
        <Button variant="ghost" onClick={() => fetchTeachers(normalizedQuery, { spinner: false })}>
          Atualizar
        </Button>
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success' ? 'border-ys-line bg-white text-ys-ink' : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {status.message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ys-graphite">Carregando lista de professores…</p>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-ys-graphite">Nenhum professor encontrado.</p>
      ) : (
        <div className="grid gap-3">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
              <div className="flex flex-wrap items-center gap-4">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={teacher.name}
                    className="h-14 w-14 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ys-bg text-base font-semibold text-ys-ink">
                    {teacher.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                )}
                <div className="min-w-[200px] flex-1">
                  <div className="text-lg font-semibold text-ys-ink">{teacher.name}</div>
                  <div className="text-sm text-ys-graphite">{teacher.email}</div>
                  {teacher.phone && <div className="text-sm text-ys-graphite">Telefone: {teacher.phone}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => openEditModal(teacher)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(teacher)}
                    disabled={deletingId === teacher.id}
                    className="text-red-500 hover:text-red-600"
                  >
                    {deletingId === teacher.id ? 'Removendo…' : 'Excluir'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeacherFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={selected}
        loading={modalLoading}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
