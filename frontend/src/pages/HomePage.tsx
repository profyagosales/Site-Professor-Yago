import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import { useAuth } from '../store/AuthStateProvider'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const { auth, isLoading } = useAuth()
  const navigate = useNavigate()
  
  // Se o usuário já estiver autenticado, redireciona para o dashboard
  useEffect(() => {
    if (!isLoading && auth.isAuthenticated) {
      navigate('/dashboard')
    }
  }, [auth.isAuthenticated, isLoading, navigate])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Portal do Professor Yago Sales
        </h1>
        
        <div className="space-y-4">
          <Link 
            to={paths.loginAluno} 
            className="block w-full py-3 px-4 text-center font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
          >
            Entrar como Aluno
          </Link>
          
          <Link 
            to={paths.loginProfessor}
            className="block w-full py-3 px-4 text-center font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition duration-200"
          >
            Entrar como Professor
          </Link>
        </div>
      </div>
    </div>
  )
}
