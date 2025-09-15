import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthStateProvider'
import { useEnhancedAuth } from '@/store/EnhancedAuthProvider'
import toast from 'react-hot-toast'

export function LoginAlunoPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const submittedRef = useRef(false)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const location = useLocation()
  
  const { loginStudent } = useAuth()
  const { state: enhanced } = useEnhancedAuth()
  const navigate = useNavigate()
  
  useEffect(()=> { emailRef.current?.focus() }, [])

  function mapErrorMessage(err: any): string {
    const status = err?.response?.status
    if (status === 401) return 'Credenciais inválidas.'
    if (status === 429) return 'Muitas tentativas. Espere um pouco.'
    if (status >= 500) return 'Servidor indisponível. Tente em instantes.'
    return err?.response?.data?.message || 'Erro ao fazer login.'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isLoading) return
    submittedRef.current = true
    if (!email.trim() || !password) { setError('Preencha email e senha'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Email inválido'); emailRef.current?.focus(); return }
    try {
      setIsLoading(true)
      setError(null)
      await loginStudent(email, password)
      toast.success('Bem-vindo!')
      const redirectTo = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(redirectTo)
    } catch (err: any) {
      const msg = mapErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md p-6 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-2xl font-bold text-center mb-2">Acesso do Aluno</h1>
        <p className="text-center text-sm text-slate-500 mb-6">Entre para enviar e acompanhar suas redações.</p>
        {enhanced.meta.sessionExpired && (
          <div className="mb-4 text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-700 p-2">Sessão anterior expirada. Faça login novamente.</div>
        )}
        {error && (
          <div role="alert" className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg">
            {error}
          </div>
        )}
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input
              ref={emailRef}
              type="email"
              id="email"
              autoComplete="username"
              value={email}
              onChange={e=> setEmail(e.target.value)}
              onBlur={()=> { if (submittedRef.current && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) setError('Email inválido') }}
              className={`mt-0 block w-full px-3 py-2 rounded-md border ${error && submittedRef.current ? 'border-red-400' : 'border-slate-300'} shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
              placeholder="aluno@exemplo.com"
              aria-invalid={!!error}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={e=> setPassword(e.target.value)}
                className={`block w-full px-3 py-2 rounded-md border ${error && submittedRef.current ? 'border-red-400' : 'border-slate-300'} shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm pr-10`}
                placeholder="••••••••"
              />
              <button type="button" onClick={()=> setShowPassword(p=>!p)} className="absolute inset-y-0 right-2 flex items-center text-xs text-slate-500 hover:text-slate-700 focus:outline-none">
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ambiente seguro</span>
            <span className="flex items-center gap-1">{isLoading && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"/>} {enhanced.loading ? 'Verificando sessão...' : ''}</span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="mt-6 text-[11px] text-center text-slate-400">&copy; {new Date().getFullYear()} Plataforma do Aluno</div>
      </div>
    </div>
  )
}
