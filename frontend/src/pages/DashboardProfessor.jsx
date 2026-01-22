import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import AvisosCard from '@/components/dashboard/AvisosCard'
import DivisaoNotasCard from '@/components/dashboard/DivisaoNotasCard'
import DivisaoNotasModal from '@/components/dashboard/DivisaoNotasModal'
import AgendaEditorModal from '@/components/dashboard/AgendaEditorModal'
import { listAgenda } from '@/services/agenda'
import { saveTeacherGradeSplitSettings } from '@/services/gradeScheme'

/*
// Snippet opcional para habilitar o widget da agenda semanal
// Basta remover este comentário e garantir VITE_FEATURE_AGENDA_WIDGET=1
// import AgendaWeekWidget from '@/components/agenda/AgendaWeekWidget';
*/

const AGENDA_YEAR_START = '2025-01-01'
const AGENDA_YEAR_END = '2025-12-31'

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

function DashboardProfessor(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState(null)
  const [divisaoNotasOpen, setDivisaoNotasOpen] = useState(false)
  const [gradeSchemeDraft, setGradeSchemeDraft] = useState(/** @type {import('@/services/gradeScheme').GradeScheme | null} */(null))
  const [gradeSchemeRefreshKey, setGradeSchemeRefreshKey] = useState(0)
  const [gradeSchemeDefaultBimester, setGradeSchemeDefaultBimester] = useState(/** @type {import('@/services/gradeScheme').Bimestre} */(1))
  const [gradeSchemeActiveBimester, setGradeSchemeActiveBimester] = useState(/** @type {import('@/services/gradeScheme').Bimestre} */(1))
  const [agendaEditorOpen, setAgendaEditorOpen] = useState(false)
  const [agendaEditorItems, setAgendaEditorItems] = useState([])
  const [agendaEditorLoading, setAgendaEditorLoading] = useState(false)
  const [agendaEditorFocusId, setAgendaEditorFocusId] = useState(null)
  const [agendaEditorPresetDate, setAgendaEditorPresetDate] = useState(null)
  const [agendaRefreshKey, setAgendaRefreshKey] = useState(0)
  const teacherId = user?.id ?? user?._id ?? ''
  const gradeSchemeYear = new Date().getFullYear()

  const handleOpenGradeScheme = useCallback((payload) => {
    if (!payload) return
    setGradeSchemeDraft(payload.scheme)
    setGradeSchemeDefaultBimester(payload.defaultBimester)
    setGradeSchemeActiveBimester(payload.currentBimester)
    setDivisaoNotasOpen(true)
  }, [])

  const handleCloseGradeScheme = useCallback(() => {
    setDivisaoNotasOpen(false)
    setGradeSchemeDraft(null)
  }, [])

  useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const currentUser = await getCurrentUser()
        if (abort) return
        setUser(currentUser)
        setLoading(false)
      } catch (error) {
        if (!abort) {
          console.error(error)
          toast.error('Não foi possível carregar os dados do professor')
          setLoading(false)
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

  const handleSaveGradeSchemeDefault = useCallback(
    async (bimester) => {
      if (!teacherId) {
        throw new Error('Não foi possível identificar o professor para salvar o bimestre padrão.')
      }
      setGradeSchemeDefaultBimester(bimester)
      await saveTeacherGradeSplitSettings({ teacherId, defaultBimester: bimester })
      setGradeSchemeRefreshKey((prev) => prev + 1)
    },
    [teacherId],
  )

  const primaryClassId = ''

  if(!user) return <div className="page-safe pt-20"><p>Carregando...</p></div>

  return (
    <div className="page-safe pt-4 space-y-6">
      <section className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 gap-[var(--dash-gap)] lg:grid-cols-2 [--grid-h:calc(var(--h-stack)*2+var(--dash-gap))]">
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
              teacherId={teacherId || null}
              onEdit={handleOpenGradeScheme}
              refreshToken={gradeSchemeRefreshKey}
            />
          </div>
        </div>

        <div className="mt-6">
          {/* TODO(remove/radar-ranking): Radar/Ranking card removido do dashboard */}
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
        defaultBimester={gradeSchemeDefaultBimester}
        currentBimester={gradeSchemeActiveBimester}
        onSaveDefaultBimester={handleSaveGradeSchemeDefault}
      />
      <AgendaEditorModal
        open={agendaEditorOpen}
        onClose={() => {
          setAgendaEditorOpen(false)
          setAgendaEditorFocusId(null)
          setAgendaEditorPresetDate(null)
          setAgendaEditorItems([])
        }}
        initialItems={agendaEditorItems}
        initialNewItemDate={agendaEditorPresetDate}
        focusItemId={agendaEditorFocusId}
        onSaved={() => {
          setAgendaRefreshKey((prev) => prev + 1)
        }}
      />
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
