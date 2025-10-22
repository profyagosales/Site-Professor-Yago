import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, addWeeks, endOfDay, format, isToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'react-toastify'

import AgendaDayCell, { type AgendaDayItem } from './AgendaDayCell'
import { Button } from '@/components/ui/Button'
import {
  deleteAgendaItem,
  listAgenda,
  type AgendaListItem,
  type AgendaQueryParams,
} from '@/services/agenda'

type FilterOption = 'todos' | 'atividades' | 'conteudos' | 'datas'

type AgendaCardProps = {
  className?: string
  refreshToken?: number
  onOpenEditor?: (options?: { focusId?: string | null; presetDate?: string | null }) => void
  editorLoading?: boolean
}

type NormalizedAgendaItem = AgendaDayItem & {
  dayKey: string
  dateObj: Date
}

const FILTER_LABELS: Record<FilterOption, string> = {
  todos: 'Todos',
  atividades: 'Atividades',
  conteudos: 'Conteúdos',
  datas: 'Datas',
}

const FILTER_TO_QUERY: Record<FilterOption, AgendaQueryParams['tipo']> = {
  todos: 'all',
  atividades: 'atividade',
  conteudos: 'conteudo',
  datas: 'data',
}

export default function AgendaCard({
  className = '',
  refreshToken = 0,
  onOpenEditor,
  editorLoading = false,
}: AgendaCardProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [filter, setFilter] = useState<FilterOption>('todos')
  const [items, setItems] = useState<AgendaListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart],
  )

  const weekStartKey = useMemo(() => formatDateKey(currentWeekStart), [currentWeekStart])
  const weekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart])
  const weekEndKey = useMemo(() => formatDateKey(weekEnd), [weekEnd])
  const weekEndInclusive = useMemo(() => endOfDay(weekEnd), [weekEnd])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const query: AgendaQueryParams = {
      from: weekStartKey,
      to: weekEndKey,
      tipo: FILTER_TO_QUERY[filter],
    }

    listAgenda(query)
      .then((response) => {
        if (cancelled) return
        setItems(response)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[AgendaCard] Falha ao carregar agenda', error)
        toast.error('Não foi possível carregar a agenda.')
        setItems([])
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [filter, refreshToken, weekEndKey, weekStartKey])

  const normalizedItems = useMemo<NormalizedAgendaItem[]>(() => {
    return items
      .map((item) => {
        const dateObj = new Date(item.date)
        if (Number.isNaN(dateObj.getTime())) {
          return null
        }
        const dayKey = formatDateKey(dateObj)
        return {
          id: item.id,
          titulo: item.title,
          descricao: item.description ?? null,
          turma: item.className ?? null,
          data: item.date,
          tipo: mapAgendaType(item.type),
          dayKey,
          dateObj,
        } satisfies NormalizedAgendaItem
      })
      .filter((entry): entry is NormalizedAgendaItem => {
        if (!entry) return false
        return entry.dateObj >= currentWeekStart && entry.dateObj <= weekEndInclusive
      })
  }, [currentWeekStart, items, weekEndInclusive])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, AgendaDayItem[]>()
    normalizedItems.forEach((item) => {
      if (!map.has(item.dayKey)) {
        map.set(item.dayKey, [])
      }
      map.get(item.dayKey)!.push(item)
    })
    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.data !== b.data) {
          return a.data.localeCompare(b.data)
        }
        return a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' })
      })
    })
    return map
  }, [normalizedItems])

  const weekLabel = useMemo(() => {
    const startLabel = format(currentWeekStart, 'dd LLL', { locale: ptBR }).replace('.', '').toUpperCase()
    const endLabel = format(weekEnd, 'dd LLL yyyy', { locale: ptBR }).replace('.', '').toUpperCase()
    return `${startLabel} – ${endLabel}`
  }, [currentWeekStart, weekEnd])

  const containerClass = ['dash-card w-full', className].filter(Boolean).join(' ')

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, -1))
  }, [])

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1))
  }, [])

  const handleNew = useCallback(
    (date: Date) => {
      const presetDate = formatDateKey(date)
      onOpenEditor?.({ presetDate })
    },
    [onOpenEditor],
  )

  const handleEditItem = useCallback(
    (id: string) => {
      onOpenEditor?.({ focusId: id })
    },
    [onOpenEditor],
  )

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (deletingId) return
      try {
        setDeletingId(id)
        await deleteAgendaItem(id)
        setItems((prev) => prev.filter((item) => item.id !== id))
        toast.success('Item removido da agenda.')
      } catch (error) {
        console.error('[AgendaCard] Falha ao excluir item', error)
        toast.error('Não foi possível excluir o item.')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId],
  )

  const handleQuickNew = useCallback(() => {
    handleNew(currentWeekStart)
  }, [currentWeekStart, handleNew])

  const isEmpty = !loading && normalizedItems.length === 0

  return (
    <section className={containerClass} aria-label="Agenda semanal">
      <header className="dash-card__header">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="dash-card__title">Agenda</h2>
          <nav aria-label="Filtros da agenda" className="flex flex-wrap items-center gap-2">
            {(Object.keys(FILTER_LABELS) as FilterOption[]).map((option) => {
              const active = filter === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={[
                    'rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-0',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                  aria-pressed={active}
                >
                  {FILTER_LABELS[option]}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="dash-card__actions">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={handlePrevWeek}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-0"
          >
            ←
          </button>

          <span className="text-sm font-medium uppercase tracking-wide text-slate-600">{weekLabel}</span>

          <button
            type="button"
            aria-label="Próxima semana"
            onClick={handleNextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-0"
          >
            →
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenEditor?.()}
            disabled={editorLoading}
            className="hidden md:inline-flex"
          >
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleQuickNew}
            disabled={editorLoading}
          >
            + Novo
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="h-[var(--agenda-day-height)] min-w-[220px] rounded-3xl bg-slate-100/60 animate-pulse md:min-w-0"
              />
            ))}
          </div>
        ) : (
          <div className="-mx-5 flex snap-x snap-mandatory gap-[var(--agenda-gap)] overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-7 md:gap-[var(--agenda-gap)] md:overflow-visible md:px-0">
            {weekDays.map((day) => {
              const dayKey = formatDateKey(day)
              const dayItems = itemsByDay.get(dayKey) ?? []
              return (
                <div key={dayKey} className="snap-start md:snap-none">
                  <AgendaDayCell
                    date={day}
                    items={dayItems}
                    isToday={isToday(day)}
                    onNew={() => handleNew(day)}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    deletingId={deletingId}
                  />
                </div>
              )
            })}
          </div>
        )}

        {isEmpty ? (
          <p className="mt-6 text-center text-sm text-slate-500">Nenhum item cadastrado para esta semana.</p>
        ) : null}
      </div>
    </section>
  )
}

function formatDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function mapAgendaType(type: AgendaListItem['type']): AgendaDayItem['tipo'] {
  switch (type) {
    case 'ATIVIDADE':
      return 'atividade'
    case 'CONTEUDO':
      return 'conteudo'
    case 'DATA':
    default:
      return 'data'
  }
}
