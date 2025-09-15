import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as classService from '@/services/classService'
import * as themeService from '@/services/themeService'
import * as studentService from '@/services/studentService'
import { essayService } from '@/services/essayService'
import { paths } from '@/routes/paths'
import { useAuth } from '@/store/AuthStateProvider'
import { Plus, CheckCircle2, X } from 'lucide-react'

interface ChecklistState {
  classes: number
  themes: number
  students: number
  essays: number
  loading: boolean
  error: string | null
}

const STORAGE_KEY = 'onboarding_checklist_dismissed'

export function OnboardingChecklist() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const [state, setState] = useState<ChecklistState>({ classes: 0, themes: 0, students: 0, essays: 0, loading: true, error: null })

  const goals = {
    classes: 1,
    themes: 1,
    students: 1,
    essays: 1
  }

  const completed = state.classes >= goals.classes && state.themes >= goals.themes && state.students >= goals.students && state.essays >= goals.essays

  useEffect(() => {
    if (dismissed || auth.role !== 'teacher') return

    let cancelled = false
    const load = async () => {
      try {
        setState(s => ({ ...s, loading: true, error: null }))
        const [cls, th, st, es] = await Promise.all([
          classService.getClasses({ page: 1, limit: 1 }),
          themeService.getThemes({ page: 1, limit: 1 }),
          studentService.getStudents({ page: 1, limit: 1 }),
          essayService.getEssays({ page: 1, limit: 1 })
        ])
        if (cancelled) return
        setState({
          classes: cls.classes.length,
          themes: th.themes.length,
          students: st.users.length,
          essays: es.data.length,
          loading: false,
          error: null
        })
      } catch (e: any) {
        if (cancelled) return
        setState(s => ({ ...s, loading: false, error: e.message || 'Falha ao carregar dados' }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [dismissed, auth.role])

  useEffect(() => {
    if (completed && !dismissed) {
      // auto dismiss após 2s
      const t = setTimeout(() => { localStorage.setItem(STORAGE_KEY, 'true'); setDismissed(true) }, 2000)
      return () => clearTimeout(t)
    }
  }, [completed, dismissed])

  if (auth.role !== 'teacher') return null
  if (dismissed) return null

  const Item = ({ label, done, action }: { label: string; done: boolean; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="text-green-600 h-4 w-4"/> : <span className="h-4 w-4 rounded-full border border-slate-300"/>}
        <span className={`text-sm ${done ? 'line-through text-slate-400' : ''}`}>{label}</span>
      </div>
      {!done && action}
    </div>
  )

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white/70 backdrop-blur shadow-sm">
      <div className="p-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-700">Checklist inicial</h2>
          <p className="text-xs text-slate-500 mt-1">Complete estes passos para começar a usar a plataforma.</p>
        </div>
        <button onClick={()=> { localStorage.setItem(STORAGE_KEY, 'true'); setDismissed(true) }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
      </div>
      <div className="px-4 pb-3">
        {state.loading && <p className="text-xs text-slate-500">Carregando...</p>}
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {!state.loading && !state.error && (
          <div className="divide-y divide-slate-100">
            <Item label="Criar ao menos 1 turma" done={state.classes >= goals.classes} action={<Link to={paths.gerenciarTurmas} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"><Plus className="h-3 w-3"/>Criar</Link>} />
            <Item label="Criar ou ativar ao menos 1 tema" done={state.themes >= goals.themes} action={<Link to={paths.gerenciarTemas} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"><Plus className="h-3 w-3"/>Criar</Link>} />
            <Item label="Cadastrar ao menos 1 aluno" done={state.students >= goals.students} action={<Link to={paths.gerenciarAlunos} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"><Plus className="h-3 w-3"/>Adicionar</Link>} />
            <Item label="Cadastrar a primeira redação" done={state.essays >= goals.essays} action={<Link to={paths.revisarRedacoes} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"><Plus className="h-3 w-3"/>Lançar</Link>} />
          </div>
        )}
      </div>
      {!completed && !state.loading && (
        <div className="px-4 pb-4 text-right text-[10px] text-slate-400">Será ocultado automaticamente quando concluído.</div>
      )}
      {completed && (
        <div className="px-4 pb-4 text-right text-[11px] text-green-600 font-medium">Checklist concluído! Ótimo trabalho.</div>
      )}
    </div>
  )
}
