import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ProfileHeader from '@/components/ProfileHeader'
import ScheduleTable from '@/components/ScheduleTable'
import {
  getStudentProfile,
  getStudentWeeklySchedule,
  listStudentUpcomingExams,
  listStudentUpcomingContents,
  listStudentAnnouncements,
  getStudentNotebookSummary,
  getStudentGrades,
} from '@/services/student'
import { logout } from '@/services/auth'
import { FaPen, FaStar, FaFilePdf, FaBook } from 'react-icons/fa'
import flags from '@/config/features'

function ShortcutCards() {
  const shortcuts = [
    ...(flags.redaction
      ? [{ path: '/aluno/redacao', title: 'Redações', subtitle: 'Minhas redações', icon: <FaPen className="text-orange w-6 h-6" /> }]
      : []),
    { path: '/aluno/notas', title: 'Notas', subtitle: 'Resumo por bimestre', icon: <FaStar className="text-orange w-6 h-6" /> },
    { path: '/aluno/gabaritos', title: 'Gabaritos', subtitle: 'PDFs corrigidos', icon: <FaFilePdf className="text-orange w-6 h-6" /> },
    { path: '/aluno/caderno', title: 'Caderno', subtitle: 'Vistos do bimestre', icon: <FaBook className="text-orange w-6 h-6" /> },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md mt-md">
      {shortcuts.map((s) => (
        <Link
          key={s.path}
          to={s.path}
          className="card flex flex-col items-center justify-center p-md text-center hover:-translate-y-0.5 transition"
        >
          {s.icon}
          <span className="font-semibold mt-2">{s.title}</span>
          <span className="text-sm text-black/70">{s.subtitle}</span>
        </Link>
      ))}
    </div>
  )
}

function ExamsCard({ exams = [] }) {
  return (
    <div className="card p-md">
      <div className="flex justify-between items-center mb-sm">
        <h3 className="font-semibold">Próximas avaliações</h3>
        <Link to="/aluno/notas" className="text-orange text-sm">Ver todos</Link>
      </div>
      <ul className="space-y-1 text-sm">
        {exams.length === 0 && <li className="text-black/60">Nenhuma avaliação</li>}
        {exams.map((e) => (
          <li key={e.id} className="flex justify-between">
            <span>{new Date(e.date).toLocaleDateString()}</span>
            <span className="ml-2 flex-1">{e.title}</span>
            <span className="text-black/60">{e.className}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContentsCard({ contents = [] }) {
  return (
    <div className="card p-md">
      <div className="flex justify-between items-center mb-sm">
        <h3 className="font-semibold">Próximos conteúdos</h3>
        <Link to="/conteudos" className="text-orange text-sm">Ver todos</Link>
      </div>
      <ul className="space-y-1 text-sm">
        {contents.length === 0 && <li className="text-black/60">Nenhum conteúdo</li>}
        {contents.map((c) => (
          <li key={c.id} className="flex justify-between">
            <span>{new Date(c.date).toLocaleDateString()}</span>
            <span className="ml-2 flex-1">{c.title}</span>
            <span className="text-black/60">{c.className}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnnouncementsCard({ items = [] }) {
  return (
    <div className="card p-md">
      <div className="flex justify-between items-center mb-sm">
        <h3 className="font-semibold">Avisos</h3>
        <Link to="/aluno/avisos" className="text-orange text-sm">Ver todos</Link>
      </div>
      <ul className="space-y-1 text-sm">
        {items.length === 0 && <li className="text-black/60">Nenhum aviso</li>}
        {items.map((a) => (
          <li key={a.id} className="flex justify-between">
            <span className="flex-1">{a.message || a.title}</span>
            <span className="text-black/60 ml-2">{new Date(a.date || a.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GradesBox({ grades }) {
  const activitiesScore = grades?.activities?.reduce((s, a) => s + (a.score || 0), 0) || 0
  const notebookScore = grades?.notebookScore || 0
  const totalTerm = activitiesScore + notebookScore
  const badgeColor = totalTerm < 5 ? 'bg-red-500' : 'bg-green-500'
  return (
    <div className="card p-md">
      <div className="flex justify-between items-center mb-sm">
        <h3 className="font-semibold">Notas do bimestre</h3>
        <Link to="/aluno/notas" className="text-orange text-sm">Ver detalhes</Link>
      </div>
      <div className="mb-md">
        <span className={`text-white px-2 py-1 rounded ${badgeColor}`}>{totalTerm.toFixed(1)}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-black/70">
            <th>Atividade</th>
            <th>Valor</th>
            <th>Nota</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {grades?.activities?.map((a) => (
            <tr key={a.id} className="border-t">
              <td>{a.title}</td>
              <td>{a.weight}</td>
              <td>{a.score ?? '-'}</td>
              <td>{a.date ? new Date(a.date).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
          <tr className="border-t font-semibold">
            <td>Caderno</td>
            <td colSpan="2">{notebookScore.toFixed(1)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function NotebookBox({ nb }) {
  const total = nb?.totalValue || 0
  const seen = nb?.seenCount || 0
  const totalItems = nb?.items?.length || 0
  return (
    <div className="card p-md">
      <div className="flex justify-between items-center mb-sm">
        <h3 className="font-semibold">Caderno — Bimestre atual</h3>
        <Link to="/aluno/caderno" className="text-orange text-sm">Ver detalhes</Link>
      </div>
      <p className="text-sm mb-sm">Valor do caderno: {total}</p>
      <p className="text-sm mb-md">Vistos: {seen}/{totalItems}</p>
      <ul className="space-y-1 text-sm">
        {(nb?.items || []).slice(0, 3).map((i) => (
          <li key={i.id} className="flex justify-between">
            <span>{i.title}</span>
            <span className="text-black/60 ml-2">{new Date(i.date).toLocaleDateString()}</span>
            <span className="ml-2">{i.done ? '✓' : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardAluno() {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [sched, setSched] = useState([])
  const [exams, setExams] = useState([])
  const [contents, setContents] = useState([])
  const [ann, setAnn] = useState([])
  const [nb, setNb] = useState(null)
  const [grades, setGrades] = useState(null)
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState(1)

  async function load() {
    try {
      setLoading(true)
      const me = await getStudentProfile()
      setStudent(me)
      const [sc, ex, co, an, notebook, gr] = await Promise.all([
        getStudentWeeklySchedule(me.id),
        listStudentUpcomingExams(me.id, { limit: 5 }),
        listStudentUpcomingContents(me.id, { limit: 5 }),
        listStudentAnnouncements(me.id, { limit: 5 }),
        getStudentNotebookSummary(me.id, term),
        getStudentGrades(me.id, term),
      ])
      setSched(sc)
      setExams(ex)
      setContents(co)
      setAnn(an)
      setNb(notebook)
      setGrades(gr)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [term])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token || role !== 'student') {
      navigate('/login-aluno')
    }
  }, [navigate])

  return (
    <div className="p-md space-y-md">
      <ProfileHeader profile={student} onLogout={logout} />
      <ShortcutCards />
      <div className="grid lg:grid-cols-2 gap-md">
        <div className="space-y-md">
          <ScheduleTable schedule={sched} />
          <ContentsCard contents={contents} />
        </div>
        <div className="space-y-md">
          <ExamsCard exams={exams} />
          <AnnouncementsCard items={ann} />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-md">
        <GradesBox grades={grades} />
        <NotebookBox nb={nb} />
      </div>
    </div>
  )
}
