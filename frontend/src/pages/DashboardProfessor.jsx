import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import SendEmailModal from '@/components/SendEmailModal'
import QuickContentModal from '@/components/QuickContentModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import { listMyClasses, mergeCalendars, getClassDetails } from '@/services/classes.service'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/Button'
import DashboardCard from '@/components/dashboard/DashboardCard'
import MediaGeralBimestre from '@/components/dashboard/MediaGeralBimestre'
import ResumoConteudosCard from '@/components/dashboard/ResumoConteudosCard'
import WeeklySchedule from '@/components/dashboard/WeeklySchedule'
import AvisosCard from '@/components/dashboard/AvisosCard'
import DivisaoNotasCard from '@/components/dashboard/DivisaoNotasCard'
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
  const { logout: logoutSession } = useAuth()

  const classSummariesRef = useRef(classSummaries)
  const classDetailsRef = useRef(classDetails)

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
          return entries
            .map((entry) => {
              if (!entry || typeof entry !== 'object') return null
              return {
                ...entry,
                classId: cls.id,
                label: classNameMap[cls.id],
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

  const handleLogout = async () => {
    await logoutSession()
  }

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

    const addEntry = (key, classId, label) => {
      if (!label) return
      if (!cells[key]) cells[key] = []
      const exists = cells[key].some((item) =>
        classId ? item.classId === classId : item.label === label
      )
      if (!exists) {
        cells[key].push({ classId: classId || null, label })
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
        const labelFromMap = entry?.classId ? classNameMap[entry.classId] : undefined
        const label = labelFromMap || entry?.label || entry?.className || entry?.discipline || '—'
        const entryClassId = entry?.classId ? String(entry.classId) : null
        addEntry(key, entryClassId, label)
      })
    })

    Object.entries(classDetails).forEach(([classId, detail]) => {
      if (!detail?.schedule) return
      const entries = Array.isArray(detail.schedule) ? detail.schedule : []
      entries.forEach((item) => {
        const slot = Number(item?.slot)
        if (!SLOT_CONFIG.some((s) => s.id === slot)) return
        const dayIndex = Number(item?.weekday)
        if (!dayIndex) return
        const key = `${slot}-${dayIndex}`
        const label = classNameMap[classId]
        if (!label) return
        addEntry(key, classId, label)
      })
    })

    return cells
  }, [schedule, classDetails, classNameMap])

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

  if(!user) return <div className="page-safe pt-20"><p>Carregando...</p></div>

  return (
    <div className="page-safe pt-4 space-y-6">
      <section className="hero-compact rounded-3xl bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-xl">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={user.name}
                  className="h-14 w-14 rounded-2xl border border-white/50 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/50 bg-white/20 text-xl font-semibold uppercase">
                  {user?.name ? user.name.slice(0, 1) : '?'}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-white/80">Bem-vindo de volta</p>
                <h1 className="text-xl font-semibold md:text-2xl">{user?.name || 'Professor'}</h1>
                <p className="text-white/80 text-sm">Painel do professor</p>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 lg:items-end">
              <div className="flex flex-wrap items-stretch justify-end gap-3">
                <Button
                  type="button"
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus-visible:ring-white/60"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
                <div className="flex gap-3">
                  <div className="mini-stat-card">
                    <p className="mini-stat-label">Turmas</p>
                    <p className="mini-stat-value">{totalClasses}</p>
                  </div>
                  <div className="mini-stat-card">
                    <p className="mini-stat-label">Total de alunos</p>
                    <p className="mini-stat-value">{uniqueStudentsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="cta-row flex flex-wrap">
            <Button className="btn-primary" onClick={() => setShowEmail(true)}>
              Enviar e-mail
            </Button>
            <Button
              className="btn-primary"
              onClick={() => {
                setAnnouncementDraft(null)
                setAnnouncementOpen(true)
              }}
            >
              Novo aviso
            </Button>
            <Button className="btn-primary" onClick={() => setContentOpen(true)}>
              Atividades
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <DashboardCard
          title="Horário Semanal"
          className="lg:col-span-8"
          contentClassName="flex-1"
        >
          <WeeklySchedule slots={SLOT_CONFIG} days={WEEKDAY_CONFIG} cells={scheduleMatrix} />
        </DashboardCard>

        <AvisosCard
          className="lg:col-span-4"
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

      <div className="grid gap-6 lg:grid-cols-12">
        <DashboardCard
          title="Agenda"
          className="lg:col-span-6"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    calendarScope === 'week' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => setCalendarScope('week')}
                >
                  Semana
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    calendarScope === 'month' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => setCalendarScope('month')}
                >
                  Mês
                </button>
              </div>
            </div>
          }
          contentClassName="flex-1 flex-col"
        >
          {insightsLoading ? (
            <div className="flex-1 rounded-xl bg-slate-100 animate-pulse" />
          ) : displayedAgendaGroups.length ? (
            <div className="card-scroll flex-1 space-y-4">
              {displayedAgendaGroups.map((group) => (
                <div key={group.iso} className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{formatAgendaHeader(group.date)}</p>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((event) => (
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

        <DashboardCard
          title="Atividades"
          className="lg:col-span-3"
          contentClassName="flex-1"
        >
          <ResumoConteudosCard embedded limit={5} className="h-full" />
        </DashboardCard>

        <DivisaoNotasCard
          classOptions={classOptions}
          className="lg:col-span-3"
        />
      </div>

      <MediaGeralBimestre classOptions={classOptions} />
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
