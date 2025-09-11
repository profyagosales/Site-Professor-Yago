import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function VerTemasPage() {
  // Dados fictícios para exemplo
  const temas = [
    {
      id: '1',
      titulo: 'Os desafios da educação digital no Brasil',
      categoria: 'Educação',
      tipo: 'ENEM',
      dataCriacao: '15/07/2025',
    },
    {
      id: '2',
      titulo: 'Sustentabilidade e desenvolvimento econômico',
      categoria: 'Meio Ambiente',
      tipo: 'ENEM',
      dataCriacao: '20/07/2025',
    },
    {
      id: '3',
      titulo: 'A influência das redes sociais na formação de opinião',
      categoria: 'Tecnologia',
      tipo: 'ENEM',
      dataCriacao: '01/08/2025',
    },
    {
      id: '4',
      titulo: 'Desigualdade social no contexto da pandemia',
      categoria: 'Sociedade',
      tipo: 'PAS',
      dataCriacao: '10/08/2025',
    },
    {
      id: '5',
      titulo: 'O papel da tecnologia na democratização do conhecimento',
      categoria: 'Tecnologia',
      tipo: 'PAS',
      dataCriacao: '15/08/2025',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Temas de Redação</h1>
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

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3">
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                id="categoria"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas as categorias</option>
                <option>Educação</option>
                <option>Meio Ambiente</option>
                <option>Tecnologia</option>
                <option>Sociedade</option>
              </select>
            </div>
            <div className="md:w-1/3">
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                id="tipo"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option>ENEM</option>
                <option>PAS</option>
              </select>
            </div>
            <div className="md:w-1/3">
              <label htmlFor="pesquisa" className="block text-sm font-medium text-gray-700 mb-1">
                Pesquisar
              </label>
              <input
                type="text"
                id="pesquisa"
                placeholder="Buscar por palavra-chave"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Lista de temas */}
        <div className="space-y-4">
          {temas.map((tema) => (
            <div 
              key={tema.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{tema.titulo}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                      </svg>
                      {tema.categoria}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      {tema.tipo}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      {tema.dataCriacao}
                    </span>
                  </div>
                </div>
                <div>
                  <Link
                    to={`${paths.novaRedacao}?tema=${tema.id}`}
                    className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    Iniciar Redação
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}