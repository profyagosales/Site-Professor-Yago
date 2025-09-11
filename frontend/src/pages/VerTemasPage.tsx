import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function VerTemasPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Ver Temas</h1>
          <Link
            to={paths.dashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Esta página está em construção. Aqui você poderá explorar os temas disponíveis para redação.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Funcionalidades previstas:</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Lista de temas disponíveis para redação</li>
            <li>Detalhes de cada tema com textos motivadores</li>
            <li>Materiais de apoio e referências</li>
            <li>Filtros por categorias e tópicos</li>
            <li>Visualização de temas anteriores e modelos</li>
            <li>Iniciar nova redação a partir de um tema selecionado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}