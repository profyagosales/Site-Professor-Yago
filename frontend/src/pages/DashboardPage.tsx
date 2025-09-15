import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthStateProvider'
import { useNavigate, Link } from 'react-router-dom' // Importar Link
import api from '../services/api'
import { paths } from '../routes/paths'
import { Button } from '@/components/ui/button' // Importar Button
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Importar Card
import { Users, Book, FileText, CheckSquare } from 'lucide-react' // Importar ícones
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { DashboardMetricsWidget } from '@/components/dashboard/DashboardMetricsWidget'

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
  <OnboardingChecklist />
  {auth.role === 'teacher' && <DashboardMetricsWidget />}
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bem-vindo, {auth.user?.name || 'Usuário'}!
            </h1>
            <p className="text-gray-600 mb-4">
              {auth.role === 'teacher' ? 'Painel do Professor' : 'Painel do Aluno'}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Button
              onClick={handleLogout}
              variant="destructive"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Menu de Ações Rápidas */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {auth.role === 'teacher' && (
            <>
              <Link to={paths.gerenciarAlunos}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gerenciar Alunos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+</div>
                    <p className="text-xs text-muted-foreground">Adicionar e editar alunos</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={paths.gerenciarTurmas}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gerenciar Turmas</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+</div>
                    <p className="text-xs text-muted-foreground">Criar e editar turmas</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={paths.gerenciarTemas}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gerenciar Temas</CardTitle>
                    <Book className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+</div>
                    <p className="text-xs text-muted-foreground">Adicionar e editar temas</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={paths.revisarRedacoes}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revisar Redações</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">→</div>
                    <p className="text-xs text-muted-foreground">Corrigir redações enviadas</p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
          {auth.role === 'student' && (
            <>
              <Link to={paths.novaRedacao}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Enviar Nova Redação</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+</div>
                    <p className="text-xs text-muted-foreground">Enviar uma nova redação para correção</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={paths.minhasRedacoes}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minhas Redações</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">→</div>
                    <p className="text-xs text-muted-foreground">Ver minhas redações corrigidas</p>
                  </CardContent>
                </Card>
              </Link>
               <Link to={paths.verTemas}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ver Temas</CardTitle>
                    <Book className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">→</div>
                    <p className="text-xs text-muted-foreground">Consultar temas disponíveis</p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Suas informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teste de API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testApiConnection}
            >
              Testar Conexão com API
            </Button>
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
          </CardContent>
        </Card>
      </div>

      {auth.role === 'teacher' && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Painel do Professor</h2>
          <p className="text-gray-600">
            Esta é a área administrativa exclusiva para professores.
            Aqui você poderá gerenciar temas, redações e alunos.
          </p>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate(paths.gerenciarTemas)}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
            >
              Gerenciar Temas
            </button>
            <button 
              onClick={() => navigate(paths.revisarRedacoes)}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition"
            >
              Revisar Redações
            </button>
            <button 
              onClick={() => navigate(paths.gerenciarAlunos)}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition"
            >
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
            <button 
              onClick={() => navigate(paths.novaRedacao)}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
            >
              Nova Redação
            </button>
            <button 
              onClick={() => navigate(paths.minhasRedacoes)}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition"
            >
              Minhas Redações
            </button>
            <button 
              onClick={() => navigate(paths.verTemas)}
              className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
            >
              Ver Temas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
