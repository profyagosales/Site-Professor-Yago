import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  fetchThemes,
  createThemeApi,
  updateThemeApi,
  deleteThemeApi,
  type EssayTheme,
} from '@/services/essays.service';
import { toast } from 'react-toastify';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ThemesManager({ open, onClose }: Props) {
  const [type, setType] = useState<'ENEM' | 'PAS'>('PAS');
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await fetchThemes({ type, active: 'all' });
        if (cancelled) return;
        setThemes(list);
      } catch (err) {
        console.error('[themes-manager] fetch error', err);
        if (!cancelled) {
          setError('Não foi possível carregar os temas.');
          setThemes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, type]);

  const sortedThemes = useMemo(() => {
    return [...themes].sort((a, b) => a.title.localeCompare(b.title));
  }, [themes]);

  async function handleCreate() {
    if (!title.trim()) {
      setError('Informe o título do tema.');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      await createThemeApi({
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        file,
      });
      toast.success('Tema criado.');
      setTitle('');
      setDescription('');
      setFile(null);
      setFileInputKey((key) => key + 1);
      const list = await fetchThemes({ type, active: 'all' });
      setThemes(list);
    } catch (err: any) {
      console.error('[themes-manager] create error', err);
      const message = err?.response?.data?.message || err?.message || 'Erro ao criar tema';
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(theme: EssayTheme) {
    try {
      await updateThemeApi(theme.id, { active: !theme.active });
      const list = await fetchThemes({ type, active: 'all' });
      setThemes(list);
    } catch (err: any) {
      console.error('[themes-manager] toggle error', err);
      const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar tema';
      toast.error(message);
    }
  }

  async function replaceFile(theme: EssayTheme, nextFile: File) {
    try {
      await updateThemeApi(theme.id, { file: nextFile });
      const list = await fetchThemes({ type, active: 'all' });
      setThemes(list);
      toast.success('Arquivo atualizado.');
    } catch (err: any) {
      console.error('[themes-manager] replace file error', err);
      const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar arquivo';
      toast.error(message);
    }
  }

  async function deleteTheme(theme: EssayTheme) {
    const confirmed = window.confirm(`Remover o tema "${theme.title}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      await deleteThemeApi(theme.id);
      const list = await fetchThemes({ type, active: 'all' });
      setThemes(list);
      toast.success('Tema removido.');
    } catch (err: any) {
      console.error('[themes-manager] delete error', err);
      const message = err?.response?.data?.message || err?.message || 'Erro ao remover tema';
      toast.error(message);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Temas de Redação</h3>
          <Button variant="ghost" onClick={onClose} size="sm" type="button">
            Fechar
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[#111827]">Tipo</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as 'ENEM' | 'PAS')}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="PAS">PAS</option>
              <option value="ENEM">ENEM</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#111827]">Título do tema</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Medos da modernidade"
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#111827]">Descrição / proposta</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Resumo da proposta aplicada em sala"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827]">Arquivo da proposta</label>
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-ys-ink-2">PDF, DOCX ou imagem (máx. 10 MB).</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Salvando…' : 'Adicionar tema'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="max-h-[360px] overflow-auto rounded-lg border border-[#E5E7EB]">
          {loading ? (
            <div className="p-4 text-sm text-ys-ink-2">Carregando…</div>
          ) : sortedThemes.length === 0 ? (
            <div className="p-4 text-sm text-ys-ink-2">Nenhum tema cadastrado.</div>
          ) : (
            <table className="w-full text-sm text-[#111827]">
              <thead className="bg-[#F3F4F6] text-left text-[#374151]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tema</th>
                  <th className="px-4 py-2 font-semibold">Arquivo</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {sortedThemes.map((theme) => (
                  <tr key={theme.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{theme.title}</p>
                      {theme.description && (
                        <p className="text-xs text-ys-ink-2">{theme.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {theme.promptFileUrl ? (
                        <a
                          href={theme.promptFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Ver arquivo
                        </a>
                      ) : (
                        <span className="text-xs text-ys-ink-2">—</span>
                      )}
                      <div>
                        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-ys-ink-2">
                          <input
                            type="file"
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                            onChange={(event) => {
                              const next = event.target.files?.[0];
                              if (next) replaceFile(theme, next);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-3">{theme.active ? 'Ativo' : 'Inativo'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(theme)}
                        >
                          {theme.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteTheme(theme)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
