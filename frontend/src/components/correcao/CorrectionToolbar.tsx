
import React from 'react';
import { CORRECTION_CATEGORIES, CorrectionCategory } from '../../constants/correction';

interface CorrectionToolbarProps {
  selectedCategory: CorrectionCategory;
  onSelectCategory: (category: CorrectionCategory) => void;
  onSaveDraft: () => void;
  onGeneratePdf: () => void;
  isSaving: boolean;
  isGeneratingPdf: boolean;
}

const CorrectionToolbar: React.FC<CorrectionToolbarProps> = ({ 
  selectedCategory, 
  onSelectCategory,
  onSaveDraft,
  onGeneratePdf,
  isSaving,
  isGeneratingPdf
}) => {
  return (
    <div className="bg-gray-50 p-2 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Paleta de cores */}
        <div className="flex items-center space-x-1">
          {CORRECTION_CATEGORIES.map((category) => (
            <button
              key={category.id}
              title={category.label}
              onClick={() => onSelectCategory(category)}
              className={`w-6 h-6 rounded-full transition-all ${
                selectedCategory?.id === category.id ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{ backgroundColor: category.color, borderColor: category.color.replace('0.5', '1') }}
            ></button>
          ))}
        </div>
        <div className="h-6 border-l border-gray-300 mx-2"></div>
        {/* Ferramentas */}
        <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100">Selecionar</button>
        <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100">Borracha</button>
        <div className="h-6 border-l border-gray-300 mx-2"></div>
        {/* Zoom */}
        <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100">-</button>
        <span className="text-sm">100%</span>
        <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100">+</button>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">{isSaving ? 'Salvando...' : 'Rascunho salvo'}</span>
        <button 
          onClick={onSaveDraft}
          disabled={isSaving || isGeneratingPdf}
          className="px-4 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
        </button>
        <button 
          onClick={onGeneratePdf}
          disabled={isSaving || isGeneratingPdf}
          className="px-4 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300"
        >
          {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
        </button>
      </div>
    </div>
  );
};

export default CorrectionToolbar;
