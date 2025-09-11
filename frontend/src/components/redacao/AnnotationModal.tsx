import { useState, useEffect } from 'react'
import { Annotation } from './PDFViewer'

interface AnnotationModalProps {
  annotation: Annotation | null
  isOpen: boolean
  onClose: () => void
  onSave: (comment: string) => void
  categoryName: string
}

export function AnnotationModal({ 
  annotation, 
  isOpen, 
  onClose, 
  onSave,
  categoryName
}: AnnotationModalProps) {
  const [comment, setComment] = useState('')

  // Atualiza o comentário quando a anotação muda
  useEffect(() => {
    if (annotation) {
      setComment(annotation.comment || '')
    }
  }, [annotation])

  if (!isOpen || !annotation) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            Comentário - <span className="italic">{categoryName}</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Adicione seu comentário:
          </label>
          <textarea
            id="comment"
            rows={5}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva seu comentário aqui..."
            autoFocus
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(comment)
              onClose()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}