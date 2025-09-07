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

  // Verifica se o usuário está autenticado ao carregar o componente
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Se estiver usando autenticação baseada em cookies, verifica o status
        const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
        
        if (useCookieAuth) {
          try {
            const response = await api.get('/auth/me')
            const userData = response.data
            
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
              token: null, // Não armazena token quando usa cookies
            })
          } catch (err) {
            // Se a requisição falhar, não está autenticado
            console.log("Usuário não está autenticado via cookie")
          }
        } else {
          // Verifica se há token salvo no localStorage
          const token = localStorage.getItem('token')
          const userStr = localStorage.getItem('user')
          
          if (token && userStr) {
            const user = JSON.parse(userStr)
            setAuthState({
              isAuthenticated: true,
              role: user.role,
              userId: user.id,
              user,
              token,
            })
          }
        }
      } catch (error) {
        // Se houver erro, limpa dados de autenticação
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
      
      if (!useCookieAuth) {
        // Armazena token se não estiver usando cookies
        const { token, user } = response.data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        setAuthState({
          isAuthenticated: true,
          role: user.role,
          userId: user.id,
          user,
          token,
        })
      } else {
        // Quando usa cookies, só armazena os dados do usuário
        const { user } = response.data
        
        setAuthState({
          isAuthenticated: true,
          role: user.role,
          userId: user.id,
          user,
          token: null,
        })
      }
    } catch (error) {
      throw error
    }
  }

  const loginStudent = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login/student', { email, password })
      const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
      
      if (!useCookieAuth) {
        // Armazena token se não estiver usando cookies
        const { token, user } = response.data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        setAuthState({
          isAuthenticated: true,
          role: user.role,
          userId: user.id,
          user,
          token,
        })
      } else {
        // Quando usa cookies, só armazena os dados do usuário
        const { user } = response.data
        
        setAuthState({
          isAuthenticated: true,
          role: user.role,
          userId: user.id,
          user,
          token: null,
        })
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'
      
      if (useCookieAuth) {
        // Se usa cookies, chama endpoint de logout para limpar cookies
        await api.post('/auth/logout')
      }
      
      // Limpa armazenamento local
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Reseta estado de autenticação
      setAuthState(initialAuthState)
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
