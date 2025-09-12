import React, { useState } from 'react';
import { FrontendAnnotation, EnemCorrection, PasCorrection } from '../../services/essayService';
import { CORRECTION_CATEGORIES } from '../../constants/correction';

interface AnnotationsPanelProps {
  model: 'ENEM' | 'PAS' | 'PAS/UnB';
  annotations: FrontendAnnotation[];
  enemScores: EnemCorrection;
  pasScores: PasCorrection;
  finalGrade: number;
  generalComments: string;
  onCorrectionChange: (data: Partial<EnemCorrection> | Partial<PasCorrection>) => void;
  onGeneralCommentsChange: (comments: string) => void;
}

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({ 
  model, 
  annotations,
  enemScores,
  pasScores,
  finalGrade,
  generalComments,
  onCorrectionChange,
  onGeneralCommentsChange,
}) => {
  const [activeTab, setActiveTab] = useState('espelho');

  const renderEnemScores = () => (
    <div>
      <h3 className="font-semibold mb-2">Competências (ENEM)</h3>
      {Object.keys(enemScores).map((key, i) => (
        <div key={key} className="flex items-center justify-between mb-2">
          <label htmlFor={key} className="text-sm uppercase">C{i+1}</label>
          <select
            id={key}
            value={enemScores[key as keyof EnemCorrection]}
            onChange={(e) => onCorrectionChange({ [key]: parseInt(e.target.value, 10) || 0 })}
            className="w-24 p-1 border rounded"
          >
            {[0, 40, 80, 120, 160, 200].map(score => <option key={score} value={score}>{score}</option>)}
          </select>
        </div>
      ))}
    </div>
  );

  const renderPasScores = () => (
    <div>
      <h3 className="font-semibold mb-2">Critérios (PAS/UnB)</h3>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="arg" className="text-sm">Argumentação (x2)</label>
        <input
          type="number"
          id="arg"
          value={pasScores.arg}
          onChange={(e) => onCorrectionChange({ arg: parseFloat(e.target.value) || 0 })}
          className="w-20 p-1 border rounded"
          max={5}
          min={0}
          step={0.5}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="type" className="text-sm">Tipo Textual (x2)</label>
        <input
          type="number"
          id="type"
          value={pasScores.type}
          onChange={(e) => onCorrectionChange({ type: parseFloat(e.target.value) || 0 })}
          className="w-20 p-1 border rounded"
          max={2.5}
          min={0}
          step={0.25}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="lang" className="text-sm">Língua Portuguesa (x1)</label>
        <input
          type="number"
          id="lang"
          value={pasScores.lang}
          onChange={(e) => onCorrectionChange({ lang: parseFloat(e.target.value) || 0 })}
          className="w-20 p-1 border rounded"
          max={2.5}
          min={0}
          step={0.25}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b">
        <button 
          className={`flex-1 p-2 text-sm font-semibold ${activeTab === 'espelho' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('espelho')}
        >
          Espelho de Correção
        </button>
        <button 
          className={`flex-1 p-2 text-sm font-semibold ${activeTab === 'anotacoes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('anotacoes')}
        >
          Anotações ({annotations.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'espelho' && (
          <div className="space-y-4">
            {model.startsWith('PAS') ? renderPasScores() : renderEnemScores()}
            
            <hr />

            <div>
              <h3 className="font-semibold mb-2">Comentários Gerais</h3>
              <textarea
                value={generalComments}
                onChange={(e) => onGeneralCommentsChange(e.target.value)}
                className="w-full p-2 border rounded h-32"
                placeholder="Digite seus comentários gerais sobre a redação aqui..."
              />
            </div>
            
            <hr />

            <div className="text-center sticky bottom-0 bg-white py-2">
              <h3 className="font-semibold text-lg">Nota Final</h3>
              <p className="text-3xl font-bold text-blue-600">{finalGrade.toFixed(2)}</p>
            </div>
          </div>
        )}

        {activeTab === 'anotacoes' && (
          <div>
            {annotations.length > 0 ? (
              <ul className="space-y-3">
                {annotations.map((ann) => {
                  const category = CORRECTION_CATEGORIES.find(c => c.id === ann.category);
                  return (
                    <li key={ann.id} className="border p-2 rounded-md shadow-sm">
                      <div className="flex items-start">
                        <span 
                          className="w-4 h-4 rounded-full mr-2 mt-1 flex-shrink-0"
                          style={{ backgroundColor: category?.color || '#ccc' }}
                          title={category?.label}
                        ></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 truncate" title={ann.text}>"{ann.text}"</p>
                          <p className="text-sm mt-1 break-words">{ann.comment}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center mt-4">Nenhuma anotação feita ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
