import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { paths } from '../routes/paths'
import { PDFViewer, Annotation } from '../components/redacao/PDFViewer'
import { AnnotationModal } from '../components/redacao/AnnotationModal'
import { AnnotationList } from '../components/redacao/AnnotationList'
import { essayService, Essay, APIAnnotation } from '../services/essayService'

// Gerador simples de ID único
const generateId = () => Math.random().toString(36).substring(2, 9)

// Função para converter entre os formatos de anotação API <-> UI
const mapApiAnnotationToUiAnnotation = (apiAnnotation: APIAnnotation): Annotation => {
  // Usando o primeiro retângulo como base para simplificar
  const rect = apiAnnotation.rects[0];
  return {
    id: generateId(),
    page: apiAnnotation.page,
    rect: { 
      x: rect.x, 
      y: rect.y, 
      width: rect.w, 
      height: rect.h 
    },
    color: getColorClass(apiAnnotation.category),
    category: apiAnnotation.category,
    comment: apiAnnotation.comment
  };
};

// Função para mapear categoria para classe de cor
const getColorClass = (category: string): string => {
  switch (category) {
    case 'formal': return 'bg-orange-500/30';
    case 'ortografia': return 'bg-green-500/30';
    case 'argumentacao': return 'bg-yellow-500/30';
    case 'geral': return 'bg-red-500/30';
    case 'coesao': return 'bg-blue-500/30';
    default: return 'bg-gray-500/30';
  }
};

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
  const navigate = useNavigate()
  
  // Estados para controle da página
  const [loading, setLoading] = useState(false)
  const [loadingEssay, setLoadingEssay] = useState(true)
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('formal')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [essay, setEssay] = useState<Essay | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  
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
  
  // Carregar dados da redação e anotações
  useEffect(() => {
    const fetchEssayData = async () => {
      if (!id) {
        setError('ID da redação não fornecido');
        setLoadingEssay(false);
        return;
      }
      
      try {
        setLoadingEssay(true);
        // Buscar dados da redação
        const essayData = await essayService.getEssayById(id);
        setEssay(essayData);
        
        // Configurar estados com base nos dados carregados
        if (essayData.type === 'ENEM' && essayData.enem) {
          setCompetencia1((essayData.enem.c1 || 0) as CompetenctScore);
          setCompetencia2((essayData.enem.c2 || 0) as CompetenctScore);
          setCompetencia3((essayData.enem.c3 || 0) as CompetenctScore);
          setCompetencia4((essayData.enem.c4 || 0) as CompetenctScore);
          setCompetencia5((essayData.enem.c5 || 0) as CompetenctScore);
        } else if (essayData.type === 'PAS' && essayData.pas) {
          setNc(essayData.pas.NC || 0);
          setNe(essayData.pas.NE || 0);
          setNl(essayData.pas.NL || 1);
        }
        
        if (essayData.annulment && essayData.annulment.active) {
          setAnnulmentReasons(essayData.annulment.reasons as AnnulmentReason[]);
        }
        
        if (essayData.generalComments) {
          setGeneralComments(essayData.generalComments);
        }
        
        if (typeof essayData.countInAverage !== 'undefined') {
          setCountInBimester(essayData.countInAverage);
        }
        
        if (essayData.bimester) {
          setBimesterValue(essayData.bimester);
        }
        
        // Buscar anotações
        const annotationsData = await essayService.getAnnotations(id);
        const uiAnnotations = annotationsData.highlights.map(mapApiAnnotationToUiAnnotation);
        setAnnotations(uiAnnotations);
        
        // Obter URL do PDF
        const token = await essayService.getFileToken(id);
        const fileUrl = essayService.getFileUrl(id, token);
        setPdfUrl(fileUrl);
        
      } catch (err) {
        console.error('Erro ao carregar dados da redação:', err);
        setError('Não foi possível carregar os dados da redação. Tente novamente mais tarde.');
      } finally {
        setLoadingEssay(false);
        setLoadingPdf(false);
      }
    };
    
    fetchEssayData();
  }, [id]);

  // Função para salvar a correção
  const handleSave = async () => {
    if (!essay || !id) return;
    
    setLoading(true);
    try {
      // Salvar anotações
      const apiAnnotations = {
        essayId: id,
        highlights: annotations.map(anno => ({
          page: anno.page,
          rects: [
            { 
              x: anno.rect.x, 
              y: anno.rect.y, 
              w: anno.rect.width, 
              h: anno.rect.height 
            }
          ],
          color: anno.color.replace('bg-', '').replace('/30', '').split('-')[0],
          category: anno.category,
          comment: anno.comment || ''
        })),
        comments: []
      };
      
      await essayService.updateAnnotations(id, apiAnnotations);
      
      // Salvar avaliação
      const gradeData = {
        type: essay.type,
        enem: essay.type === 'ENEM' ? {
          c1: competencia1,
          c2: competencia2,
          c3: competencia3,
          c4: competencia4,
          c5: competencia5
        } : undefined,
        pas: essay.type === 'PAS' ? {
          NC: nc,
          NE: ne,
          NL: nl
        } : undefined,
        annulment: {
          active: annulmentReasons.length > 0,
          reasons: annulmentReasons
        },
        generalComments,
        bimester: bimesterValue,
        countInAverage: countInBimester
      };
      
      await essayService.gradeEssay(id, gradeData);
      
      alert('Correção salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar correção:', err);
      alert('Ocorreu um erro ao salvar a correção. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para gerar PDF
  const handleGeneratePDF = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const result = await essayService.exportCorrectedPdf(id);
      
      // Abrir o PDF em uma nova aba
      if (result.url) {
        window.open(result.url, '_blank');
      }
      
      alert('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para enviar e-mail
  const handleSendEmail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const result = await essayService.sendEmailWithPdf(id);
      alert(result.message || 'E-mail enviado com sucesso!');
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
      alert('Ocorreu um erro ao enviar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Funções para gerenciar anotações
  const handleEditAnnotation = (annotationId: string) => {
    const annotation = annotations.find(anno => anno.id === annotationId);
    if (annotation) {
      setSelectedAnnotation(annotation);
      setIsModalOpen(true);
    }
  };
  
  const handleDeleteAnnotation = (annotationId: string) => {
    if (confirm('Tem certeza de que deseja excluir esta anotação?')) {
      setAnnotations(annotations.filter(anno => anno.id !== annotationId));
    }
  };
  
  const handleSaveAnnotation = (comment: string) => {
    if (selectedAnnotation) {
      setAnnotations(annotations.map(anno => 
        anno.id === selectedAnnotation.id 
          ? { ...anno, comment } 
          : anno
      ));
    }
  };
  
  // Função para adicionar uma anotação
  const handleAddAnnotation = (page: number, rect: { x: number; y: number; width: number; height: number }) => {
    const newAnnotation: Annotation = {
      id: generateId(),
      page,
      rect,
      color: getColorClass(activeCategory),
      category: activeCategory,
      comment: ''
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setSelectedAnnotation(newAnnotation);
    setIsModalOpen(true);
  };

  // Função para atualizar a página atual do PDF
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  // Mapa de categorias para o modelo da API
  const mapCategoryToApiCategory = (category: string): string => {
    switch (category) {
      case 'formal': return 'formal';
      case 'grammar': return 'ortografia';
      case 'argument': return 'argumentacao';
      case 'general': return 'geral';
      case 'cohesion': return 'coesao';
      default: return 'geral';
    }
  };
  
  // Categorias de marcação
  const categories = [
    { id: 'formal', name: 'Aspectos formais', color: 'bg-orange-500', textColor: 'text-orange-600', hoverColor: 'hover:bg-orange-100' },
    { id: 'grammar', name: 'Ortografia/gramática', color: 'bg-green-500', textColor: 'text-green-600', hoverColor: 'hover:bg-green-100' },
    { id: 'argument', name: 'Argumentação e estrutura', color: 'bg-yellow-500', textColor: 'text-yellow-600', hoverColor: 'hover:bg-yellow-100' },
    { id: 'general', name: 'Comentário geral', color: 'bg-red-500', textColor: 'text-red-600', hoverColor: 'hover:bg-red-100' },
    { id: 'cohesion', name: 'Coesão e coerência', color: 'bg-blue-500', textColor: 'text-blue-600', hoverColor: 'hover:bg-blue-100' },
  ];

  // Renderização para estados de carregamento ou erro
  if (loadingEssay) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600">Carregando dados da redação...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
          <svg className="h-12 w-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-lg font-medium text-red-800 mt-2">Erro ao carregar a redação</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={() => navigate(paths.revisarRedacoes)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar para a lista de redações
          </button>
        </div>
      </div>
    );
  }

  // Renderização principal
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
            onClick={handleSendEmail}
            disabled={loading}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            Enviar por E-mail
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
            {essay && essay.student && (
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
                  <p className="text-sm text-gray-500">{essay.student.class || 'Não especificada'}</p>
                </div>
              </div>
            )}
            <div className="text-sm text-gray-600">
              Tema: <span className="font-medium">
                {essay?.theme?.title || essay?.themeText || 'Não especificado'}
              </span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-3 mb-3">
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-1.5 text-xs rounded flex items-center transition-all ${
                    activeCategory === category.id
                      ? `${category.textColor} bg-opacity-20 ${category.color.replace('bg', 'ring')} ring-2 ring-offset-1 font-medium`
                      : `text-gray-600 ${category.hoverColor}`
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${category.color} opacity-60 mr-1.5`}></span>
                  {category.name}
                </button>
              ))}
            </div>
            
            <div className="text-xs text-gray-500 mb-3">
              Selecione o texto para adicionar uma anotação com a categoria selecionada
            </div>
          </div>
          
          {/* Componente de visualização do PDF */}
          <PDFViewer 
            pdfUrl={pdfUrl}
            annotations={annotations}
            activeCategory={activeCategory}
            onAddAnnotation={handleAddAnnotation}
            onPageChange={handlePageChange}
          />
        </div>
        
        {/* Painel lateral - Ocuparia 25-30% da largura */}
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-medium text-lg mb-3">Espelho de Correção</h3>
            
            {essay?.type === 'ENEM' ? (
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
                      {essay?.type === 'ENEM' 
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
          
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-medium text-lg mb-3">Comentários Gerais</h3>
            <textarea
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 h-32"
              placeholder="Adicione comentários gerais sobre a redação..."
            ></textarea>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-lg">Anotações na Página {currentPage}</h3>
              <span className="text-xs text-gray-500">
                {annotations.filter(anno => anno.page === currentPage).length} anotações
              </span>
            </div>
            <AnnotationList 
              annotations={annotations}
              currentPage={currentPage}
              onEditAnnotation={handleEditAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          </div>
        </div>
      </div>
      
      {/* Modal de comentários de anotação */}
      <AnnotationModal
        annotation={selectedAnnotation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAnnotation}
        categoryName={
          selectedAnnotation?.category === 'formal' ? 'Aspectos formais' :
          selectedAnnotation?.category === 'grammar' ? 'Ortografia/gramática' :
          selectedAnnotation?.category === 'argument' ? 'Argumentação e estrutura' :
          selectedAnnotation?.category === 'general' ? 'Comentário geral' :
          selectedAnnotation?.category === 'cohesion' ? 'Coesão e coerência' : ''
        }
      />
      
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}