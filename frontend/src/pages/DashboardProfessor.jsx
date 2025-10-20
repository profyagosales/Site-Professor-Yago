import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import SendEmailModal from '@/components/SendEmailModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import { listMyClasses, getClassDetails } from '@/services/classes.service'
import { Button } from '@/components/ui/Button'
import RadarCard from '@/components/dashboard/radar/RadarCard'
import AgendaCalendarCard from '@/components/dashboard/AgendaCalendarCard'
import WeeklySchedule from '@/components/dashboard/WeeklySchedule'
import AvisosCard from '@/components/dashboard/AvisosCard'
import DivisaoNotasCard from '@/components/dashboard/DivisaoNotasCard'
import DivisaoNotasModal from '@/components/dashboard/DivisaoNotasModal'
import AgendaEditorModal from '@/components/dashboard/AgendaEditorModal'
import { listAgenda } from '@/services/agenda'

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

const AGENDA_YEAR_START = '2025-01-01'
const AGENDA_YEAR_END = '2025-12-31'

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

function DashboardProfessor(){
  const [user, setUser] = useState(null)
  const [classSummaries, setClassSummaries] = useState([])
  const [classDetails, setClassDetails] = useState({})
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState(null)
  const [divisaoNotasOpen, setDivisaoNotasOpen] = useState(false)
  const [gradeSchemeDraft, setGradeSchemeDraft] = useState(/** @type {import('@/services/gradeScheme').GradeScheme | null} */(null))
  const [gradeSchemeRefreshKey, setGradeSchemeRefreshKey] = useState(0)
  const [agendaEditorOpen, setAgendaEditorOpen] = useState(false)
  const [agendaEditorItems, setAgendaEditorItems] = useState([])
  const [agendaEditorLoading, setAgendaEditorLoading] = useState(false)
  const [agendaEditorFocusId, setAgendaEditorFocusId] = useState(null)
  const [agendaEditorPresetDate, setAgendaEditorPresetDate] = useState(null)
  const [agendaRefreshKey, setAgendaRefreshKey] = useState(0)
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

  const handleOpenAgendaEditor = useCallback(
    async (options = {}) => {
      if (agendaEditorLoading) {
        return
      }

      setAgendaEditorLoading(true)

      try {
        const agendaItems = await listAgenda({ from: AGENDA_YEAR_START, to: AGENDA_YEAR_END, tipo: 'all' })
        setAgendaEditorItems(Array.isArray(agendaItems) ? agendaItems : [])
        setAgendaEditorFocusId(options?.focusId ?? null)
        setAgendaEditorPresetDate(options?.presetDate ?? null)
        setAgendaEditorOpen(true)
      } catch (error) {
        console.error('[DashboardProfessor] Falha ao carregar agenda completa', error)
        toast.error('Não foi possível carregar a agenda.')
      } finally {
        setAgendaEditorLoading(false)
      }
    },
    [agendaEditorLoading]
  )

  const handleCloseAgendaEditor = useCallback(() => {
    setAgendaEditorOpen(false)
    setAgendaEditorFocusId(null)
    setAgendaEditorPresetDate(null)
    setAgendaEditorItems([])
  }, [])

  useEffect(() => {
    classSummariesRef.current = classSummaries
  }, [classSummaries])

  useEffect(() => {
    classDetailsRef.current = classDetails
  }, [classDetails])

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
  }, [])

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

  const primaryClassId = useMemo(() => {
    const first = classSummaries.find((summary) => coalesceId(summary))
    return first ? coalesceId(first) : ''
  }, [classSummaries])

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

  const resolvedAvatar = resolveAvatarUrl(user?.photoUrl || user?.photo || user?.avatarUrl)

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
            <Button className="cta-compact" onClick={() => handleOpenAgendaEditor()} disabled={agendaEditorLoading}>
              Agenda
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

      <section className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 gap-[var(--dash-gap)] lg:grid-cols-2 [--grid-h:calc(var(--h-stack)*2+var(--dash-gap))]">
          <div className="h-[var(--h-stack)]">
            <div className="card h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-900">Horário semanal</h2>
              </div>
              <div className="mt-3 flex-1 min-h-0">
                <WeeklySchedule slots={SLOT_CONFIG} days={WEEKDAY_CONFIG} cells={scheduleMatrix} />
              </div>
            </div>
          </div>

          <aside className="lg:row-span-2 lg:h-[var(--grid-h)]">
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
          </aside>

          <div className="h-[var(--h-stack)]">
            <DivisaoNotasCard
              ano={gradeSchemeYear}
              classId={primaryClassId || null}
              onEdit={handleOpenGradeScheme}
              refreshToken={gradeSchemeRefreshKey}
            />
          </div>
        </div>

        <div className="mt-6">
          <AgendaCalendarCard
            refreshToken={agendaRefreshKey}
            onOpenEditor={handleOpenAgendaEditor}
            editorLoading={agendaEditorLoading}
          />
        </div>

        <div className="mt-6">
          <RadarCard role="teacher" />
        </div>
      </section>
      <DivisaoNotasModal
        ano={gradeSchemeYear}
        classId={primaryClassId || null}
        initial={gradeSchemeDraft}
        isOpen={divisaoNotasOpen}
        onClose={handleCloseGradeScheme}
        onSaved={() => {
          setGradeSchemeRefreshKey((prev) => prev + 1)
        }}
      />
      <AgendaEditorModal
        open={agendaEditorOpen}
        onClose={handleCloseAgendaEditor}
        initialItems={agendaEditorItems}
        initialNewItemDate={agendaEditorPresetDate}
        focusItemId={agendaEditorFocusId}
        onSaved={() => {
          setAgendaRefreshKey((prev) => prev + 1)
        }}
      />
      <SendEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />
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
