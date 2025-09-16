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
import { requestCorrectionSuggestion, CorrectionSuggestionResponse, applySuggestion } from '@/services/aiService';

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
  // IA Suggestion state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CorrectionSuggestionResponse | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');

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

  const handleRequestAISuggestion = async () => {
    if (!essay) return;
    setAiLoading(true);
    setShowAiPanel(true);
    setAiSuggestion(null);
    try {
      const currentScoresObj: Record<string, number> = essay.type === 'ENEM'
        ? { c1: enemScores.c1, c2: enemScores.c2, c3: enemScores.c3, c4: enemScores.c4, c5: enemScores.c5 }
        : { arg: (pasScores as any).arg, type: (pasScores as any).type, lang: (pasScores as any).lang };
      const payload = {
        essayId: essay._id,
        type: essay.type,
        themeText: essay.theme?.title || essay.themeText,
        rawText: rawTextInput || undefined,
        currentScores: currentScoresObj
      };
      const suggestion = await requestCorrectionSuggestion(payload);
      setAiSuggestion(suggestion);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao obter sugestão IA');
      setShowAiPanel(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIGeneralFeedback = async () => {
    if (!aiSuggestion) return;
    const disclaimerLine = '[IA] (Revise antes de enviar)\n';
    // Evitar duplicar se já aplicado
    if (generalComments.includes(aiSuggestion.sections.generalFeedback.slice(0,20))) return;
    setGeneralComments(prev => `${prev ? prev + '\n\n' : ''}${disclaimerLine}${aiSuggestion.sections.generalFeedback}`);
    toast.success('Feedback geral aplicado');
    if ((aiSuggestion as any).suggestionId) {
      try { await applySuggestion((aiSuggestion as any).suggestionId, { applyFeedback: true }); } catch {}
    }
  };

  const handleApplyAISuggestedScores = async () => {
    if (!aiSuggestion || !essay) return;
    if (essay.type === 'ENEM') {
      const updated: EnemCorrection = { ...enemScores };
      aiSuggestion.sections.competencies.forEach(c => {
        if (c.id === 'c1' || c.id === 'c2' || c.id === 'c3' || c.id === 'c4' || c.id === 'c5') {
          const val = Math.max(0, Math.min(200, c.suggestedScore));
          (updated as any)[c.id] = val; // cast seguro controlado acima
        }
      });
      setEnemScores(updated as EnemCorrection);
    } else if (essay.type?.startsWith('PAS')) {
      const updated: PasCorrection = { ...pasScores };
      aiSuggestion.sections.competencies.forEach(c => {
        if (c.id === 'arg' || c.id === 'type' || c.id === 'lang') {
          const val = Math.max(0, Math.min(10, c.suggestedScore));
          (updated as any)[c.id] = val;
        }
      });
      setPasScores(updated as PasCorrection);
    }
    toast.success('Notas sugeridas aplicadas');
    if ((aiSuggestion as any).suggestionId) {
      try { await applySuggestion((aiSuggestion as any).suggestionId, { applyScores: true }); } catch {}
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
          <div className="mb-4 flex gap-2 items-center">
            <button
              onClick={handleRequestAISuggestion}
              disabled={aiLoading}
              className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiLoading ? 'Gerando...' : 'Sugestão IA'}
            </button>
            {aiSuggestion && (
              <button
                onClick={handleApplyAIGeneralFeedback}
                className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >Aplicar Feedback Geral</button>
            )}
            {aiSuggestion && (
              <button
                onClick={handleApplyAISuggestedScores}
                className="px-3 py-2 text-sm rounded bg-teal-600 text-white hover:bg-teal-700"
              >Aplicar Notas</button>
            )}
            {aiSuggestion && !aiLoading && (
              <span className="text-xs text-gray-500">Gerado em {aiSuggestion.metadata.generationMs}ms</span>
            )}
          </div>
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
          {showAiPanel && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Sugestão IA</h3>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >Fechar</button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-gray-600">Texto bruto (opcional para IA)</label>
                <textarea
                  value={rawTextInput}
                  onChange={e => setRawTextInput(e.target.value.slice(0,12000))}
                  placeholder="Cole aqui o texto integral da redação (máx 12.000 caracteres)"
                  className="w-full h-28 text-xs p-2 border rounded resize-y focus:outline-none focus:ring focus:border-indigo-400"
                />
                <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                  <span>{rawTextInput.length} / 12000</span>
                  {rawTextInput.length >= 12000 && <span className="text-red-500">Limite atingido</span>}
                </div>
              </div>
              {aiLoading && (
                <div className="text-xs text-gray-500">Gerando sugestão...</div>
              )}
              {!aiLoading && aiSuggestion && (
                <div className="space-y-3 text-xs">
                  <p className="text-[11px] text-amber-600 italic leading-snug">{aiSuggestion.disclaimer}</p>
                  <div>
                    <h4 className="font-medium mb-1">Feedback Geral</h4>
                    <p className="whitespace-pre-line text-gray-700">
                      {aiSuggestion.sections.generalFeedback}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Competências</h4>
                    <ul className="space-y-2">
                      {aiSuggestion.sections.competencies.map(c => (
                        <li key={c.id} className="border p-2 rounded">
                          <div className="flex justify-between">
                            <span className="font-semibold">{c.label}</span>
                            <span className="text-[11px] text-gray-500">Sug: {c.suggestedScore}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-gray-600">Força:</span> {c.strength}
                          </div>
                          <div className="mt-1">
                            <span className="text-gray-600">Melhorar:</span> {c.improvement}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Sugestões de Melhoria</h4>
                    <ul className="list-disc ml-4 space-y-1">
                      {aiSuggestion.sections.improvements.map((impr, idx) => (
                        <li key={idx}>{impr}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
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
