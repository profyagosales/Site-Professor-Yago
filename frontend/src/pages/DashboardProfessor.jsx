import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import SendEmailModal from '@/components/SendEmailModal'
import QuickContentModal from '@/components/QuickContentModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import { listMyClasses, mergeCalendars, getClassDetails, getClassGrades } from '@/services/classes.service'
import { useAuth } from '@/store/AuthContext'

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

const DATE_BADGE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
})

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
})

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

function DashboardProfessor(){
  const [user, setUser] = useState(null)
  const [classSummaries, setClassSummaries] = useState([])
  const [classDetails, setClassDetails] = useState({})
  const [classGrades, setClassGrades] = useState({})
  const [calendarEvents, setCalendarEvents] = useState([])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [calendarScope, setCalendarScope] = useState('week')
  const navigate = useNavigate()
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
          setClassGrades({})
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

        const gradeResults = await Promise.all(
          teacherClasses.map(async (cls) => {
            if (abort) return null
            try {
              const grades = await getClassGrades(cls.id)
              return grades ? { classId: cls.id, grades } : null
            } catch (err) {
              console.warn('Notas indisponíveis para turma', cls.id, err)
              return null
            }
          })
        )
        if (abort) return

        const gradesMap = {}
        gradeResults.forEach((entry) => {
          if (entry && entry.classId) {
            gradesMap[entry.classId] = entry.grades
          }
        })
        setClassGrades(gradesMap)
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

  const reloadAnnouncements = reloadContents

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

  const pendingCount = useMemo(() => {
    if (!calendarEvents.length) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setDate(horizon.getDate() + 7)

    return calendarEvents.reduce((total, event) => {
      const when = event?.date instanceof Date ? event.date : parseDate(event?.dateISO)
      if (!when) return total
      return isWithinRange(when, today, horizon) ? total + 1 : total
    }, 0)
  }, [calendarEvents])

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
        if (!cells[key]) cells[key] = []
        if (!cells[key].includes(label)) {
          cells[key].push(label)
        }
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
        if (!cells[key]) cells[key] = []
        if (!cells[key].includes(label)) {
          cells[key].push(label)
        }
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

  const gradeAverages = useMemo(() => {
    const totals = new Map()
    Object.values(classGrades).forEach((snapshot) => {
      if (!snapshot || !Array.isArray(snapshot.students)) return
      snapshot.students.forEach((student) => {
        if (!student?.grades) return
        Object.entries(student.grades).forEach(([termKey, grade]) => {
          const normalizedScore = grade?.score
          if (!Number.isFinite(normalizedScore)) return
          const term = Number(termKey)
          if (!term) return
          const entry = totals.get(term) || { sum: 0, count: 0 }
          entry.sum += normalizedScore
          entry.count += 1
          totals.set(term, entry)
        })
      })
    })

    return Array.from(totals.entries())
      .map(([term, value]) => ({
        term,
        average: value.count ? value.sum / value.count : 0,
      }))
      .sort((a, b) => a.term - b.term)
  }, [classGrades])

  const gradeMaxAverage = gradeAverages.reduce((max, item) => (item.average > max ? item.average : max), 0)

  const resolvedAvatar = resolveAvatarUrl(user?.photoUrl || user?.photo || user?.avatarUrl)

  const upcomingHighlights = useMemo(() => {
    if (!aggregatedEvents.length) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setDate(horizon.getDate() + 14)

    return aggregatedEvents
      .filter((event) => isWithinRange(event.date, today, horizon))
      .map((event) => ({
        id: event.id,
        date: event.date,
        title: event.title,
        subtitle: event.label && event.label !== 'Turma' ? event.label : null,
        badge: event.type,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8)
  }, [aggregatedEvents])

  if(!user) return <div className="pt-20 p-md"><p>Carregando...</p></div>

  return (
    <div className="pt-4 p-md space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#FFA654] text-white shadow-xl">
        <button
          type="button"
          onClick={handleLogout}
          className="absolute right-6 top-6 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/30"
        >
          Sair
        </button>
        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {resolvedAvatar ? (
              <img src={resolvedAvatar} alt={user.name} className="h-16 w-16 rounded-2xl border border-white/60 object-cover shadow-lg" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/60 bg-white/20 text-2xl font-semibold uppercase">
                {user?.name ? user.name.slice(0, 1) : '?'}
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-wide text-white/80">Bem-vindo de volta</p>
              <h1 className="text-2xl font-semibold md:text-3xl">{user?.name || 'Professor'}</h1>
              <p className="text-white/80">Painel do professor</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80">Turmas ativas</p>
              <p className="text-2xl font-semibold">{totalClasses}</p>
            </div>
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80">Alunos alcançados</p>
              <p className="text-2xl font-semibold">{uniqueStudentsCount}</p>
            </div>
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80">Pendências (7 dias)</p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Ações rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-[#FF8A00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ff7800]" onClick={() => setShowEmail(true)}>
              Enviar e-mail
            </button>
            <button className="rounded-full bg-[#222] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111]" onClick={() => setAnnouncementOpen(true)}>
              Novo aviso
            </button>
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF8A00] hover:text-[#FF8A00]" onClick={() => setContentOpen(true)}>
              Conteúdo rápido
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Quadro semanal</h2>
                <p className="text-sm text-slate-500">Distribuição das aulas de segunda a sexta</p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <div className="grid min-w-[680px] grid-cols-[120px_repeat(5,1fr)] gap-2">
                <div className="h-12"></div>
                {WEEKDAY_CONFIG.map((day) => (
                  <div key={day.id} className="flex h-12 items-center justify-center rounded-xl bg-[#FFF3E3] text-sm font-semibold text-[#FF8A00]">
                    {day.label}
                  </div>
                ))}
                {SLOT_CONFIG.map((slot) => (
                  <Fragment key={slot.id}>
                    <div className="flex h-24 flex-col justify-center rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                      <span>{slot.label} horário</span>
                      <span className="mt-1 text-xs font-normal text-slate-500">{slot.time}</span>
                    </div>
                    {WEEKDAY_CONFIG.map((day) => {
                      const key = `${slot.id}-${day.id}`
                      const cellItems = scheduleMatrix[key] || []
                      return (
                        <div
                          key={`${slot.id}-${day.id}`}
                          className="flex h-24 flex-col gap-1 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-600"
                        >
                          {cellItems.length === 0 && <span className="my-auto text-center text-xs text-slate-400">—</span>}
                          {cellItems.slice(0, 2).map((label) => (
                            <span key={label} className="truncate rounded-lg bg-[#FFF5EB] px-2 py-1 text-xs font-medium text-[#FF8A00]">
                              {label}
                            </span>
                          ))}
                          {cellItems.length > 2 && (
                            <span className="text-center text-xs text-slate-400">+{cellItems.length - 2}</span>
                          )}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Agenda agregada</h2>
                <p className="text-sm text-slate-500">Conteúdos, avaliações e marcos consolidados</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${calendarScope === 'week' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'}`}
                    onClick={() => setCalendarScope('week')}
                  >
                    Semana
                  </button>
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${calendarScope === 'month' ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'}`}
                    onClick={() => setCalendarScope('month')}
                  >
                    Mês
                  </button>
                </div>
                <button
                  className="text-sm font-semibold text-[#FF8A00] transition hover:text-[#ff7800]"
                  onClick={() => navigate('/professor/classes')}
                >
                  Ver todos
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {insightsLoading ? (
                <p className="text-sm text-slate-500">Carregando agenda...</p>
              ) : eventsByDay.length ? (
                eventsByDay.map((group) => (
                  <div key={group.iso} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded-full bg-[#FFF3E3] px-3 py-1 font-semibold text-[#FF8A00]">
                        {DATE_BADGE_FORMATTER.format(group.date)}
                      </span>
                      <span className="text-slate-500">{LONG_DATE_FORMATTER.format(group.date)}</span>
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((event) => (
                        <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                            {event.label && <p className="text-xs text-slate-500">{event.label}</p>}
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                              event.type === 'ATIVIDADE'
                                ? 'bg-[#FFF3E3] text-[#FF8A00]'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {event.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Nenhum evento para este período.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Média geral por bimestre</h2>
            </div>
            <div className="mt-6 h-56">
              {insightsLoading ? (
                <p className="text-sm text-slate-500">Carregando notas...</p>
              ) : gradeAverages.length ? (
                <div className="flex h-full items-end justify-around gap-4">
                  {gradeAverages.map((item) => {
                    const height = gradeMaxAverage ? Math.max(8, (item.average / gradeMaxAverage) * 100) : 0
                    return (
                      <div key={item.term} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className="w-12 max-w-full rounded-t-2xl bg-gradient-to-b from-[#FFB347] to-[#FF8A00]"
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{item.term}º bim.</span>
                        <span className="text-sm font-semibold text-slate-700">{item.average.toFixed(1).replace('.', ',')}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Ainda não há notas cadastradas.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Destaques próximos</h2>
              <button className="text-sm font-semibold text-[#FF8A00] transition hover:text-[#ff7800]" onClick={() => navigate('/professor/classes')}>
                Gerenciar turmas
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Carregando...</p>
              ) : upcomingHighlights.length ? (
                upcomingHighlights.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1 rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-[#FFF3E3] px-3 py-1 font-semibold text-[#FF8A00]">
                        {DATE_BADGE_FORMATTER.format(item.date)}
                      </span>
                      <span>{LONG_DATE_FORMATTER.format(item.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
                    <span
                      className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${
                        item.badge === 'ATIVIDADE'
                          ? 'bg-[#FFF3E3] text-[#FF8A00]'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Sem destaques nos próximos dias.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <SendEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />
      <QuickContentModal open={contentOpen} onClose={() => setContentOpen(false)} onSaved={reloadContents} />
      <AnnouncementModal open={announcementOpen} onClose={() => setAnnouncementOpen(false)} onSaved={reloadAnnouncements} />

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
