import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthStateProvider'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export function DashboardPage() {
  const { auth, logout, isLoading } = useAuth()
  const navigate = useNavigate()
  const [apiTestResult, setApiTestResult] = useState<string | null>(null)
  
  // Se não estiver autenticado, redireciona para a página inicial
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/')
    }
  }, [auth.isAuthenticated, isLoading, navigate])

  const testApiConnection = async () => {
    try {
      setApiTestResult('Testando conexão...')
      const response = await api.get('/auth/me')
      setApiTestResult(`Sucesso! Conectado como: ${response.data.name}`)
    } catch (error: any) {
      console.error('Erro ao testar API:', error)
      setApiTestResult(`Erro: ${error.message || 'Falha na conexão'}`)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bem-vindo, {auth.user?.name || 'Usuário'}!
            </h1>
            <p className="text-gray-600 mb-4">
              {auth.role === 'teacher' ? 'Acesso de Professor' : 'Acesso de Aluno'}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Suas informações</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Nome:</span> {auth.user?.name}</p>
            <p><span className="font-medium">Email:</span> {auth.user?.email}</p>
            <p><span className="font-medium">Função:</span> {auth.role === 'teacher' ? 'Professor' : 'Aluno'}</p>
            {auth.user?.photoUrl && (
              <div className="mt-4">
                <span className="font-medium">Foto de perfil:</span>
                <img 
                  src={auth.user.photoUrl} 
                  alt="Foto de perfil" 
                  className="w-20 h-20 rounded-full mt-2 object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Teste de API</h2>
          <div className="space-y-4">
            <button
              onClick={testApiConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Testar conexão com API
            </button>
            
            {apiTestResult && (
              <div className={`mt-4 p-4 rounded ${
                apiTestResult.includes('Sucesso') 
                  ? 'bg-green-100 text-green-800' 
                  : apiTestResult.includes('Erro') 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
              }`}>
                {apiTestResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {auth.role === 'teacher' && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Painel do Professor</h2>
          <p className="text-gray-600">
            Esta é a área administrativa exclusiva para professores.
            Aqui você poderá gerenciar temas, redações e alunos.
          </p>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition">
              Gerenciar Temas
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition">
              Revisar Redações
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition">
              Gerenciar Alunos
            </button>
          </div>
        </div>
      )}

      {auth.role === 'student' && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Painel do Aluno</h2>
          <p className="text-gray-600">
            Aqui você pode enviar suas redações para correção e visualizar 
            os comentários e notas das suas redações anteriores.
          </p>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition">
              Nova Redação
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition">
              Minhas Redações
            </button>
            <button className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition">
              Ver Temas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
