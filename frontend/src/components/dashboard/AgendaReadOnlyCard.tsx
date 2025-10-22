import { useEffect, useMemo, useState, useCallback } from 'react'
import { addDays, addWeeks, endOfDay, format, isToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import AgendaDayCellReadOnly, { type AgendaDayItem } from './AgendaDayCellReadOnly'
import { listAgenda, type AgendaListItem, type AgendaQueryParams } from '@/services/agenda'

type AgendaReadOnlyCardProps = {
  className?: string
  classId?: string | null
}

type NormalizedAgendaItem = AgendaDayItem & {
  dayKey: string
  dateObj: Date
}

export default function AgendaReadOnlyCard({ className = '', classId = null }: AgendaReadOnlyCardProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [items, setItems] = useState<AgendaListItem[]>([])
  const [loading, setLoading] = useState(false)

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
      tipo: 'all',
    }

    listAgenda(query)
      .then((response) => {
        if (cancelled) return
        setItems(response)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[AgendaReadOnlyCard] Falha ao carregar agenda', error)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [weekEndKey, weekStartKey])

  const normalizedItems = useMemo<NormalizedAgendaItem[]>(() => {
    return items
      .filter((it) => (classId ? it.classId === classId : true))
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
  }, [classId, currentWeekStart, items, weekEndInclusive])

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

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, -1))
  }, [])

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1))
  }, [])

  const isEmpty = !loading && normalizedItems.length === 0

  const containerClass = [
    'w-full rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={containerClass} aria-label="Agenda semanal" aria-readonly="true">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Agenda</h2>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <div className="mt-4">
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
                  <AgendaDayCellReadOnly date={day} items={dayItems} isToday={isToday(day)} />
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

