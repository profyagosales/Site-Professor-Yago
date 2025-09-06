import { Navigate, useLocation } from 'react-router-dom'
import { useRef } from 'react'
import { useAuth } from '../../store/AuthStateProvider'
import { paths } from '../../routes/paths'

type AuthGateProps = {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: Array<'student' | 'teacher'>
}

export function AuthGate({
  children,
  requireAuth = true,
  allowedRoles = ['student', 'teacher'],
}: AuthGateProps) {
  const { auth, isLoading } = useAuth()
  const location = useLocation()
  
  // Evita redirecionamentos em cascata em um único ciclo de renderização
  const redirectedRef = useRef(false)
  
  // Enquanto está carregando, mostra um indicador de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    )
  }
  
  // Se não precisa de autenticação, deixa passar
  if (!requireAuth) {
    return <>{children}</>
  }

  // Se precisa de auth e não está autenticado
  if (requireAuth && !auth.isAuthenticated) {
    if (redirectedRef.current) return null
    redirectedRef.current = true
    return <Navigate to={paths.home} state={{ from: location }} replace />
  }

  // Se precisa de auth específica por papel e não tem o papel certo
  if (
    requireAuth &&
    auth.isAuthenticated &&
    auth.user?.role &&
    !allowedRoles.includes(auth.user.role)
  ) {
    if (redirectedRef.current) return null
    redirectedRef.current = true
    return <Navigate to={paths.home} state={{ from: location }} replace />
  }

  // Passou em todas as verificações
  return <>{children}</>
}
