import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import SendEmailModal from '@/components/SendEmailModal'
import QuickContentModal from '@/components/QuickContentModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import { listMyClasses, mergeCalendars, getClassDetails } from '@/services/classes.service'
import { Button } from '@/components/ui/Button'
import DashboardCard from '@/components/dashboard/DashboardCard'
import MediaGeralBimestre from '@/components/dashboard/MediaGeralBimestre'
import AgendaCard from '@/components/dashboard/AgendaCard'
import AtividadesCard from '@/components/dashboard/AtividadesCard'
import WeeklySchedule from '@/components/dashboard/WeeklySchedule'
import AvisosCard from '@/components/dashboard/AvisosCard'
import DivisaoNotasCard from '@/components/dashboard/DivisaoNotasCard'
import DivisaoNotasModal from '@/components/dashboard/DivisaoNotasModal'
import Modal from '@/components/ui/Modal'

/*
// Snippet opcional para habilitar o widget da agenda semanal
// Basta remover este comentário e garantir VITE_FEATURE_AGENDA_WIDGET=1
// import AgendaWeekWidget from '@/components/agenda/AgendaWeekWidget';
*/

const SLOT_CONFIG = [
  { id: 1, label: '1º', time: '07:15 – 08:45' },
  { id: 2, label: '2º', time: '09:00 – 10:30' },
  { id: 3, label: '3º', time: '10:45 – 12:15' },
]

const WEEKDAY_CONFIG = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
]

// REMOVE or keep gated for future use
const SHOW_LEFT_AGENDA = false

const DAY_NAME_TO_INDEX = {
  monday: 1,
  segunda: 1,
  'segunda-feira': 1,
  tuesday: 2,
  terça: 2,
  terca: 2,
  'terça-feira': 2,
  wednesday: 3,
  quarta: 3,
  'quarta-feira': 3,
  thursday: 4,
  quinta: 4,
  'quinta-feira': 4,
  friday: 5,
  sexta: 5,
  'sexta-feira': 5,
}

function coalesceId(entry) {
  if (!entry) return ''
  if (typeof entry === 'string') return entry
  if (entry.id) return String(entry.id)
  if (entry._id) return String(entry._id)
  return ''
}

function resolveAvatarUrl(source) {
  if (!source) return null
  if (source.startsWith('data:') || source.startsWith('http') || source.startsWith('blob:')) {
    return source
  }
  return `data:image/jpeg;base64,${source}`
}

function formatClassLabel(summary = {}, detail = {}) {
  const discipline = detail.discipline || detail.subject || summary.discipline || summary.subject
  const parts = []
  if (detail.name) {
    parts.push(detail.name)
  } else if (summary.name) {
    parts.push(summary.name)
  } else {
    const series = detail.series || summary.series
    const letter = detail.letter || summary.letter
    if (series || letter) {
      const gradePart = series ? `${series}º` : ''
      const letterPart = letter ? `${letter}` : ''
      const combined = `${gradePart}${letterPart}`.trim()
      if (combined) {
        parts.push(`Turma ${combined}`)
      }
    }
  }
  if (discipline) {
    parts.push(discipline)
  }
  const fallback = summary.discipline || summary.subject || 'Turma'
  return parts.filter(Boolean).join(' • ') || fallback
}

function parseDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function isWithinRange(date, start, end) {
  if (!date) return false
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

function formatAgendaHeader(date) {
  if (!date) return ''
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
  const year = date.getFullYear()
  return `${capitalizedWeekday} • ${day} ${month} ${year}`
}

function DashboardProfessor(){
  const [user, setUser] = useState(null)
  const [classSummaries, setClassSummaries] = useState([])
  const [classDetails, setClassDetails] = useState({})
  const [calendarEvents, setCalendarEvents] = useState([])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState(null)
  const [calendarScope, setCalendarScope] = useState('week')
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [divisaoNotasOpen, setDivisaoNotasOpen] = useState(false)
  const [gradeSchemeDraft, setGradeSchemeDraft] = useState(/** @type {import('@/services/gradeScheme').GradeScheme | null} */(null))
  const [gradeSchemeRefreshKey, setGradeSchemeRefreshKey] = useState(0)
  const classSummariesRef = useRef(classSummaries)
  const classDetailsRef = useRef(classDetails)
  const teacherId = user?.id ?? ''
  const gradeSchemeYear = new Date().getFullYear()

  const handleOpenGradeScheme = useCallback((scheme) => {
    setGradeSchemeDraft(scheme)
    setDivisaoNotasOpen(true)
  }, [])

  const handleCloseGradeScheme = useCallback(() => {
    setDivisaoNotasOpen(false)
    setGradeSchemeDraft(null)
  }, [])

  useEffect(() => {
    classSummariesRef.current = classSummaries
  }, [classSummaries])

  useEffect(() => {
    classDetailsRef.current = classDetails
  }, [classDetails])

  const refreshCalendarEvents = useCallback(
    async (classListOverride, classNameMapOverride, options = {}) => {
      const sourceClasses = Array.isArray(classListOverride) && classListOverride.length
        ? classListOverride
        : Array.isArray(classSummariesRef.current) ? classSummariesRef.current : []
      if (!sourceClasses.length) {
        setCalendarEvents([])
        return
      }

      const baseNames = classNameMapOverride ?? sourceClasses.reduce((acc, cls) => {
        const key = coalesceId(cls)
        if (!key) return acc
        acc[key] = formatClassLabel(cls)
        return acc
      }, {})

      const classNames = { ...baseNames }
      const detailEntries = classDetailsRef.current && typeof classDetailsRef.current === 'object'
        ? classDetailsRef.current
        : {}
      const fallbackSummaries = Array.isArray(classSummariesRef.current) ? classSummariesRef.current : []
      Object.entries(detailEntries).forEach(([classId, detail]) => {
        const summary = sourceClasses.find((cls) => coalesceId(cls) === classId)
          || fallbackSummaries.find((cls) => coalesceId(cls) === classId)
        const label = formatClassLabel(summary, detail)
        if (label) classNames[classId] = label
      })

      try {
        const merged = await mergeCalendars(
          sourceClasses.map((cls) => coalesceId(cls)).filter(Boolean),
          { classNames }
        )
        const isAborted = typeof options?.isAborted === 'function' ? options.isAborted : () => false
        if (isAborted()) return
        setCalendarEvents(merged)
      } catch (err) {
        console.error('Erro ao consolidar a agenda das turmas', err)
        if (!options?.silenceToast) {
          toast.error('Não foi possível carregar a agenda das turmas')
        }
        if (!(typeof options?.isAborted === 'function' && options.isAborted())) {
          setCalendarEvents([])
        }
      }
    },
    []
  )

  useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const currentUser = await getCurrentUser()
        if (abort) return
        setUser(currentUser)
        if (!currentUser?.id) {
          setLoading(false)
          setInsightsLoading(false)
          return
        }

        const teacherId = currentUser.id
        let classesResponse = []
        try {
          const data = await listMyClasses({ teacherId })
          classesResponse = Array.isArray(data) ? data : []
        } catch (err) {
          console.error('Erro ao carregar turmas do professor', err)
          toast.error('Não foi possível carregar turmas')
        }
        if (abort) return

        const teacherClasses = classesResponse
          .map((cls) => ({
            ...cls,
            id: coalesceId(cls),
          }))
          .filter((cls) => cls.id)

        const classNameMap = teacherClasses.reduce((acc, cls) => {
          acc[cls.id] = formatClassLabel(cls)
          return acc
        }, {})

        const aggregatedSchedule = teacherClasses.flatMap((cls) => {
          const entries = Array.isArray(cls?.schedule) ? cls.schedule : []
          const classColorValue = cls?.color || cls?.themeColor || null
          const classDiscipline = cls?.discipline || cls?.subject || null
          const className = cls?.name || null
          return entries
            .map((entry) => {
              if (!entry || typeof entry !== 'object') return null
              return {
                ...entry,
                classId: cls.id,
                label:
                  [classDiscipline, className].filter(Boolean).join(' — ') || classNameMap[cls.id],
                color: classColorValue,
                className,
                discipline: classDiscipline,
              }
            })
            .filter(Boolean)
        })

        if (abort) return
        setClassSummaries(teacherClasses)
        setSchedule(aggregatedSchedule)
        setLoading(false)
        await refreshCalendarEvents(teacherClasses, classNameMap, { isAborted: () => abort, silenceToast: true })
        if (abort) return

        if (!teacherClasses.length) {
          setClassDetails({})
          setInsightsLoading(false)
          return
        }

        setInsightsLoading(true)
        const detailResults = await Promise.all(
          teacherClasses.map(async (cls) => {
            if (abort) return null
            try {
              const detail = await getClassDetails(cls.id)
              return detail ? { classId: cls.id, detail } : null
            } catch (err) {
              console.error('Erro ao carregar detalhes da turma', cls.id, err)
              return null
            }
          })
        )
        if (abort) return

        const detailsMap = {}
        detailResults.forEach((entry) => {
          if (entry && entry.classId) {
            detailsMap[entry.classId] = entry.detail
          }
        })
        setClassDetails(detailsMap)

        setInsightsLoading(false)
      } catch (error) {
        if (!abort) {
          console.error(error)
          toast.error('Não foi possível carregar os dados do professor')
          setLoading(false)
          setInsightsLoading(false)
        }
      }
    })()
    return () => { abort = true }
  }, [refreshCalendarEvents])

  const reloadContents = useCallback(async () => {
    await refreshCalendarEvents()
  }, [refreshCalendarEvents])

  const reloadAnnouncements = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('announcements:refresh'))
    }
  }, [])

  const classNameMap = useMemo(() => {
    const map = {}
    classSummaries.forEach((summary) => {
      const id = coalesceId(summary)
      if (!id) return
      map[id] = formatClassLabel(summary)
    })
    Object.entries(classDetails).forEach(([id, detail]) => {
      map[id] = formatClassLabel(classSummaries.find((cls) => cls.id === id), detail)
    })
    return map
  }, [classSummaries, classDetails])

  const classSummaryMap = useMemo(() => {
    const map = {}
    classSummaries.forEach((summary) => {
      const id = coalesceId(summary) || summary?.id
      if (!id) return
      map[id] = summary
    })
    return map
  }, [classSummaries])

  const classOptions = useMemo(
    () =>
      classSummaries
        .map((summary) => ({
          id: coalesceId(summary),
          label: formatClassLabel(summary),
        }))
        .filter((option) => option.id),
    [classSummaries]
  )

  const totalClasses = classSummaries.length

  const uniqueStudentsCount = useMemo(() => {
    const ids = new Set()
    Object.entries(classDetails).forEach(([classId, detail]) => {
      if (!detail || !Array.isArray(detail.students)) return
      detail.students.forEach((student) => {
        const studentId = coalesceId(student) || student.email || `${classId}-${student.name}`
        if (studentId) ids.add(studentId)
      })
    })
    return ids.size
  }, [classDetails])

  const scheduleMatrix = useMemo(() => {
    const cells = {}
    const toDayIndex = (value) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'number') {
        if (value >= 1 && value <= 5) return value
        return null
      }
      const normalized = String(value).toLowerCase()
      return DAY_NAME_TO_INDEX[normalized] || null
    }

    const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])

    const addEntry = (key, payload) => {
      if (!payload?.label) return
      if (!cells[key]) cells[key] = []
      const exists = cells[key].some((item) =>
        payload.classId ? item.classId === payload.classId : item.label === payload.label
      )
      if (!exists) {
        cells[key].push(payload)
      }
    }

    schedule.forEach((entry) => {
      const slot = Number(entry?.slot ?? entry?.lesson ?? entry?.timeSlot)
      if (!SLOT_CONFIG.some((s) => s.id === slot)) return
      const rawDay = entry?.day ?? entry?.weekday ?? entry?.weekDay
      const days = ensureArray(entry?.days ?? entry?.weekdays ?? entry?.weekDays)
      const targets = days.length ? days : [rawDay]
      targets.forEach((dayValue) => {
        const dayIndex = toDayIndex(dayValue)
        if (!dayIndex) return
        const key = `${slot}-${dayIndex}`
        const entryClassId = entry?.classId ? String(entry.classId) : null
        const detail = entryClassId ? classDetails[entryClassId] : null
        const summary = entryClassId ? classSummaryMap[entryClassId] : null
        const discipline =
          detail?.discipline ||
          detail?.subject ||
          entry?.discipline ||
          entry?.subject ||
          summary?.discipline ||
          summary?.subject ||
          null
        const classLabel =
          detail?.name ||
          summary?.name ||
          entry?.className ||
          (summary?.series || summary?.letter
            ? `Turma ${(summary?.series || '')}${summary?.letter || ''}`.trim()
            : null)
        const labelFromMap = entryClassId ? classNameMap[entryClassId] : undefined
        const composedLabel = [discipline, classLabel].filter(Boolean).join(' — ')
        const label = composedLabel || labelFromMap || entry?.label || '—'
        const colorCandidate =
          entry?.color ||
          detail?.color ||
          detail?.themeColor ||
          summary?.color ||
          summary?.themeColor ||
          null
        addEntry(key, {
          classId: entryClassId,
          label,
          color: colorCandidate,
          className: classLabel,
          discipline,
        })
      })
    })

    Object.entries(classDetails).forEach(([classId, detail]) => {
      if (!detail?.schedule) return
      const entries = Array.isArray(detail.schedule) ? detail.schedule : []
      const summary = classSummaryMap[classId]
      const detailDiscipline = detail?.discipline || detail?.subject || summary?.discipline || summary?.subject || null
      const detailClassName =
        detail?.name ||
        summary?.name ||
        (summary?.series || summary?.letter
          ? `Turma ${(summary?.series || '')}${summary?.letter || ''}`.trim()
          : null)
      const combinedLabel = [detailDiscipline, detailClassName].filter(Boolean).join(' — ')
      const labelFromMap = classNameMap[classId]
      const paletteLabel = combinedLabel || labelFromMap || '—'
      const colorCandidate =
        detail?.color ||
        detail?.themeColor ||
        summary?.color ||
        summary?.themeColor ||
        null
      entries.forEach((item) => {
        const slot = Number(item?.slot)
        if (!SLOT_CONFIG.some((s) => s.id === slot)) return
        const dayIndex = Number(item?.weekday)
        if (!dayIndex) return
        const key = `${slot}-${dayIndex}`
        if (!paletteLabel) return
        addEntry(key, {
          classId,
          label: paletteLabel,
          color: colorCandidate,
          className: detailClassName,
          discipline: detailDiscipline,
        })
      })
    })

    return cells
  }, [schedule, classDetails, classNameMap, classSummaryMap])

  const aggregatedEvents = useMemo(() => {
    if (!calendarEvents.length) return []

    const events = []
    calendarEvents.forEach((event) => {
      const when = event?.date instanceof Date ? event.date : parseDate(event?.dateISO)
      if (!when) return
      const label = event.className || classNameMap[event.classId] || 'Turma'
      const title = event.title || (event.type === 'ATIVIDADE' ? 'Atividade' : 'Data importante')
      events.push({
        id: event.id,
        date: when,
        classId: event.classId,
        label,
        title,
        type: event.type,
      })
    })

    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [calendarEvents, classNameMap])

  const filteredEvents = useMemo(() => {
    if (!aggregatedEvents.length) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureEvents = aggregatedEvents.filter((event) => event.date.getTime() >= today.getTime())

    if (calendarScope === 'month') {
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()
      return futureEvents.filter((event) =>
        event.date.getMonth() === currentMonth && event.date.getFullYear() === currentYear
      )
    }

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)
    return futureEvents.filter((event) => event.date.getTime() <= endOfWeek.getTime())
  }, [aggregatedEvents, calendarScope])

  const eventsByDay = useMemo(() => {
    const groups = new Map()
    filteredEvents.forEach((event) => {
      const key = event.date.toISOString().slice(0, 10)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(event)
    })

    return Array.from(groups.entries())
      .map(([iso, items]) => ({
        iso,
        date: parseDate(iso),
        items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
  }, [filteredEvents])

  const resolvedAvatar = resolveAvatarUrl(user?.photoUrl || user?.photo || user?.avatarUrl)

  const displayedAgendaGroups = useMemo(() => eventsByDay.slice(0, 5), [eventsByDay])
  const hasMoreAgenda = eventsByDay.length > 5

  const agendaSections = useMemo(() => {
    const sections = []
    const labelIndexMap = new Map()
    const toTimestamp = (entry) => {
      if (!entry || !entry.date) return 0
      const value = entry.date instanceof Date ? entry.date : new Date(entry.date)
      return Number.isNaN(value.getTime()) ? 0 : value.getTime()
    }

    displayedAgendaGroups.forEach((group) => {
      const label = formatAgendaHeader(group.date)
      if (!label) return

      if (labelIndexMap.has(label)) {
        const sectionIndex = labelIndexMap.get(label)
        const existing = sections[sectionIndex]
        existing.events = existing.events
          .concat(group.items)
          .sort((a, b) => toTimestamp(a) - toTimestamp(b))
      } else {
        labelIndexMap.set(label, sections.length)
        sections.push({
          key: group.iso || `${label}-${sections.length}`,
          label,
          events: [...group.items].sort((a, b) => toTimestamp(a) - toTimestamp(b)),
        })
      }
    })

    return sections
  }, [displayedAgendaGroups])

  if(!user) return <div className="page-safe pt-20"><p>Carregando...</p></div>

  return (
    <div className="page-safe pt-4 space-y-6">
      <section className="hero">
        <div className="hero-left">
          {resolvedAvatar ? (
            <img
              src={resolvedAvatar}
              alt={user.name}
              className="h-20 w-20 rounded-2xl border border-white/50 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/50 bg-white/20 text-3xl font-semibold uppercase">
              {user?.name ? user.name.slice(0, 1) : '?'}
            </div>
          )}
          <div className="hero-left-text">
            <small className="hero-welcome">Bem-vindo de volta</small>
            <h2 className="hero-name">{user?.name || 'Professor'}</h2>
          </div>
        </div>

        <div className="hero-center">
          <h1 className="hero-title">Painel do Professor</h1>
          <div className="hero-ctas">
            <Button className="cta-compact" onClick={() => setShowEmail(true)}>
              Enviar e-mail
            </Button>
            <Button
              className="cta-compact"
              onClick={() => {
                setAnnouncementDraft(null)
                setAnnouncementOpen(true)
              }}
            >
              Novo aviso
            </Button>
            <Button className="cta-compact" onClick={() => setContentOpen(true)}>
              Atividades
            </Button>
          </div>
        </div>

        <div className="hero-stats" aria-label="Resumo de turmas e alunos">
          <div className="hero-stat">
            <span className="hero-stat__label">Turmas</span>
            <span className="hero-stat__value">{totalClasses}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Total de alunos</span>
            <span className="hero-stat__value">{uniqueStudentsCount}</span>
          </div>
        </div>
      </section>

      <section className="dash-grid">
        <div className="tile schedule">
          <DashboardCard
            title="Horário Semanal"
            className="schedule-card"
            contentClassName="schedule-card-body"
          >
            <WeeklySchedule slots={SLOT_CONFIG} days={WEEKDAY_CONFIG} cells={scheduleMatrix} />
          </DashboardCard>
        </div>

        <div className="tile notices">
          <AvisosCard
            onEdit={(announcement) => {
              setAnnouncementDraft(announcement)
              setAnnouncementOpen(true)
            }}
            onCreate={() => {
              setAnnouncementDraft(null)
              setAnnouncementOpen(true)
            }}
          />
        </div>

        <div className="tile grades">
          <DivisaoNotasCard
            ano={gradeSchemeYear}
            onEdit={handleOpenGradeScheme}
            refreshToken={gradeSchemeRefreshKey}
          />
        </div>

        {SHOW_LEFT_AGENDA && (
          <div className="tile agenda-panel">
            <DashboardCard
              title="Agenda"
              className="h-full min-h-[24rem]"
              action={
                <div className="flex items-center gap-2">
                  <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] ${
                        calendarScope === 'week' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'
                      }`}
                      aria-pressed={calendarScope === 'week'}
                      onClick={() => setCalendarScope('week')}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] ${
                        calendarScope === 'month' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'
                      }`}
                      aria-pressed={calendarScope === 'month'}
                      onClick={() => setCalendarScope('month')}
                    >
                      Mês
                    </button>
                  </div>
                </div>
              }
              contentClassName="overflow-hidden"
            >
              {insightsLoading ? (
                <div className="flex-1 animate-pulse rounded-2xl bg-slate-100" />
              ) : agendaSections.length ? (
                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {agendaSections.map((section) => (
                    <div key={section.key} className="rounded-2xl border border-slate-100 p-4">
                      <header className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                        <span className="text-xs uppercase tracking-wide text-slate-400">
                          {section.events.length} evento{section.events.length !== 1 ? 's' : ''}
                        </span>
                      </header>
                      <ul className="mt-3 space-y-2">
                        {section.events.map((event) => (
                          <li
                            key={event.id}
                            className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                          >
                            <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                              {event.label && <p className="text-xs text-slate-500">{event.label}</p>}
                            </div>
                            <span className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                              {event.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum evento para este período.</p>
              )}
              {!insightsLoading && hasMoreAgenda && (
                <div className="mt-4 flex justify-end">
                  <Button variant="link" onClick={() => setShowAgendaModal(true)}>
                    Ver todos
                  </Button>
                </div>
              )}
            </DashboardCard>
          </div>
        )}

        <div className="tile atividades-panel">
          <div className="grid h-full grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-6 flex flex-col">
              <AgendaCard className="min-h-[24rem] flex-1" contentClassName="overflow-hidden" limit={5} />
            </div>
            <div className="col-span-12 xl:col-span-6 flex flex-col">
              <AtividadesCard className="min-h-[24rem] flex-1" limit={5} />
            </div>
          </div>
        </div>

        <div className="tile charts">
          <MediaGeralBimestre classOptions={classOptions} />
        </div>
      </section>
      {SHOW_LEFT_AGENDA && (
        <Modal open={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
          <div className="w-full max-w-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title text-slate-900">Agenda completa</h2>
              <Button variant="ghost" onClick={() => setShowAgendaModal(false)}>
                Fechar
              </Button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {eventsByDay.length ? (
                eventsByDay.map((group) => (
                  <div key={group.iso} className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-900">{formatAgendaHeader(group.date)}</p>
                    <ul className="mt-3 space-y-2">
                      {group.items.map((event) => (
                        <li key={event.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                            {event.label && <p className="text-xs text-slate-500">{event.label}</p>}
                          </div>
                          <span className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                            {event.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Nenhum evento disponível.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      <DivisaoNotasModal
        ano={gradeSchemeYear}
        initial={gradeSchemeDraft}
        isOpen={divisaoNotasOpen}
        onClose={handleCloseGradeScheme}
        onSaved={() => {
          setGradeSchemeRefreshKey((prev) => prev + 1)
        }}
      />
      <SendEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />
      <QuickContentModal open={contentOpen} onClose={() => setContentOpen(false)} onSaved={reloadContents} />
      <AnnouncementModal
        open={announcementOpen}
        onClose={() => {
          setAnnouncementOpen(false)
          setAnnouncementDraft(null)
        }}
        onSaved={reloadAnnouncements}
        initialAnnouncement={announcementDraft}
      />

      {/*
      <AgendaWeekWidget
        scope="teacher"
        entityId={user?.id || user?._id}
        days={7}
      />
      */}
    </div>
  )
}

export default DashboardProfessor
