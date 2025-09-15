import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

type User = {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher'
  photoUrl?: string
}

type AuthState = {
  isAuthenticated: boolean
  role: 'student' | 'teacher' | null
  userId: string | null
  user: User | null
  token: string | null
}

type AuthContextType = {
  auth: AuthState
  setAuth: (auth: AuthState) => void
  loginTeacher: (email: string, password: string) => Promise<void>
  loginStudent: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  role: null,
  userId: null,
  user: null,
  token: null,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthStateProviderProps = {
  children: ReactNode
}

export function AuthStateProvider({ children }: AuthStateProviderProps) {
  const [auth, setAuthState] = useState<AuthState>(initialAuthState)
  const [isLoading, setIsLoading] = useState(true)

  // Controlar tentativas de autenticação
  const [authAttemptCount, setAuthAttemptCount] = useState(0)

  // Verifica se o usuário está autenticado ao carregar o componente
  useEffect(() => {
    const disableAuto = import.meta.env.VITE_DISABLE_AUTO_AUTH_CHECK === 'true';
    if (disableAuto) {
      console.log('Auto auth check desabilitado por VITE_DISABLE_AUTO_AUTH_CHECK');
      setIsLoading(false);
      return;
    }
    // Limitar a uma tentativa inicial para evitar loops
    if (authAttemptCount > 0) {
      return;
    }

    setAuthAttemptCount(prev => prev + 1);
    
    const checkAuthStatus = async () => {
      try {
        // Flag para verificar se já autenticou
        let isAuthenticated = false;
        
        // Tentar primeiro a autenticação via cookie
        try {
          console.log('Verificando autenticação por cookie...')
          const response = await api.get('/auth/me')
          const userData = response.data
          
          console.log('Usuário autenticado via cookie:', userData.name)
          setAuthState({
            isAuthenticated: true,
            role: userData.role,
            userId: userData._id,
            user: {
              id: userData._id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              photoUrl: userData.photoUrl,
            },
            token: null // Não armazena token quando usa cookies
          })
          isAuthenticated = true;
        } catch (err: any) {
          // Se a requisição falhar, não está autenticado via cookie
          console.log("Usuário não está autenticado via cookie", err.message || err)
          
          // Tenta autenticação via token no localStorage
          const token = localStorage.getItem('token')
          const userStr = localStorage.getItem('user')
          
          if (token && userStr) {
            try {
              const user = JSON.parse(userStr)
              setAuthState({
                isAuthenticated: true,
                role: user.role,
                userId: user.id,
                user,
                token,
              })
              isAuthenticated = true;
            } catch (parseError) {
              console.error("Erro ao processar dados do usuário armazenados:", parseError)
              localStorage.removeItem('user')
              localStorage.removeItem('token')
            }
          }
        }

        if (!isAuthenticated) {
          // Nem cookie nem token disponíveis
          setAuthState(initialAuthState)
          console.log("Usuário não autenticado - redirecionamento normal")
        }
      } catch (error: any) {
        // Se houver erro, limpa dados de autenticação
        console.error("Erro geral na verificação de autenticação:", error.message || error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setAuthState(initialAuthState)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuthStatus()
  }, [])

  const setAuth = (auth: AuthState) => {
    setAuthState(auth)
  }

  const loginTeacher = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login/teacher', { email, password })
      const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
      
      const { token, user } = response.data
      // Mesmo com cookie auth, armazenamos token para fallback
      if (token) localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setAuthState({
        isAuthenticated: true,
        role: user.role,
        userId: user.id,
        user,
        token: token || null,
      })
    } catch (error) {
      throw error
    }
  }

  const loginStudent = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login/student', { email, password })
      const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
      
      const { token, user } = response.data
      if (token) localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setAuthState({
        isAuthenticated: true,
        role: user.role,
        userId: user.id,
        user,
        token: token || null,
      })
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
      
      if (useCookieAuth) {
        try {
          // Se usa cookies, chama endpoint de logout para limpar cookies
          console.log('Fazendo logout via API para limpar cookies...')
          await api.post('/auth/logout')
          console.log('Logout via API concluído com sucesso')
        } catch (logoutError) {
          console.error('Erro ao chamar endpoint de logout:', logoutError)
          // Continua com o logout local mesmo se falhar o logout remoto
        }
      }
      
      // Limpa armazenamento local
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Reseta estado de autenticação
      setAuthState(initialAuthState)
      console.log('Estado de autenticação resetado localmente')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, limpa dados locais
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setAuthState(initialAuthState)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      auth, 
      setAuth, 
      logout,
      loginTeacher,
      loginStudent,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthStateProvider')
  }
  return context
}
