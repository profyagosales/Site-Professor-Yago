import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function MinhasRedacoesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Minhas Redações</h1>
          <Link
            to={paths.dashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Esta página está em construção. Aqui você poderá visualizar suas redações enviadas e corrigidas.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Funcionalidades previstas:</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Histórico completo de redações enviadas</li>
            <li>Visualização do status de cada redação (enviada, em correção, corrigida)</li>
            <li>Acesso aos comentários e notas do professor</li>
            <li>Filtros por tema, data e nota</li>
            <li>Estatísticas de desempenho e progresso</li>
            <li>Comparação entre redações anteriores</li>
          </ul>
        </div>
      </div>
    </div>
  )
}