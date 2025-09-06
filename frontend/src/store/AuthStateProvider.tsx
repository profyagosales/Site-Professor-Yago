import { ReactNode, createContext, useContext, useState, useEffect } from 'react'
import api, { setAuthToken } from '../services/api'

type User = {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher'
  photoUrl?: string | null
}

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

type LoginCredentials = {
  email: string
  password: string
}

type LoginResponse = {
  token: string
  user: User
}

type AuthContextType = {
  auth: AuthState
  loginTeacher: (credentials: LoginCredentials) => Promise<void>
  loginStudent: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
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

  // Bootstrap - recuperar estado da autenticação do localStorage
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          // Validar token com a API
          const { data } = await api.get('/auth/me')
          
          setAuthState({
            isAuthenticated: true,
            user: data,
            token
          })
          
          setAuthToken(token)
        }
      } catch (error) {
        // Token inválido ou expirado - limpar localStorage
        console.error('Erro ao validar token:', error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    bootstrapAsync()
  }, [])

  // Login para professores
  const loginTeacher = async (credentials: LoginCredentials) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login-teacher', credentials)
      
      const { token, user } = data
      
      setAuthState({
        isAuthenticated: true,
        user,
        token
      })
      
      setAuthToken(token)
    } catch (error) {
      throw error
    }
  }

  // Login para alunos
  const loginStudent = async (credentials: LoginCredentials) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login-student', credentials)
      
      const { token, user } = data
      
      setAuthState({
        isAuthenticated: true,
        user,
        token
      })
      
      setAuthToken(token)
    } catch (error) {
      throw error
    }
  }

  // Logout
  const logout = () => {
    setAuthState(initialAuthState)
    setAuthToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ auth, loginTeacher, loginStudent, logout, isLoading }}>
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
