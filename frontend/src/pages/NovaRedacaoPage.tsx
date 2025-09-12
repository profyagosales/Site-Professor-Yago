import { Link, Navigate } from 'react-router-dom'
import { paths } from '../routes/paths'
import { useState, useEffect } from 'react'
import { essayService } from '../services/essayService'
import { useAuth } from '../store/AuthStateProvider'

export function NovaRedacaoPage() {
  // Estados de autenticação
  const { auth, isLoading } = useAuth()
  const [temasCarregados, setTemasCarregados] = useState([])
  
  // Estados
  const [tipoRedacao, setTipoRedacao] = useState<'ENEM' | 'PAS'>('ENEM')
  const [temaId, setTemaId] = useState('')
  const [temaPersonalizado, setTemaPersonalizado] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  
  // Verificar se o usuário está autenticado
  if (!isLoading && !auth.isAuthenticated) {
    return <Navigate to={paths.loginAluno} />
  }
  
  // Dados fictícios de temas disponíveis
  const temas = [
    { id: '1', titulo: 'Os desafios da educação digital no Brasil', ativo: true },
    { id: '2', titulo: 'Sustentabilidade e desenvolvimento econômico', ativo: true },
    { id: '3', titulo: 'A influência das redes sociais na formação de opinião', ativo: true },
    { id: '4', titulo: 'Desigualdade social no contexto da pandemia', ativo: true },
    { id: '5', titulo: 'O papel da tecnologia na democratização do conhecimento', ativo: true },
  ]

  // Handler para o upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // Validação do tipo de arquivo (apenas PDF)
      if (file.type !== 'application/pdf') {
        setErro('Por favor, selecione apenas arquivos PDF.')
        setArquivo(null)
        return
      }
      
      // Validação do tamanho (máx. 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErro('O arquivo deve ter no máximo 5MB.')
        setArquivo(null)
        return
      }
      
      setArquivo(file)
      setErro('')
    }
  }

  // Handler para o envio da redação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Iniciando processo de envio de redação')
    
    // Validações
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo PDF da sua redação.')
      return
    }
    
    if (temaId === 'outro' && !temaPersonalizado.trim()) {
      setErro('Por favor, informe o tema personalizado da sua redação.')
      return
    }
    
    if (!temaId) {
      setErro('Por favor, selecione um tema para a sua redação.')
      return
    }
    
    // Começar envio real
    setEnviando(true)
    setErro('')
    
    console.log('Enviando arquivo:', arquivo.name, 'Tamanho:', arquivo.size)
    
    try {
      // 1. Primeiro fazer o upload do arquivo
      console.log('Iniciando upload do arquivo...')
      const fileUploadResult = await essayService.uploadEssayFile(arquivo)
      console.log('Upload concluído com sucesso:', fileUploadResult)
      
      // 2. Depois criar a redação com o URL do arquivo enviado
      console.log('Criando redação com os seguintes dados:', {
        type: tipoRedacao,
        themeId: temaId === 'outro' ? undefined : temaId,
        themeText: temaId === 'outro' ? temaPersonalizado : undefined
      })
      
      const novaRedacao = await essayService.createEssay({
        type: tipoRedacao,
        themeId: temaId === 'outro' ? undefined : temaId,
        themeText: temaId === 'outro' ? temaPersonalizado : undefined,
        file: {
          originalUrl: fileUploadResult.url,
          mime: fileUploadResult.mime,
          size: fileUploadResult.size,
          pages: fileUploadResult.pages
        }
      })
      
      console.log('Redação criada com sucesso:', novaRedacao)
      
      // 3. Redirecionar para a página de redações após o envio
      console.log('Redirecionando para a página de minhas redações...')
      window.location.href = paths.minhasRedacoes
    } catch (error: any) {
      console.error('Erro ao enviar redação:', error)
      if (error.response) {
        console.error('Resposta do servidor:', error.response.data)
        console.error('Status do erro:', error.response.status)
        console.error('Headers:', error.response.headers)
        setErro(`Erro do servidor: ${error.response.status} - ${error.response.data.message || 'Erro desconhecido'}`)
      } else if (error.request) {
        console.error('Sem resposta do servidor:', error.request)
        setErro('Não foi possível se comunicar com o servidor. Verifique sua conexão.')
      } else {
        console.error('Erro de configuração:', error.message)
        setErro(`Erro: ${error.message || 'Desconhecido'}`)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nova Redação</h1>
          <Link
            to={paths.dashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo de redação */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Tipo de redação</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipoRedacao"
                  value="ENEM"
                  checked={tipoRedacao === 'ENEM'}
                  onChange={() => setTipoRedacao('ENEM')}
                  className="mr-2"
                />
                <span>ENEM</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipoRedacao"
                  value="PAS"
                  checked={tipoRedacao === 'PAS'}
                  onChange={() => setTipoRedacao('PAS')}
                  className="mr-2"
                />
                <span>PAS</span>
              </label>
            </div>
          </div>
          
          {/* Tema */}
          <div className="mb-6">
            <label htmlFor="tema" className="block text-gray-700 font-medium mb-2">
              Tema da redação
            </label>
            <select
              id="tema"
              value={temaId}
              onChange={(e) => setTemaId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecione um tema</option>
              {temas.map((tema) => (
                <option key={tema.id} value={tema.id}>
                  {tema.titulo}
                </option>
              ))}
              <option value="outro">Outro tema (não listado)</option>
            </select>
          </div>
          
          {/* Tema personalizado */}
          {temaId === 'outro' && (
            <div className="mb-6">
              <label htmlFor="temaPersonalizado" className="block text-gray-700 font-medium mb-2">
                Informe o tema
              </label>
              <input
                type="text"
                id="temaPersonalizado"
                value={temaPersonalizado}
                onChange={(e) => setTemaPersonalizado(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Descreva o tema da sua redação"
              />
            </div>
          )}
          
          {/* Upload de arquivo */}
          <div className="mb-6">
            <label htmlFor="arquivo" className="block text-gray-700 font-medium mb-2">
              Arquivo da redação (PDF)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                id="arquivo"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="arquivo"
                className="block cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center py-3">
                  <svg
                    className="w-10 h-10 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>
                  <p className="text-gray-600 mb-1">
                    {arquivo ? arquivo.name : 'Clique para selecionar um arquivo PDF'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Tamanho máximo: 5MB
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Erro */}
          {erro && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {erro}
            </div>
          )}
          
          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Link
              to={paths.minhasRedacoes}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition flex items-center gap-2"
              disabled={enviando}
            >
              {enviando && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {enviando ? 'Enviando...' : 'Enviar Redação'}
            </button>
          </div>
        </form>
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}