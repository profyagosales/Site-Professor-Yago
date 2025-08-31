import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ProfileHeader from '@/components/ProfileHeader'
import ScheduleTable from '@/components/ScheduleTable'
import SendEmailModal from '@/components/SendEmailModal'
import QuickContentModal from '@/components/QuickContentModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import { getCurrentUser } from '@/services/auth'
import { api } from '@/services/api'
import { listUpcomingContents } from '@/services/contents'
import { listUpcomingExams } from '@/services/exams'
import { listAnnouncements } from '@/services/announcements'
import { getTeacherWeeklySchedule } from '@/services/schedule'

function DashboardProfessor(){
  const [user, setUser] = useState(null)
  const [contents, setContents] = useState([])
  const [exams, setExams] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const u = await getCurrentUser()
        if (abort) return
        setUser(u)
        if (!u?.id) return
        const [c, e, a, s] = await Promise.all([
          listUpcomingContents({ teacherId: u.id }).catch(() => { toast.error('Não foi possível carregar conteúdos'); return [] }),
          listUpcomingExams({ teacherId: u.id }).catch(() => { toast.error('Não foi possível carregar avaliações'); return [] }),
          listAnnouncements({ teacherId: u.id }).catch(() => { toast.error('Não foi possível carregar avisos'); return [] }),
          getTeacherWeeklySchedule(u.id).catch(() => { toast.error('Não foi possível carregar horário'); return [] })
        ])
        if (abort) return
        setContents(c)
        setExams(e)
        setAnnouncements(a)
        setSchedule(s)
      } catch {
        if (!abort) toast.error('Não foi possível carregar usuário')
      } finally {
        if (!abort) setLoading(false)
      }
    })()
    return () => { abort = true }
  }, [])

  const handleLogout = async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('auth_token')
    delete api.defaults.headers.common['Authorization']
    navigate('/login-professor')
  }

  const reloadContents = async () => {
    if(!user?.id) return
    try {
      const data = await listUpcomingContents({ teacherId: user.id })
      setContents(data)
    } catch { toast.error('Não foi possível carregar conteúdos') }
  }

  const reloadAnnouncements = async () => {
    if(!user?.id) return
    try {
      const data = await listAnnouncements({ teacherId: user.id })
      setAnnouncements(data)
    } catch { toast.error('Não foi possível carregar avisos') }
  }

  if(!user) return <div className="pt-20 p-md"><p>Carregando...</p></div>

  return (
    <div className="pt-4 p-md space-y-md">
      <ProfileHeader name={user.name} subtitle="Professor" avatarUrl={user.photoUrl || user.avatarUrl} onLogout={handleLogout} />

      <div className="flex flex-wrap gap-md">
        <button className="ys-btn-primary" onClick={() => setShowEmail(true)}>Enviar e-mail</button>
        <button className="ys-btn-primary" onClick={() => setAnnouncementOpen(true)}>Adicionar aviso</button>
        <button className="ys-btn-primary" onClick={() => setContentOpen(true)}>Adicionar conteúdo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="ys-card">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-orange font-semibold">Próximos conteúdos</h3>
            <button className="link-primary" onClick={() => navigate('/conteudos')}>Ver todos</button>
          </div>
          {loading ? <p>Carregando...</p> : contents.length ? (
            <ul className="space-y-1">
              {contents.map(c => (
                <li key={c.id} className="text-sm">{c.title} — {c.className} — {new Date(c.date).toLocaleDateString()}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">Nenhum conteúdo próximo</p>}
        </div>

        <div className="ys-card">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-orange font-semibold">Próximas Avaliações</h3>
            <button className="link-primary" onClick={() => navigate('/notas-classe')}>Ver todos</button>
          </div>
          {loading ? <p>Carregando...</p> : exams.length ? (
            <ul className="space-y-1">
              {exams.map(e => (
                <li key={e.id} className="text-sm">{e.title} — {e.className} — {new Date(e.date).toLocaleDateString()}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">Sem avaliações</p>}
        </div>

        <div className="ys-card">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-orange font-semibold">Avisos recentes</h3>
            <button className="link-primary" onClick={() => navigate('/avisos')}>Ver todos</button>
          </div>
          {loading ? <p>Carregando...</p> : announcements.length ? (
            <ul className="space-y-1">
              {announcements.map(a => (
                <li key={a.id} className="text-sm">{a.title || a.message} — {new Date(a.createdAt).toLocaleDateString()}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">Sem avisos</p>}
        </div>

        <ScheduleTable schedules={schedule} />
      </div>

      <SendEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />
      <QuickContentModal open={contentOpen} onClose={() => setContentOpen(false)} onSaved={reloadContents} />
      <AnnouncementModal open={announcementOpen} onClose={() => setAnnouncementOpen(false)} onSaved={reloadAnnouncements} />
    </div>
  )
}

export default DashboardProfessor
