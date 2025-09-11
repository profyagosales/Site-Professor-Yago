import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function GerenciarTemasPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Gerenciar Temas</h1>
          <Link
            to={paths.dashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Esta página está em construção. Aqui você poderá gerenciar os temas para as redações.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Funcionalidades previstas:</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Criar novos temas de redação</li>
            <li>Editar temas existentes</li>
            <li>Definir textos de apoio e materiais</li>
            <li>Definir critérios de correção específicos</li>
            <li>Ativar/desativar disponibilidade de temas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}