import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function MinhasRedacoesPage() {
  // Dados fictícios para exemplificar a interface
  const redacoes = [
    {
      id: 1,
      tema: 'Os desafios da educação digital no Brasil',
      tipo: 'ENEM',
      status: 'CORRIGIDA',
      data: '10/08/2025',
      nota: 800,
      pdfUrl: '#',
    },
    {
      id: 2,
      tema: 'Sustentabilidade e desenvolvimento econômico',
      tipo: 'ENEM',
      status: 'EM_CORRECAO',
      data: '01/09/2025',
      nota: null,
      pdfUrl: null,
    },
    {
      id: 3,
      tema: 'A influência das redes sociais na formação de opinião',
      tipo: 'PAS',
      status: 'PENDENTE',
      data: '05/09/2025',
      nota: null,
      pdfUrl: null,
    },
  ]

  // Helper para mostrar o status em português
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente'
      case 'EM_CORRECAO':
        return 'Em correção'
      case 'CORRIGIDA':
        return 'Corrigida'
      default:
        return status
    }
  }

  // Helper para cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'EM_CORRECAO':
        return 'bg-blue-100 text-blue-800'
      case 'CORRIGIDA':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

        {redacoes.length > 0 ? (
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
                {redacoes.map((redacao) => (
                  <tr key={redacao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{redacao.tema}</td>
                    <td className="px-4 py-2 border text-center">{redacao.tipo}</td>
                    <td className="px-4 py-2 border text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(redacao.status)}`}>
                        {getStatusLabel(redacao.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 border text-center">{redacao.data}</td>
                    <td className="px-4 py-2 border text-center">{redacao.nota || '-'}</td>
                    <td className="px-4 py-2 border text-center">
                      {redacao.status === 'CORRIGIDA' && (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Ver PDF
                        </button>
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
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}