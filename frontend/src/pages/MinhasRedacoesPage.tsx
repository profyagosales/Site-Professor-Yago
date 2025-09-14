import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { paths } from '../routes/paths'
import { essayService } from '../services/essayService'
import toast, { Toaster } from 'react-hot-toast'

interface UIEssay {
  _id: string;
  theme: string;
  type: string;
  status: string;
  createdAt: string;
  finalGrade?: number;
  correctedPdfUrl?: string;
}

export function MinhasRedacoesPage() {
  const [essays, setEssays] = useState<UIEssay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await essayService.student.getMyEssays({ page:1, limit:50, status:'ALL' })
        const data: any[] = (res as any).essays || (res as any).data || []
        const mapped: UIEssay[] = data.map(e => ({
          _id: e._id,
          theme: e.themeId?.title || e.themeText || 'Tema não informado',
          type: e.type,
          status: e.status,
          createdAt: e.createdAt,
          finalGrade: e.enem?.rawScore || e.pas?.rawScore || e.finalGrade || undefined,
          correctedPdfUrl: e.correctedPdfUrl
        }))
        setEssays(mapped)
      } catch (err:any) {
        setError(err.message || 'Erro ao carregar redações')
        toast.error('Erro ao carregar redações')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  // Helper para mostrar o status em português
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente'
      case 'GRADING': return 'Em correção'
      case 'GRADED': return 'Corrigida'
      case 'SENT': return 'Enviada'
      default: return status
    }
  }

  // Helper para cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'GRADING': return 'bg-blue-100 text-blue-800'
      case 'GRADED': return 'bg-green-100 text-green-800'
      case 'SENT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Minhas Redações</h1>
          <div className="flex gap-2">
            <Link
              to={paths.novaRedacao}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              Nova Redação
            </Link>
            <Link
              to={paths.dashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        {loading && <div className="text-center py-8 text-gray-500">Carregando...</div>}
        {!loading && error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!loading && !error && essays.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border text-left">Tema</th>
                  <th className="px-4 py-2 border text-center">Tipo</th>
                  <th className="px-4 py-2 border text-center">Status</th>
                  <th className="px-4 py-2 border text-center">Data</th>
                  <th className="px-4 py-2 border text-center">Nota</th>
                  <th className="px-4 py-2 border text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {essays.map(e => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{e.theme}</td>
                    <td className="px-4 py-2 border text-center">{e.type}</td>
                    <td className="px-4 py-2 border text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(e.status)}`}>{getStatusLabel(e.status)}</span>
                    </td>
                    <td className="px-4 py-2 border text-center">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 border text-center">{e.finalGrade != null ? e.finalGrade : '-'}</td>
                    <td className="px-4 py-2 border text-center">
                      {['GRADED','SENT'].includes(e.status) && e.correctedPdfUrl && (
                        <a href={e.correctedPdfUrl} target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800 font-medium">Ver PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Você ainda não enviou nenhuma redação.</p>
            <Link
              to={paths.novaRedacao}
              className="mt-2 inline-block px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              Criar nova redação
            </Link>
          </div>
        )}
      </div>
      <Toaster position="top-center" />
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}