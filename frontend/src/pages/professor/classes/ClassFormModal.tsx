import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TeacherSearchInput } from '@/components/TeacherSearchInput';
import type { TeacherLite } from '@/types/school';

export type ClassFormValues = {
  name: string;
  subject: string;
  year?: number;
  responsibleTeacherId?: string | null;
};

export type ClassFormInitialValues = ClassFormValues & {
  responsibleTeacher?: TeacherLite | null;
  responsibleTeacherName?: string;
  responsibleTeacherEmail?: string;
  responsibleTeacherPhone?: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: ClassFormInitialValues | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void> | void;
};

const initialState: ClassFormValues = {
  name: '',
  subject: '',
  year: undefined,
  responsibleTeacherId: undefined,
};

export function ClassFormModal({ open, mode, initialValues, loading = false, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<ClassFormValues>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherLite | null>(null);

  useEffect(() => {
    if (!open) return;
    const responsible = initialValues?.responsibleTeacher ?? null;
    const responsibleFromId = !responsible && initialValues?.responsibleTeacherId
      ? {
          id: initialValues.responsibleTeacherId,
          name: initialValues?.responsibleTeacherName || '',
          email: initialValues?.responsibleTeacherEmail || '',
          phone: initialValues?.responsibleTeacherPhone,
        }
      : null;
    const resolvedTeacher = responsible || responsibleFromId;
    setSelectedTeacher(resolvedTeacher as TeacherLite | null);
    setValues({
      name: initialValues?.name ?? '',
      subject: initialValues?.subject ?? '',
      year: initialValues?.year ?? undefined,
      responsibleTeacherId: resolvedTeacher?.id,
    });
    setError(null);
  }, [open, initialValues]);

  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      responsibleTeacherId: selectedTeacher?.id ?? undefined,
    }));
  }, [selectedTeacher]);

  if (!open) return null;

  const modeLabel = mode === 'create' ? 'Adicionar turma' : 'Editar turma';

  const handleChange = (field: keyof ClassFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: field === 'year' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = values.name.trim();
    const subject = values.subject.trim();
    if (!name) {
      setError('Informe o nome da turma.');
      return;
    }
    if (!subject) {
      setError('Informe a disciplina da turma.');
      return;
    }
    if (values.year !== undefined && Number.isNaN(values.year)) {
      setError('Ano inválido.');
      return;
    }

    try {
      await onSubmit({
        name,
        subject,
        year: values.year === undefined ? undefined : values.year,
        responsibleTeacherId: values.responsibleTeacherId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a turma.';
      setError(message);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-ys-lg">
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ys-ink">{modeLabel}</h2>
            <button
              type="button"
              className="text-sm text-ys-graphite hover:text-ys-ink"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Nome da turma</span>
            <input
              type="text"
              value={values.name}
              onChange={(event) => handleChange('name', event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="2A"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Disciplina</span>
            <input
              type="text"
              value={values.subject}
              onChange={(event) => handleChange('subject', event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="Português"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Ano/Série (opcional)</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={values.year ?? ''}
              onChange={(event) => handleChange('year', event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="2025"
            />
          </label>

          <TeacherSearchInput
            value={selectedTeacher}
            onSelect={setSelectedTeacher}
            disabled={loading}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : mode === 'create' ? 'Adicionar' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
