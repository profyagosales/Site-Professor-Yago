import React, { useState, useEffect } from 'react';
import { APIAnnotation } from '../../services/essayService';
import { CORRECTION_CATEGORIES } from '../../constants/correction';

interface AnnotationModalProps {
  annotation: APIAnnotation | null;
  onSave: (annotationId: string, comment: string) => void;
  onClose: () => void;
}

const AnnotationModal: React.FC<AnnotationModalProps> = ({ annotation, onSave, onClose }) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (annotation) {
      setComment(annotation.comment);
    }
  }, [annotation]);

  if (!annotation) {
    return null;
  }

  const handleSave = () => {
    onSave(annotation.id!, comment);
  };

  const category = CORRECTION_CATEGORIES.find(c => c.id === annotation.category);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div 
            className="w-5 h-5 rounded-full mr-3"
            style={{ backgroundColor: category?.color.replace('0.5', '1') }}
          ></div>
          <h2 className="text-lg font-semibold">Adicionar Comentário - {category?.label}</h2>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full h-32 p-2 border rounded-md"
          placeholder="Digite seu comentário..."
        ></textarea>
        <div className="flex justify-end mt-4 space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md">Salvar</button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationModal;
