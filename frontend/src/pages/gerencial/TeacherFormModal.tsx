import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { GerencialTeacher } from '@/services/gerencial.service';

export type TeacherFormValues = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  photo?: File | null;
  removePhoto?: boolean;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: GerencialTeacher | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: TeacherFormValues) => Promise<void> | void;
};

export function TeacherFormModal({ open, mode, initialData = null, loading = false, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? '');
    setEmail(initialData?.email ?? '');
    setPhone(initialData?.phone ?? '');
    setPassword('');
    setPhotoFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(initialData?.photoUrl ?? null);
    setRemovePhoto(false);
    setError(null);
  }, [open, initialData]);

  useEffect(() => {
    if (!photoFile) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(photoFile);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    return () => {
      if (objectUrlRef.current === url) {
        URL.revokeObjectURL(url);
        objectUrlRef.current = null;
      }
    };
  }, [photoFile]);

  useEffect(() => {
    if (photoFile) return;
    if (removePhoto) {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(initialData?.photoUrl ?? null);
    }
  }, [photoFile, removePhoto, initialData]);

  if (!open) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setRemovePhoto(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      setError('Informe o nome do professor.');
      return;
    }
    if (!trimmedEmail) {
      setError('Informe o e-mail do professor.');
      return;
    }
    if (mode === 'create' && !trimmedPassword) {
      setError('Defina uma senha inicial.');
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: trimmedPassword || undefined,
        photo: photoFile ?? undefined,
        removePhoto: removePhoto && !photoFile,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar o professor.';
      setError(message);
      return;
    }
    onClose();
  };

  const title = mode === 'create' ? 'Cadastrar professor' : 'Editar professor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-ys-lg">
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ys-ink">{title}</h2>
            <button type="button" className="text-sm text-ys-graphite hover:text-ys-ink" onClick={onClose}>
              Fechar
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Nome</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="Professor(a)"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="docente@escola.df.gov.br"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Telefone (opcional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder="(61) 9 9999-9999"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Senha {mode === 'edit' ? '(opcional)' : ''}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              placeholder={mode === 'create' ? 'Defina uma senha inicial' : 'Informe para redefinir'}
            />
            {mode === 'edit' && (
              <span className="text-xs text-ys-graphite">Deixe em branco para manter a senha atual.</span>
            )}
          </label>

          <div className="space-y-2 text-sm">
            <span className="font-medium text-ys-ink">Foto (opcional)</span>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ys-line px-3 py-2 text-sm text-ys-ink hover:border-ys-amber">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
                <span>Selecionar arquivo</span>
              </label>
              {previewUrl && (
                <div className="flex items-center gap-3">
                  <img src={previewUrl} alt="Pré-visualização" className="h-12 w-12 rounded-full object-cover" />
                  <button
                    type="button"
                    className="text-sm text-red-500 hover:text-red-600"
                    onClick={() => {
                      setPhotoFile(null);
                      setRemovePhoto(true);
                    }}
                  >
                    Remover
                  </button>
                </div>
              )}
              {!previewUrl && initialData?.photoUrl && !removePhoto && (
                <button
                  type="button"
                  className="text-sm text-red-500 hover:text-red-600"
                  onClick={() => {
                    setPhotoFile(null);
                    setRemovePhoto(true);
                  }}
                >
                  Remover foto atual
                </button>
              )}
            </div>
            <span className="text-xs text-ys-graphite">Use uma imagem quadrada para melhor proporção.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : mode === 'create' ? 'Cadastrar' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
