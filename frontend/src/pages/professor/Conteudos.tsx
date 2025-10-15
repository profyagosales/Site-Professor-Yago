import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import type { ContentItem } from '@/types/school';
import { listContents, toggleContentStatus } from '@/services/contents';

const BIMESTERS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

function formatDateLabel(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Data não disponível';
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    console.warn('Falha ao formatar data do conteúdo', error);
    return 'Data não disponível';
  }
}

type BimesterFilter = 'all' | 1 | 2 | 3 | 4;
type StatusFilter = 'all' | 'pending' | 'done';

export default function ConteudosPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bimesterFilter, setBimesterFilter] = useState<BimesterFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listContents({
          bimester: bimesterFilter === 'all' ? undefined : bimesterFilter,
          done: statusFilter === 'all' ? undefined : statusFilter === 'done',
          limit: 100,
          sort: 'desc',
        });
        if (cancelled) return;
        setItems(response.items);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os conteúdos.';
        setError(message);
        setItems([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [bimesterFilter, statusFilter, refreshToken]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (bimesterFilter !== 'all' && item.bimester !== bimesterFilter) return false;
        if (statusFilter === 'pending' && item.done) return false;
        if (statusFilter === 'done' && !item.done) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [items, bimesterFilter, statusFilter]);

  const handleRetry = () => {
    setRefreshToken((token) => token + 1);
  };

  const handleToggle = async (content: ContentItem) => {
    try {
      const updated = await toggleContentStatus(content.id, !content.done);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar o conteúdo.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ys-ink">Conteúdos planejados</h1>
          <p className="text-sm text-ys-graphite">Acompanhe e marque o andamento dos conteúdos por turma.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Bimestre
            <select
              value={String(bimesterFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setBimesterFilter(value === 'all' ? 'all' : (Number(value) as BimesterFilter));
              }}
              className="rounded-xl border border-ys-line bg-white px-3 py-1.5 text-sm text-ys-ink shadow-sm focus:border-ys-amber focus:outline-none"
            >
              <option value="all">Todos</option>
              {BIMESTERS.map((bimester) => (
                <option key={bimester} value={bimester}>
                  {bimester}º bimestre
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-ys-line bg-white px-3 py-1.5 text-sm text-ys-ink shadow-sm focus:border-ys-amber focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="done">Concluídos</option>
            </select>
          </label>
          <Button variant="ghost" size="sm" onClick={handleRetry} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 w-full animate-pulse rounded-2xl bg-ys-bg" aria-hidden />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ys-line bg-white p-8 text-center text-sm text-ys-graphite">
          Nenhum conteúdo encontrado com os filtros selecionados.
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Conteúdo</Th>
              <Th>Turma</Th>
              <Th>Bimestre</Th>
              <Th>Data</Th>
              <Th>Status</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-ys-bg/60 transition-colors">
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium text-ys-ink">{item.title}</span>
                    {item.description ? (
                      <span className="text-xs text-ys-graphite">{item.description}</span>
                    ) : null}
                  </div>
                </Td>
                <Td>
                  <span className="text-sm text-ys-ink-2">{item.className || 'Turma'}</span>
                </Td>
                <Td>
                  <span className="rounded-full bg-ys-bg px-2 py-1 text-xs font-semibold text-ys-ink">
                    {item.bimester}º
                  </span>
                </Td>
                <Td>
                  <span>{formatDateLabel(item.date)}</span>
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                      item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {item.done ? 'Concluído' : 'Pendente'}
                  </span>
                </Td>
                <Td>
                  <Button
                    variant={item.done ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => handleToggle(item)}
                    disabled={loading}
                  >
                    {item.done ? 'Marcar como pendente' : 'Marcar como concluído'}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
