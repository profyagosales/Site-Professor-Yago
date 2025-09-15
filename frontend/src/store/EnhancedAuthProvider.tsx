import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api, { __registerSessionExpiredMarker } from '@/services/api'
import { isAuthRedirectLocked, clearAuthRedirectLock, setAuthRedirectLock } from '@/constants/authRedirect'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher'
  photoUrl?: string
}

interface AuthStatusMeta {
  lastCheck: number | null
  lastSuccess: number | null
  lastError: string | null
  checks: number
  refreshes: number
  sessionExpired: boolean
  cooldownActive: boolean
}

interface EnhancedAuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  role: 'student' | 'teacher' | null
  token: string | null
  loading: boolean
  refreshing: boolean
  meta: AuthStatusMeta
}

interface EnhancedAuthContextType {
  state: EnhancedAuthState
  loginTeacher: (email: string, password: string) => Promise<void>
  loginStudent: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: (opts?: { silent?: boolean }) => Promise<void>
  markSessionExpired: () => void
}

const initialMeta: AuthStatusMeta = {
  lastCheck: null,
  lastSuccess: null,
  lastError: null,
  checks: 0,
  refreshes: 0,
  sessionExpired: false,
  cooldownActive: false,
}

const initialState: EnhancedAuthState = {
  isAuthenticated: false,
  user: null,
  role: null,
  token: null,
  loading: true,
  refreshing: false,
  meta: initialMeta
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined)

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EnhancedAuthState>(initialState)
  const focusListenerRef = useRef<boolean>(false)
  const visibilityListenerRef = useRef<boolean>(false)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)

  const applyPatch = (patch: Partial<EnhancedAuthState> | ((prev: EnhancedAuthState) => Partial<EnhancedAuthState>)) => {
    setState(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }

  const persistLocal = (token: string | null, user: AuthUser | null) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  }

  const buildAuthFromLocal = (): { token: string | null; user: AuthUser | null } => {
    const token = localStorage.getItem('token')
    const rawUser = localStorage.getItem('user')
    let parsed: AuthUser | null = null
    if (rawUser) {
      try { parsed = JSON.parse(rawUser) } catch { parsed = null }
    }
    return { token, user: parsed }
  }

  const finalizeAuth = (user: AuthUser | null, token: string | null) => {
    applyPatch(prev => ({
      isAuthenticated: !!user,
      user,
      role: user?.role || null,
      token: token || null,
      loading: false,
      meta: { ...prev.meta, lastSuccess: Date.now(), lastError: null }
    }))
  }

  const setError = (err: string) => {
    applyPatch(prev => ({ meta: { ...prev.meta, lastError: err, lastCheck: Date.now() } }))
  }

  const coreCheck = useCallback(async (silent = false) => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current
    const p = (async () => {
      applyPatch(prev => ({ meta: { ...prev.meta, checks: prev.meta.checks + 1, lastCheck: Date.now() } }))
      try {
        if (isAuthRedirectLocked()) {
          applyPatch(prev => ({ meta: { ...prev.meta, cooldownActive: true } }))
          // fallback local
          const { token, user } = buildAuthFromLocal()
          if (user) finalizeAuth(user, token)
          else finalizeAuth(null, null)
          return
        }
        const res = await api.get('/auth/me')
        const data = res.data
        const user: AuthUser = { id: data._id, name: data.name, email: data.email, role: data.role, photoUrl: data.photoUrl }
        persistLocal(state.token, user)
        finalizeAuth(user, state.token)
      } catch (e: any) {
        finalizeAuth(null, null)
        setError(e?.message || 'Falha de autenticação')
      }
    })()
    refreshInFlightRef.current = p
    try { await p } finally { refreshInFlightRef.current = null }
  }, [state.token])

  const refresh = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (state.refreshing) return
    applyPatch(prev => ({ refreshing: true, meta: { ...prev.meta, refreshes: prev.meta.refreshes + 1 } }))
    try {
      await coreCheck(!!silent)
    } finally {
      applyPatch({ refreshing: false })
    }
  }, [coreCheck, state.refreshing])

  const loginCommon = async (endpoint: string, email: string, password: string) => {
    const res = await api.post(endpoint, { email, password })
    const { token, user } = res.data
    const authUser: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photoUrl }
    persistLocal(token || null, authUser)
    clearAuthRedirectLock()
    applyPatch(prev => ({
      isAuthenticated: true,
      user: authUser,
      role: authUser.role,
      token: token || null,
      loading: false,
      meta: { ...prev.meta, lastSuccess: Date.now(), sessionExpired: false }
    }))
  }

  const loginTeacher = (email: string, password: string) => loginCommon('/auth/login/teacher', email, password)
  const loginStudent = (email: string, password: string) => loginCommon('/auth/login/student', email, password)

  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(()=>{})
    } finally {
      persistLocal(null, null)
      clearAuthRedirectLock()
      applyPatch({ ...initialState, loading: false })
    }
  }

  const markSessionExpired = () => {
    applyPatch(prev => ({ meta: { ...prev.meta, sessionExpired: true } }))
  }

  // Registrar para uso pelo interceptor sem criar ciclo direto
  useEffect(() => {
    __registerSessionExpiredMarker(() => markSessionExpired())
  }, [])

  // Initial check
  useEffect(() => { coreCheck() }, [])

  // Focus / visibility listeners
  useEffect(() => {
    if (!focusListenerRef.current) {
      window.addEventListener('focus', () => {
        // Revalida se passou > 60s desde último check
        setTimeout(() => {
          const now = Date.now()
            ;(state.meta.lastCheck == null || now - state.meta.lastCheck > 60000) && refresh({ silent: true })
        }, 50)
      })
      focusListenerRef.current = true
    }
    if (!visibilityListenerRef.current) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now()
          if (state.meta.lastCheck == null || now - state.meta.lastCheck > 90000) {
            refresh({ silent: true })
          }
        }
      })
      visibilityListenerRef.current = true
    }
  }, [state.meta.lastCheck, refresh])

  return (
    <EnhancedAuthContext.Provider value={{ state, loginTeacher, loginStudent, logout, refresh, markSessionExpired }}>
      {children}
    </EnhancedAuthContext.Provider>
  )
}

export function useEnhancedAuth() {
  const ctx = useContext(EnhancedAuthContext)
  if (!ctx) throw new Error('useEnhancedAuth deve ser usado dentro de EnhancedAuthProvider')
  return ctx
}
