import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  getClass,
  ClassSummary,
} from '@/services/classes.service';
import type { ClassDetail as SchoolClassDetail, TeacherLite } from '@/types/school';
import { ClassFormModal, ClassFormInitialValues, ClassFormValues } from './ClassFormModal';

interface UiClassItem {
  id: string;
  name: string;
  subject: string;
  year?: number;
  studentsCount: number;
  teachersCount: number;
  legacySeries?: number;
  legacyLetter?: string;
  legacyDiscipline?: string;
}

function deriveNameFromSummary(item: ClassSummary): string {
  if (item.name && item.name.trim()) return item.name.trim();
  if (item.series !== undefined && item.letter) return `${item.series}${item.letter}`;
  if (item.discipline && item.discipline.trim()) return item.discipline.trim();
  if (item.subject && item.subject.trim()) return item.subject.trim();
  return 'Turma';
}

function deriveSubjectFromSummary(item: ClassSummary): string {
  if (item.subject && item.subject.trim()) return item.subject.trim();
  if (item.discipline && item.discipline.trim()) return item.discipline.trim();
  return 'Disciplina';
}

function toUiClassFromSummary(item: ClassSummary): UiClassItem {
  return {
    id: item.id,
    name: deriveNameFromSummary(item),
    subject: deriveSubjectFromSummary(item),
    year: item.year,
    studentsCount: item.studentsCount,
    teachersCount: item.teachersCount,
    legacySeries: item.series,
    legacyLetter: item.letter,
    legacyDiscipline: item.discipline,
  };
}

function toUiClassFromDetail(detail: SchoolClassDetail): UiClassItem {
  const rawId = detail._id ?? (detail as { id?: string | null }).id;
  if (!rawId) {
    throw new Error('Class detail missing identifier');
  }
  const id = rawId;
  const summarySource: ClassSummary = {
    id,
    name: detail.name,
    subject: detail.subject,
    discipline: detail.subject,
    studentsCount: detail.studentsCount ?? 0,
    teachersCount: detail.teachersCount ?? (Array.isArray(detail.teachers) ? detail.teachers.length : 0),
    year: detail.year,
  };
  return {
    id,
    name: detail.name || deriveNameFromSummary(summarySource),
    subject: detail.subject || deriveSubjectFromSummary(summarySource),
    year: detail.year,
    studentsCount: detail.studentsCount ?? 0,
    teachersCount: detail.teachersCount ?? 0,
    legacySeries: undefined,
    legacyLetter: undefined,
    legacyDiscipline: detail.subject,
  };
}

export default function ClassesPage() {
  const [items, setItems] = useState<UiClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [editing, setEditing] = useState<UiClassItem | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<ClassFormInitialValues | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const container = menuRefs.current.get(menuOpenId);
      if (container && !container.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const registerMenuRef = useCallback((id: string) => {
    return (node: HTMLDivElement | null) => {
      if (!node) {
        menuRefs.current.delete(id);
      } else {
        menuRefs.current.set(id, node);
      }
    };
  }, []);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listClasses();
      setItems(response.map(toUiClassFromSummary));
    } catch (err) {
      console.error('Falha ao carregar turmas', err);
      setError('Não foi possível carregar as turmas agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const handleAddClick = () => {
    setModalMode('create');
    setEditing(null);
    setFormInitialValues(null);
    setModalOpen(true);
    setStatus(null);
  };

  const handleEditClick = async (item: UiClassItem) => {
    setMenuOpenId(null);
    setStatus(null);
    setModalMode('edit');
    setModalLoading(true);
    setEditing(item);
    setFormInitialValues(null);

    try {
      const detail = await getClass(item.id);
      const responsible = Array.isArray(detail.teachers)
        ? detail.teachers.find((teacher) => teacher.responsible)
        : undefined;

      const teacherId = responsible?.id || responsible?._id;
      const selectedTeacher: TeacherLite | undefined = teacherId
        ? {
            id: teacherId,
            _id: responsible?._id || teacherId,
            name: responsible?.name ?? '',
            email: responsible?.email ?? '',
            phone: responsible?.phone,
            photoUrl: responsible?.photoUrl,
            responsible: true,
          }
        : undefined;

      setFormInitialValues({
        name: detail.name ?? item.name,
        subject: detail.subject ?? item.subject,
        year: detail.year ?? undefined,
        responsibleTeacherId: selectedTeacher?.id,
        responsibleTeacher: selectedTeacher ?? null,
        responsibleTeacherName: selectedTeacher?.name,
        responsibleTeacherEmail: selectedTeacher?.email,
        responsibleTeacherPhone: selectedTeacher?.phone,
      });

      setModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar a turma.';
      setStatus({ type: 'error', message });
      setEditing(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteClick = async (item: UiClassItem) => {
    setMenuOpenId(null);
    const confirmed = window.confirm(`Excluir a turma ${item.name}?`);
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await deleteClass(item.id);
      setItems((prev) => prev.filter((cls) => cls.id !== item.id));
      setStatus({ type: 'success', message: 'Turma excluída com sucesso.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir turma.';
      setStatus({ type: 'error', message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSubmit = async (values: ClassFormValues) => {
    setModalLoading(true);
    try {
      const created = await createClass(values);
      const ui = toUiClassFromDetail(created);
      setItems((prev) => [ui, ...prev.filter((cls) => cls.id !== ui.id)]);
      setStatus({ type: 'success', message: 'Turma criada com sucesso.' });
    } catch (err) {
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateSubmit = async (values: ClassFormValues) => {
    if (!editing) return;
    setModalLoading(true);
    try {
      const updated = await updateClass(editing.id, values);
      const ui = toUiClassFromDetail(updated);
      setItems((prev) => prev.map((cls) => (cls.id === ui.id ? { ...cls, ...ui } : cls)));
      setStatus({ type: 'success', message: 'Turma atualizada com sucesso.' });
    } catch (err) {
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
    setModalLoading(false);
    setFormInitialValues(null);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ys-ink">Turmas</h1>
          <p className="text-gray-500">Gerencie turmas, alunos e avaliações.</p>
        </div>
        <Button onClick={handleAddClick}>Adicionar turma</Button>
      </div>

      {status && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-ys-line bg-white text-ys-ink'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {status.message}
        </div>
      )}

      {loading && <p>Carregando…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && !error && sortedItems.length === 0 && <p>Nenhuma turma encontrada.</p>}

      {!loading && !error && sortedItems.length > 0 && (
        <div className="grid gap-3">
          {sortedItems.map((item) => (
            <Link
              key={item.id}
              to={`/professor/classes/${item.id}`}
              className="block rounded-xl border border-ys-line bg-white p-4 shadow-ys-sm transition-shadow hover:shadow-ys-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-ys-ink">{item.name}</div>
                  <div className="text-sm text-ys-graphite">{item.subject}</div>
                  {item.year && (
                    <div className="text-xs text-ys-graphite">Ano letivo: {item.year}</div>
                  )}
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <div ref={registerMenuRef(item.id)} className="relative">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-ys-line text-lg text-ys-graphite hover:bg-ys-bg"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setMenuOpenId((current) => (current === item.id ? null : item.id));
                      }}
                    >
                      ⋮
                    </button>
                    {menuOpenId === item.id && (
                      <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-ys-line bg-white py-1 text-sm shadow-ys-lg">
                        <button
                          type="button"
                          className="block w-full px-4 py-2 text-left text-ys-ink hover:bg-ys-bg"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleEditClick(item);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteClick(item);
                          }}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? 'Excluindo…' : 'Excluir'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-ys-graphite">
                <span>Alunos: {item.studentsCount}</span>
                <span>Professores: {item.teachersCount}</span>
                {item.legacySeries !== undefined && item.legacyLetter && (
                  <span>
                    Série: {item.legacySeries}
                    {item.legacyLetter}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <ClassFormModal
        open={modalOpen}
        mode={modalMode}
        initialValues={formInitialValues ?? undefined}
        loading={modalLoading}
        onClose={handleModalClose}
        onSubmit={modalMode === 'create' ? handleCreateSubmit : handleUpdateSubmit}
      />
    </div>
  );
}
