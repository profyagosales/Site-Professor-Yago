import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { paths } from '../routes/paths'
import { essayService, Essay } from '../services/essayService'
import toast, { Toaster } from 'react-hot-toast'

export function RevisarRedacoesPage() {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'corrigidas'>('pendentes')
  const [pending, setPending] = useState<Essay[]>([])
  const [graded, setGraded] = useState<Essay[]>([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [loadingGraded, setLoadingGraded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPending = async () => {
    setLoadingPending(true)
    try {
      const res = await essayService.professor.getPendingEssays({ page:1, limit:50 })
      // PaginatedResponse<Essay> definido como { essays, pagination } no backend? Ajustamos adaptando ambos formatos
      const data = (res as any).essays || (res as any).data || []
      setPending(data)
    } catch (e: any) {
      setError(e.message)
      toast.error('Erro ao carregar pendentes')
    } finally { setLoadingPending(false) }
  }
  const loadGraded = async () => {
    setLoadingGraded(true)
    try {
      const res = await essayService.professor.getGradedEssays({ page:1, limit:50 })
      const data = (res as any).essays || (res as any).data || []
      setGraded(data)
    } catch (e: any) {
      setError(e.message)
      toast.error('Erro ao carregar corrigidas')
    } finally { setLoadingGraded(false) }
  }

  useEffect(() => { loadPending(); loadGraded(); }, [])

  // Função para criar nova redação em nome do aluno
  const criarNovaRedacao = () => {
    console.log('Criar nova redação para aluno')
    // Implementar modal para seleção do aluno e upload de redação
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Revisar Redações</h1>
          <div className="flex gap-2">
            <button
              onClick={criarNovaRedacao}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              Cadastrar Redação
            </button>
            <Link
              to={paths.dashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex">
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'pendentes'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('pendentes')}
            >
              Pendentes ({loadingPending ? '...' : pending.length})
            </button>
            <button
              className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'corrigidas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('corrigidas')}
            >
              Corrigidas ({loadingGraded ? '...' : graded.length})
            </button>
          </nav>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todas as turmas</option>
                <option>3º Ano A</option>
                <option>3º Ano B</option>
                <option>3º Ano C</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bimestre</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos os bimestres</option>
                <option>1º Bimestre</option>
                <option>2º Bimestre</option>
                <option>3º Bimestre</option>
                <option>4º Bimestre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos os tipos</option>
                <option>ENEM</option>
                <option>PAS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de redações */}
        {activeTab === 'pendentes' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border text-left">Aluno</th>
                  <th className="px-4 py-2 border text-left">Tema</th>
                  <th className="px-4 py-2 border text-center">Tipo</th>
                  <th className="px-4 py-2 border text-center">Bimestre</th>
                  <th className="px-4 py-2 border text-center">Data</th>
                  <th className="px-4 py-2 border text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((redacao: any) => (
                  <tr key={redacao._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {(redacao as any).studentId?.photoUrl ? (
                            <img src={(redacao as any).studentId.photoUrl} alt={(redacao as any).studentId.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">{(redacao as any).studentId?.name?.split(' ').map((n:string)=>n[0]).join('')}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{(redacao as any).studentId?.name}</div>
                          <div className="text-sm text-gray-500">{(redacao as any).studentId?.class || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{(redacao as any).themeId?.title || redacao.themeText || 'Tema não informado'}</td>
                    <td className="px-4 py-2 border text-center">{redacao.type}</td>
                    <td className="px-4 py-2 border text-center">{redacao.bimester || redacao.bimestre || '—'}</td>
                    <td className="px-4 py-2 border text-center">{new Date(redacao.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 border text-center">
                      <Link to={`${paths.corrigirRedacao}/${redacao._id}`} className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition inline-block">Corrigir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'corrigidas' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border text-left">Aluno</th>
                  <th className="px-4 py-2 border text-left">Tema</th>
                  <th className="px-4 py-2 border text-center">Tipo</th>
                  <th className="px-4 py-2 border text-center">Nota</th>
                  <th className="px-4 py-2 border text-center">Enviado</th>
                  <th className="px-4 py-2 border text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {graded.map((redacao: any) => (
                  <tr key={redacao._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {(redacao as any).studentId?.photoUrl ? (
                            <img src={(redacao as any).studentId.photoUrl} alt={(redacao as any).studentId.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">{(redacao as any).studentId?.name?.split(' ').map((n:string)=>n[0]).join('')}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{(redacao as any).studentId?.name}</div>
                          <div className="text-sm text-gray-500">{(redacao as any).studentId?.class || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{(redacao as any).themeId?.title || redacao.themeText || 'Tema não informado'}</td>
                    <td className="px-4 py-2 border text-center">{redacao.type}</td>
                    <td className="px-4 py-2 border text-center font-medium">{redacao.enem?.rawScore || redacao.pas?.rawScore || redacao.finalGrade || '—'}</td>
                    <td className="px-4 py-2 border text-center">{redacao.status === 'SENT' ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-2 border text-center">
                      <div className="flex justify-center space-x-2">
                        <Link to={`${paths.corrigirRedacao}/${redacao._id}`} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition">Revisar</Link>
                        {redacao.status === 'SENT' ? (
                          <span className="text-xs text-green-600 font-medium">Enviado</span>
                        ) : (
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition">Enviar PDF</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensagem quando não há redações */}
        {activeTab === 'pendentes' && pending.length === 0 && !loadingPending && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações pendentes de correção.</p>
          </div>
        )}
        
        {activeTab === 'corrigidas' && graded.length === 0 && !loadingGraded && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações corrigidas.</p>
          </div>
        )}
        <Toaster position="top-center" />
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}