import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { paths } from '../routes/paths'

// Tipos
type AnnotationType = {
  id: string
  page: number
  rect: { x: number; y: number; width: number; height: number }
  color: string
  category: string
  comment: string
  createdBy: string
  createdAt: string
}

type CompetenctScore = 0 | 40 | 80 | 120 | 160 | 200

type AnnulmentReason = 
  | 'identificacao' 
  | 'desenhos' 
  | 'sinais' 
  | 'parteDesconectada' 
  | 'copiaIntegral' 
  | 'menosDeSeteLinha'

export function CorrigirRedacaoPage() {
  const { id } = useParams<{ id: string }>()
  
  // Estados para controle da página
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('formal')
  const [annotations, setAnnotations] = useState<AnnotationType[]>([])
  
  // Estados para avaliação ENEM
  const [competencia1, setCompetencia1] = useState<CompetenctScore>(0)
  const [competencia2, setCompetencia2] = useState<CompetenctScore>(0)
  const [competencia3, setCompetencia3] = useState<CompetenctScore>(0)
  const [competencia4, setCompetencia4] = useState<CompetenctScore>(0)
  const [competencia5, setCompetencia5] = useState<CompetenctScore>(0)
  
  // Estados para PAS
  const [nc, setNc] = useState<number>(0) // Nota de conteúdo
  const [ne, setNe] = useState<number>(0) // Número de erros
  const [nl, setNl] = useState<number>(0) // Número de linhas
  
  // Estado para anulação
  const [annulmentReasons, setAnnulmentReasons] = useState<AnnulmentReason[]>([])
  
  // Estado para comentários gerais
  const [generalComments, setGeneralComments] = useState<string>('')
  
  // Estado para controle do bimestre
  const [countInBimester, setCountInBimester] = useState<boolean>(true)
  const [bimesterValue, setBimesterValue] = useState<number>(2.0)
  
  // Calcular notas
  const rawScoreENEM = competencia1 + competencia2 + competencia3 + competencia4 + competencia5
  const rawScorePAS = annulmentReasons.length > 0 ? 0 : Math.max(0, nc - 2 * ne / (nl || 1))
  
  // Placeholder para dados da redação (em uma aplicação real, isso viria da API)
  const essay = {
    id: id || '1',
    student: {
      id: '101',
      name: 'Maria Silva',
      class: '3º Ano A',
      photoUrl: null,
    },
    theme: 'Sustentabilidade e desenvolvimento econômico',
    type: 'ENEM',
    bimester: 3,
    date: '01/09/2025',
    pdfUrl: '/caminho/para/arquivo.pdf', // Isso seria o URL real do PDF
    pages: 2,
  }

  // Função para salvar a correção
  const handleSave = () => {
    setLoading(true)
    
    // Aqui seria a chamada para a API real
    setTimeout(() => {
      setLoading(false)
      alert('Correção salva com sucesso!')
    }, 1000)
  }
  
  // Função para gerar PDF
  const handleGeneratePDF = () => {
    setLoading(true)
    
    // Aqui seria a chamada para a API real
    setTimeout(() => {
      setLoading(false)
      alert('PDF gerado com sucesso!')
    }, 2000)
  }
  
  // Categorias de marcação
  const categories = [
    { id: 'formal', name: 'Aspectos formais', color: 'bg-orange-500' },
    { id: 'grammar', name: 'Ortografia/gramática', color: 'bg-green-500' },
    { id: 'argument', name: 'Argumentação e estrutura', color: 'bg-yellow-500' },
    { id: 'general', name: 'Comentário geral', color: 'bg-red-500' },
    { id: 'cohesion', name: 'Coesão e coerência', color: 'bg-blue-500' },
  ]

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Corrigir Redação</h1>
        <div className="flex gap-2">
          <button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Gerar PDF Corrigido
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Salvar Correção
          </button>
          <Link
            to={paths.revisarRedacoes}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Área do PDF - Ocuparia 70-75% da largura */}
        <div className="md:w-3/4 bg-white rounded-lg shadow-md p-4 h-[800px] border-2 border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                {essay.student.photoUrl ? (
                  <img 
                    src={essay.student.photoUrl} 
                    alt={essay.student.name} 
                    className="w-8 h-8 rounded-full object-cover" 
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-700">
                    {essay.student.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium">{essay.student.name}</h3>
                <p className="text-sm text-gray-500">{essay.student.class}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Tema: <span className="font-medium">{essay.theme}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-3 mb-3">
            <div className="flex space-x-2 mb-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-2 py-1 text-xs rounded flex items-center ${
                    activeCategory === category.id
                      ? `ring-2 ring-offset-1 ${category.color.replace('bg', 'ring')}`
                      : ''
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${category.color} opacity-60 mr-1`}></span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Aqui seria o componente de visualização do PDF */}
          <div className="bg-gray-100 h-[650px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mb-2">
                Visualizador de PDF seria integrado aqui
              </p>
              <p className="text-sm">
                Para interface completa: usar biblioteca como react-pdf ou pdfjs-dist
              </p>
            </div>
          </div>
        </div>
        
        {/* Painel lateral - Ocuparia 25-30% da largura */}
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-medium text-lg mb-3">Espelho de Correção</h3>
            
            {essay.type === 'ENEM' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competência 1 - Domínio da norma padrão
                  </label>
                  <div className="flex space-x-1">
                    {[0, 40, 80, 120, 160, 200].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCompetencia1(value as CompetenctScore)}
                        className={`px-2 py-1 rounded text-xs flex-1 ${
                          competencia1 === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competência 2 - Compreensão do tema
                  </label>
                  <div className="flex space-x-1">
                    {[0, 40, 80, 120, 160, 200].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCompetencia2(value as CompetenctScore)}
                        className={`px-2 py-1 rounded text-xs flex-1 ${
                          competencia2 === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competência 3 - Argumentação
                  </label>
                  <div className="flex space-x-1">
                    {[0, 40, 80, 120, 160, 200].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCompetencia3(value as CompetenctScore)}
                        className={`px-2 py-1 rounded text-xs flex-1 ${
                          competencia3 === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competência 4 - Coesão textual
                  </label>
                  <div className="flex space-x-1">
                    {[0, 40, 80, 120, 160, 200].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCompetencia4(value as CompetenctScore)}
                        className={`px-2 py-1 rounded text-xs flex-1 ${
                          competencia4 === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competência 5 - Proposta de intervenção
                  </label>
                  <div className="flex space-x-1">
                    {[0, 40, 80, 120, 160, 200].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCompetencia5(value as CompetenctScore)}
                        className={`px-2 py-1 rounded text-xs flex-1 ${
                          competencia5 === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium">Nota total:</span>
                    <span className="text-blue-600 font-bold">{rawScoreENEM}/1000</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="nc" className="block text-sm font-medium text-gray-700 mb-1">
                    NC - Nota de Conteúdo (0-10)
                  </label>
                  <input
                    type="number"
                    id="nc"
                    min="0"
                    max="10"
                    step="0.5"
                    value={nc}
                    onChange={(e) => setNc(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="ne" className="block text-sm font-medium text-gray-700 mb-1">
                    NE - Número de Erros
                  </label>
                  <input
                    type="number"
                    id="ne"
                    min="0"
                    value={ne}
                    onChange={(e) => setNe(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="nl" className="block text-sm font-medium text-gray-700 mb-1">
                    NL - Número de Linhas
                  </label>
                  <input
                    type="number"
                    id="nl"
                    min="1"
                    value={nl}
                    onChange={(e) => setNl(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium">NR = NC - 2×NE/NL</span>
                    <span className="text-blue-600 font-bold">{rawScorePAS.toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-medium text-lg mb-3">Motivos para Anulação</h3>
            <div className="space-y-2">
              {[
                { id: 'identificacao', label: 'Identificação' },
                { id: 'desenhos', label: 'Desenhos' },
                { id: 'sinais', label: 'Sinais' },
                { id: 'parteDesconectada', label: 'Parte desconectada' },
                { id: 'copiaIntegral', label: 'Cópia integral' },
                { id: 'menosDeSeteLinha', label: 'Menos de 7 linhas' },
              ].map((reason) => (
                <div key={reason.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={reason.id}
                    checked={annulmentReasons.includes(reason.id as AnnulmentReason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAnnulmentReasons([...annulmentReasons, reason.id as AnnulmentReason])
                      } else {
                        setAnnulmentReasons(annulmentReasons.filter(r => r !== reason.id))
                      }
                    }}
                    className="mr-2"
                  />
                  <label htmlFor={reason.id} className="text-sm">
                    {reason.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-medium text-lg mb-3">Nota Bimestral</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="countInBimester"
                  checked={countInBimester}
                  onChange={(e) => setCountInBimester(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="countInBimester" className="text-sm">
                  Contar no bimestre
                </label>
              </div>
              
              {countInBimester && (
                <div>
                  <label htmlFor="bimesterValue" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor da nota (pontos):
                  </label>
                  <input
                    type="number"
                    id="bimesterValue"
                    min="0"
                    step="0.5"
                    value={bimesterValue}
                    onChange={(e) => setBimesterValue(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </div>
              )}
              
              {countInBimester && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium">Nota bimestral:</span>
                    <span className="text-blue-600 font-bold">
                      {essay.type === 'ENEM' 
                        ? ((rawScoreENEM / 1000) * bimesterValue).toFixed(1)
                        : ((rawScorePAS / 10) * bimesterValue).toFixed(1)
                      }
                      /{bimesterValue.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-medium text-lg mb-3">Comentários Gerais</h3>
            <textarea
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 h-32"
              placeholder="Adicione comentários gerais sobre a redação..."
            ></textarea>
          </div>
        </div>
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}