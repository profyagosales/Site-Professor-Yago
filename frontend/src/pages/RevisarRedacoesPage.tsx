import { Link } from 'react-router-dom'
import { useState } from 'react'
import { paths } from '../routes/paths'

export function RevisarRedacoesPage() {
  // Estado para controlar a guia ativa
  const [activeTab, setActiveTab] = useState<'pendentes' | 'corrigidas'>('pendentes')

  // Dados fictícios para exemplo
  const redacoesPendentes = [
    {
      id: 1,
      aluno: {
        id: 101,
        nome: 'Maria Silva',
        turma: '3º Ano A',
        fotoUrl: null,
      },
      tema: 'Sustentabilidade e desenvolvimento econômico',
      tipo: 'ENEM',
      bimestre: 3,
      data: '01/09/2025',
    },
    {
      id: 2,
      aluno: {
        id: 102,
        nome: 'João Pereira',
        turma: '3º Ano B',
        fotoUrl: null,
      },
      tema: 'A influência das redes sociais na formação de opinião',
      tipo: 'PAS',
      bimestre: 3,
      data: '05/09/2025',
    },
    {
      id: 3,
      aluno: {
        id: 103,
        nome: 'Ana Beatriz',
        turma: '3º Ano A',
        fotoUrl: null,
      },
      tema: 'Desigualdade social no contexto da pandemia',
      tipo: 'ENEM',
      bimestre: 3,
      data: '07/09/2025',
    },
  ]
  
  const redacoesCorrigidas = [
    {
      id: 4,
      aluno: {
        id: 101,
        nome: 'Maria Silva',
        turma: '3º Ano A',
        fotoUrl: null,
      },
      tema: 'Os desafios da educação digital no Brasil',
      tipo: 'ENEM',
      bimestre: 2,
      data: '10/08/2025',
      nota: 800,
      enviado: true,
      dataEnvio: '12/08/2025',
    },
    {
      id: 5,
      aluno: {
        id: 104,
        nome: 'Pedro Oliveira',
        turma: '3º Ano C',
        fotoUrl: null,
      },
      tema: 'O papel da tecnologia na democratização do conhecimento',
      tipo: 'PAS',
      bimestre: 2,
      data: '15/08/2025',
      nota: 8.5,
      enviado: false,
      dataEnvio: null,
    },
  ]

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
              Pendentes ({redacoesPendentes.length})
            </button>
            <button
              className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'corrigidas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('corrigidas')}
            >
              Corrigidas ({redacoesCorrigidas.length})
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
                {redacoesPendentes.map((redacao) => (
                  <tr key={redacao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {redacao.aluno.fotoUrl ? (
                            <img 
                              src={redacao.aluno.fotoUrl} 
                              alt={redacao.aluno.nome} 
                              className="w-8 h-8 rounded-full object-cover" 
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {redacao.aluno.nome.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{redacao.aluno.nome}</div>
                          <div className="text-sm text-gray-500">{redacao.aluno.turma}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{redacao.tema}</td>
                    <td className="px-4 py-2 border text-center">{redacao.tipo}</td>
                    <td className="px-4 py-2 border text-center">{redacao.bimestre}º</td>
                    <td className="px-4 py-2 border text-center">{redacao.data}</td>
                    <td className="px-4 py-2 border text-center">
                      <Link 
                        to={`${paths.corrigirRedacao}/${redacao.id}`}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition inline-block"
                      >
                        Corrigir
                      </Link>
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
                {redacoesCorrigidas.map((redacao) => (
                  <tr key={redacao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {redacao.aluno.fotoUrl ? (
                            <img 
                              src={redacao.aluno.fotoUrl} 
                              alt={redacao.aluno.nome} 
                              className="w-8 h-8 rounded-full object-cover" 
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {redacao.aluno.nome.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{redacao.aluno.nome}</div>
                          <div className="text-sm text-gray-500">{redacao.aluno.turma}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{redacao.tema}</td>
                    <td className="px-4 py-2 border text-center">{redacao.tipo}</td>
                    <td className="px-4 py-2 border text-center font-medium">{redacao.nota}</td>
                    <td className="px-4 py-2 border text-center">
                      {redacao.enviado ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <div className="flex justify-center space-x-2">
                        <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition">
                          Ver PDF
                        </button>
                        {!redacao.enviado && (
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition">
                            Enviar
                          </button>
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
        {activeTab === 'pendentes' && redacoesPendentes.length === 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações pendentes de correção.</p>
          </div>
        )}
        
        {activeTab === 'corrigidas' && redacoesCorrigidas.length === 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações corrigidas.</p>
          </div>
        )}
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}