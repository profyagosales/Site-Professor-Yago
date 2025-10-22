import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type AgendaDayItemType = 'atividade' | 'conteudo' | 'data'

export type AgendaDayItem = {
  id: string
  tipo: AgendaDayItemType
  titulo: string
  descricao: string | null
  turma: string | null
  data: string
}

type AgendaDayCellReadOnlyProps = {
  date: Date
  items: AgendaDayItem[]
  isToday?: boolean
}

export default function AgendaDayCellReadOnly({ date, items, isToday = false }: AgendaDayCellReadOnlyProps) {
  const displayItems = items.slice(0, 3)
  const extraCount = Math.max(0, items.length - displayItems.length)
  const weekdayLabel = format(date, 'EEE', { locale: ptBR }).toUpperCase()
  const dayNumber = format(date, 'dd', { locale: ptBR })

  return (
    <div
      className={[
        'flex h-[var(--agenda-day-height)] min-w-[220px] flex-col rounded-3xl border bg-white p-3 shadow-sm transition-all',
        'md:min-w-0',
        isToday ? 'border-transparent outline outline-[var(--agenda-today-ring)] outline-offset-0' : 'border-slate-200',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{weekdayLabel}</span>
        <span
          className={[
            'flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums',
            isToday ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700',
          ].join(' ')}
        >
          {dayNumber}
        </span>
      </header>

      <div className="space-y-1.5 overflow-hidden">
        {displayItems.map((item) => (
          <AgendaItemChip key={item.id} item={item} />
        ))}

        {extraCount > 0 ? (
          <div className="text-[12px] font-medium text-slate-500">+{extraCount} itens</div>
        ) : null}
      </div>
    </div>
  )
}

type AgendaItemChipProps = {
  item: AgendaDayItem
}

function AgendaItemChip({ item }: AgendaItemChipProps) {
  const formattedTime = formatPopoverDate(item.data)

  return (
    <Popover.Root>
      <Popover.Trigger
        className="group w-full truncate rounded-lg px-2 py-1 text-left text-[12px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-0"
        style={{ backgroundColor: getTypeColor(item.tipo) }}
      >
        <span className="inline-flex w-full items-center gap-1">
          <span aria-hidden>•</span>
          <span className="truncate">{item.titulo}</span>
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-[var(--z-pop)] w-[260px] rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg focus:outline-none"
          aria-readonly="true"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{mapTypeLabel(item.tipo)}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{item.titulo}</p>
              </div>
              <span
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-semibold text-white"
                style={{ backgroundColor: getTypeColor(item.tipo) }}
              >
                {formatChipDay(item.data)}
              </span>
            </div>

            {item.turma ? (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Turma:</span> {item.turma}
              </p>
            ) : null}

            {formattedTime ? <p className="text-xs text-slate-500">{formattedTime}</p> : null}

            {item.descricao ? (
              <p className="text-xs leading-relaxed text-slate-600">{item.descricao}</p>
            ) : null}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function getTypeColor(tipo: AgendaDayItemType) {
  switch (tipo) {
    case 'atividade':
      return 'var(--agenda-type-atividade)'
    case 'conteudo':
      return 'var(--agenda-type-conteudo)'
    case 'data':
    default:
      return 'var(--agenda-type-data)'
  }
}

function mapTypeLabel(tipo: AgendaDayItemType) {
  switch (tipo) {
    case 'atividade':
      return 'Atividade'
    case 'conteudo':
      return 'Conteúdo'
    case 'data':
    default:
      return 'Data'
  }
}

function formatChipDay(value: string) {
  try {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    return format(parsed, 'dd', { locale: ptBR })
  } catch {
    return ''
  }
}

function formatPopoverDate(value: string) {
  try {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    return format(parsed, "EEEE • dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
  } catch {
    return ''
  }
}

