import { ReactNode, createContext, useContext, useState } from 'react'

type AuthState = {
  isAuthenticated: boolean
  role: 'student' | 'teacher' | null
  userId: string | null
}

type AuthContextType = {
  auth: AuthState
  setAuth: (auth: AuthState) => void
  logout: () => void
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  role: null,
  userId: null,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthStateProviderProps = {
  children: ReactNode
}

export function AuthStateProvider({ children }: AuthStateProviderProps) {
  const [auth, setAuthState] = useState<AuthState>(initialAuthState)

  const setAuth = (auth: AuthState) => {
    setAuthState(auth)
  }

  const logout = () => {
    setAuthState(initialAuthState)
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
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
