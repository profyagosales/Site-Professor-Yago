import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import CorrectionHeader from '../components/correcao/CorrectionHeader';
import PDFViewerWithHighlights from '../components/correcao/PDFViewerWithHighlights';
import CorrectionToolbar from '../components/correcao/CorrectionToolbar';
import AnnotationsPanel from '../components/correcao/AnnotationsPanel';
import AnnotationModal from '../components/correcao/AnnotationModal';
import { 
  getEssayById, 
  Essay, 
  APIAnnotation,
  FrontendAnnotation,
  EnemCorrection, 
  PasCorrection,
  CorrectionData,
  saveCorrection,
  generateCorrectedPdf
} from '../services/essayService';
import { getFileUrl } from '../services/essayService';
import { CorrectionCategory, CORRECTION_CATEGORIES } from '../constants/correction';

const CorrectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CorrectionCategory>(CORRECTION_CATEGORIES[0]);
  const [annotations, setAnnotations] = useState<FrontendAnnotation[]>([]);
  const [editingAnnotation, setEditingAnnotation] = useState<FrontendAnnotation | null>(null);
  const [enemScores, setEnemScores] = useState<EnemCorrection>({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const [pasScores, setPasScores] = useState<PasCorrection>({ arg: 0, type: 0, lang: 0 });
  const [generalComments, setGeneralComments] = useState('');

  // Calcula a nota final dinamicamente
  const finalGrade = useMemo(() => {
    if (essay?.type === 'ENEM') {
      return Object.values(enemScores).reduce((sum, score) => sum + score, 0);
    }
    if (essay?.type?.startsWith('PAS')) {
        const { arg, type, lang } = pasScores;
        // Fórmula PAS: (Argumentação * 2 + Tipo Textual * 2 + Ling. Portuguesa) / 5
        return ((arg * 2) + (type * 2) + lang) / 5;
    }
    return 0;
  }, [essay?.type, enemScores, pasScores]);


  useEffect(() => {
    if (id) {
      const promise = getEssayById(id);
      toast.promise(promise, {
        loading: 'Carregando redação...',
        success: (data) => {
          setEssay(data);
          // Carregar dados de correção salvos
          if (data.annotations) {
            setAnnotations(data.annotations.map((ann, index) => ({ ...ann, id: `saved-${index}` })));
          }
          if (data.enemScores) setEnemScores(data.enemScores);
          if (data.pasScores) setPasScores(data.pasScores);
          if (data.generalComments) setGeneralComments(data.generalComments);
          return 'Redação carregada!';
        },
        error: (err) => {
          console.error('Erro ao buscar redação:', err);
          setError('Não foi possível carregar a redação.');
          return 'Erro ao carregar redação.';
        }
      });
    }
  }, [id]);

  const handleAddAnnotation = (newAnnotationData: Omit<FrontendAnnotation, 'id' | 'comment'>) => {
    const newAnnotation: FrontendAnnotation = { 
      ...newAnnotationData, 
      id: `temp-${Date.now()}`,
      comment: '' // Inicia com comentário vazio
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setEditingAnnotation(newAnnotation); // Abre o modal para adicionar o comentário
  };

  const handleSaveComment = (annotationId: string, commentText: string) => {
    setAnnotations(prev => 
      prev.map(a => a.id === annotationId ? { ...a, comment: commentText } : a)
    );
    setEditingAnnotation(null);
  };

  const handleCorrectionChange = (data: Partial<EnemCorrection> | Partial<PasCorrection>) => {
    if (essay?.type === 'ENEM') {
      setEnemScores(prev => ({ ...prev, ...(data as Partial<EnemCorrection>) }));
    } else {
      setPasScores(prev => ({ ...prev, ...(data as Partial<PasCorrection>) }));
    }
  };

  // Função para coletar todos os dados da correção do estado atual
  const getCorrectionData = (): CorrectionData => {
    // Remove o 'id' temporário do frontend antes de enviar para o backend
    const apiAnnotations: APIAnnotation[] = annotations.map(({ id, ...rest }) => rest);

    return {
      annotations: apiAnnotations,
      generalComments,
      enemScores: essay?.type === 'ENEM' ? enemScores : undefined,
      pasScores: essay?.type?.startsWith('PAS') ? pasScores : undefined,
      finalGrade,
    };
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    setIsSaving(true);
    const correctionData = getCorrectionData();
    
    const promise = saveCorrection(id, correctionData);

    toast.promise(promise, {
      loading: 'Salvando rascunho...',
      success: 'Rascunho salvo com sucesso!',
      error: 'Erro ao salvar rascunho.',
    });

    try {
      await promise;
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    setIsGeneratingPdf(true);
    const correctionData = getCorrectionData();

    const promise = generateCorrectedPdf(id, correctionData);

    toast.promise(promise, {
        loading: 'Gerando PDF...',
        success: 'PDF gerado com sucesso!',
        error: 'Erro ao gerar PDF.',
    });

    try {
        const blob = await promise;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redacao_corrigida_${essay?.student?.name.replace(' ', '_') || id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  if (!essay) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Toaster position="top-center" reverseOrder={false} />
        {/* Spinner ou mensagem de carregamento pode ir aqui */}
      </div>
    );
  }

  const studentData = {
    name: essay.student?.name || 'Aluno não identificado',
    avatarUrl: essay.student?.photoUrl || 'https://via.placeholder.com/40',
    class: essay.student?.class || 'Turma não informada',
    essayTheme: essay.theme?.title || 'Tema não informado',
    model: essay.type,
  };

  const essayUrl = getFileUrl(essay.file.originalUrl);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toaster position="top-center" reverseOrder={false} />
      <CorrectionHeader studentData={studentData} />
      <CorrectionToolbar 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSaveDraft={handleSaveDraft}
        onGeneratePdf={handleGeneratePdf}
        isSaving={isSaving}
        isGeneratingPdf={isGeneratingPdf}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 overflow-y-auto" id="pdf-container">
          <PDFViewerWithHighlights 
            pdfUrl={essayUrl} 
            annotations={annotations}
            selectedCategory={selectedCategory}
            onAddAnnotation={handleAddAnnotation}
          />
        </main>
        <aside className="w-96 bg-white p-4 border-l border-gray-200 overflow-y-auto">
          <AnnotationsPanel 
            model={studentData.model} 
            annotations={annotations}
            enemScores={enemScores}
            pasScores={pasScores}
            finalGrade={finalGrade}
            generalComments={generalComments}
            onCorrectionChange={handleCorrectionChange}
            onGeneralCommentsChange={setGeneralComments}
          />
        </aside>
      </div>
      {editingAnnotation && (
        <AnnotationModal 
          annotation={editingAnnotation}
          onSave={handleSaveComment}
          onClose={() => setEditingAnnotation(null)}
        />
      )}
    </div>
  );
};

export default CorrectionPage;
