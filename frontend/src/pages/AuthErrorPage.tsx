import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import api from '../services/api'

type DiagnosticInfo = {
  cookies?: any;
  headers?: any;
  error?: string;
  status?: number;
  cookieTest?: any;
  cookieTestError?: string;
  cookieTestStatus?: number;
  diagnosticsOff?: boolean;
  cookieVariants?: any;
  cookieVariantsError?: string;
  cookieVariantsStatus?: number;
  environment?: any;
  environmentError?: any;
  cors?: any;
  corsError?: any;
  cookieDiagnostic?: any;
  cookieDiagnosticError?: any;
  timestamp?: string;
}

export function AuthErrorPage() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({})
  const [loading, setLoading] = useState(true)
  const [healthHistory, setHealthHistory] = useState<any[]>([])
  const [autoHealth, setAutoHealth] = useState(false)
  const [autoHealthTick, setAutoHealthTick] = useState(0)

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        setLoading(true)
        // Testar endpoint sem autenticação para diagnóstico
        const response = await api.get('/auth/me-test')
        setDiagnosticInfo({
          cookies: response.data.cookies,
          headers: response.data.headers
        })
      } catch (error: any) {
        console.error('Erro durante diagnóstico:', error)
        setDiagnosticInfo({
          error: error.message,
          status: error.response?.status
        })
      } finally {
        setLoading(false)
      }
    }

    runDiagnostics()
  }, [])

  const testCookie = async () => {
    try {
      const response = await api.get('/auth/health')
      setDiagnosticInfo(prev => ({
        ...prev,
        cookieTest: response.data
      }))
      setHealthHistory(prev => [response.data, ...prev].slice(0,10))
    } catch (error: any) {
      console.error('Erro ao testar cookies (health):', error)
      const status = error.response?.status
      const diagnosticsOff = status === 404
      setDiagnosticInfo(prev => ({
        ...prev,
        cookieTestError: diagnosticsOff ? 'Endpoint /auth/health não disponível (diagnóstico desativado?)' : error.message,
        cookieTestStatus: status,
        diagnosticsOff
      }))
    }
  }

  const runVariants = async () => {
    try {
      const res = await api.get('/auth/set-cookie-variants')
      setDiagnosticInfo(prev => ({ ...prev, cookieVariants: res.data }))
    } catch (e:any) {
      setDiagnosticInfo(prev => ({ ...prev, cookieVariantsError: e.message, cookieVariantsStatus: e.response?.status }))
    }
  }

  // Auto refresh de health
  useEffect(() => {
    if(!autoHealth) return;
    const id = setInterval(() => {
      setAutoHealthTick(t => t+1);
      testCookie();
    }, 5000);
    return () => clearInterval(id);
  }, [autoHealth]);

  const debugSession = async () => {
    try {
      const response = await api.get('/auth/debug-session')
      setDiagnosticInfo(prev => ({
        ...prev,
        sessionDebug: response.data
      }))
    } catch (error: any) {
      setDiagnosticInfo(prev => ({
        ...prev,
        sessionDebugError: error.message
      }))
    }
  }
  
  const runCompleteDiagnostic = async () => {
    setLoading(true)
    const results: Record<string, any> = {}
    
    try {
      // Testar configuração de ambiente
      const envResponse = await api.get('/diagnostics/environment')
      results.environment = envResponse.data
    } catch (error: any) {
      results.environmentError = {
        message: error.message,
        status: error.response?.status
      }
    }
    
    try {
      // Testar CORS
      const corsResponse = await api.get('/diagnostics/cors-test')
      results.cors = corsResponse.data
    } catch (error: any) {
      results.corsError = {
        message: error.message,
        status: error.response?.status
      }
    }
    
    try {
      // Teste detalhado de cookies
      const cookieResponse = await api.get('/diagnostics/cookie-diagnostic')
      results.cookieDiagnostic = cookieResponse.data
    } catch (error: any) {
      results.cookieDiagnosticError = {
        message: error.message,
        status: error.response?.status
      }
    }
    
    // Atualizar o estado com todos os resultados
    setDiagnosticInfo(prev => ({
      ...prev,
      ...results,
      timestamp: new Date().toISOString()
    }))
    
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <h1 className="text-2xl font-bold">Erro de Autenticação</h1>
            <p>Não foi possível autenticar seu acesso.</p>
          </div>

          <div className="flex flex-wrap justify-center space-x-2 space-y-2 sm:space-x-4">
            <Link
              to={paths.home}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Voltar à página inicial
            </Link>
            <button
              onClick={testCookie}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Testar Cookie (Health)
            </button>
            <button
              onClick={runVariants}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Cookie Variants
            </button>
            <button
              onClick={() => setAutoHealth(a=>!a)}
              className={`px-4 py-2 rounded transition ${autoHealth ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
            >
              Auto Health {autoHealth ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={runCompleteDiagnostic}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              Diagnóstico Completo
            </button>
            <button
              onClick={debugSession}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
            >
              Debug Sessão
            </button>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Informações de Diagnóstico</h2>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4">Executando diagnóstico...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                <h3 className="font-medium mb-2">Status:</h3>
                <pre className="text-sm whitespace-pre-wrap">
                  {diagnosticInfo.error ? (
                    <span className="text-red-600">
                      Erro: {diagnosticInfo.error} 
                      {diagnosticInfo.status ? ` (Status: ${diagnosticInfo.status})` : ''}
                    </span>
                  ) : (
                    <span className="text-green-600">Diagnóstico realizado com sucesso</span>
                  )}
                </pre>
              </div>

              {diagnosticInfo.environment && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Ambiente:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(diagnosticInfo.environment, null, 2)}
                  </pre>
                </div>
              )}

              {diagnosticInfo.cors && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">CORS:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(diagnosticInfo.cors, null, 2)}
                  </pre>
                </div>
              )}

              {diagnosticInfo.cookieTest && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Teste de Cookie:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(diagnosticInfo.cookieTest, null, 2)}
                  </pre>
                </div>
              )}
              {healthHistory.length > 1 && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Histórico Health (últimos {healthHistory.length}):</h3>
                  <pre className="text-xs whitespace-pre-wrap">
{healthHistory.map((h,i)=>`#${healthHistory.length - i} echoedBack=${h?.probe?.echoedBack} newValue=${h?.probe?.newValue} time=${h?.timestamp}`).join('\n')}
                  </pre>
                </div>
              )}
              {diagnosticInfo.cookieVariants && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Cookie Variants:</h3>
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(diagnosticInfo.cookieVariants, null, 2)}</pre>
                </div>
              )}
              {diagnosticInfo.cookieVariantsError && (
                <div className="p-4 bg-red-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2 text-red-700">Cookie Variants (Erro):</h3>
                  <pre className="text-sm whitespace-pre-wrap text-red-700">{diagnosticInfo.cookieVariantsError} {diagnosticInfo.cookieVariantsStatus ? `(Status: ${diagnosticInfo.cookieVariantsStatus})` : ''}</pre>
                </div>
              )}
              {diagnosticInfo.cookieTestError && (
                <div className="p-4 bg-red-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2 text-red-700">Teste de Cookie (Erro):</h3>
                  <pre className="text-sm whitespace-pre-wrap text-red-700">
                    {diagnosticInfo.cookieTestError} {diagnosticInfo.cookieTestStatus ? `(Status: ${diagnosticInfo.cookieTestStatus})` : ''}
                  </pre>
                  {diagnosticInfo.diagnosticsOff && (
                    <p className="text-xs mt-2 text-red-600">Rotas de diagnóstico podem estar desativadas. Defina DIAGNOSTICS_ENABLED=true no backend para habilitar.</p>
                  )}
                </div>
              )}
              
              {diagnosticInfo.cookieDiagnostic && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Diagnóstico de Cookie:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(diagnosticInfo.cookieDiagnostic, null, 2)}
                  </pre>
                </div>
              )}
              
              {diagnosticInfo.cookies && (
                <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                  <h3 className="font-medium mb-2">Cookies:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(diagnosticInfo.cookies, null, 2)}
                  </pre>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                <h3 className="font-medium mb-2">Configurações API:</h3>
                <pre className="text-sm whitespace-pre-wrap">
API Base URL: {api.defaults.baseURL}
withCredentials: {api.defaults.withCredentials ? 'true' : 'false'}
                </pre>
              </div>
              
              <div className="text-center mt-6">
                <p className="text-gray-600 text-sm">
                  Se o problema persistir, tente limpar os cookies do seu navegador e fazer login novamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
