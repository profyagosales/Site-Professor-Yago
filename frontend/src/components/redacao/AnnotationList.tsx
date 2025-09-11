import { Annotation } from './PDFViewer'

interface AnnotationListProps {
  annotations: Annotation[]
  currentPage: number
  onEditAnnotation: (annotationId: string) => void
  onDeleteAnnotation: (annotationId: string) => void
}

export function AnnotationList({ 
  annotations, 
  currentPage, 
  onEditAnnotation, 
  onDeleteAnnotation
}: AnnotationListProps) {
  // Filtra as anotações da página atual
  const pageAnnotations = annotations.filter(anno => anno.page === currentPage)
  
  // Mapeia categorias para cores e nomes legíveis
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'formal':
        return { name: 'Aspectos formais', color: 'bg-orange-100 text-orange-800' }
      case 'grammar':
        return { name: 'Ortografia/gramática', color: 'bg-green-100 text-green-800' }
      case 'argument':
        return { name: 'Argumentação e estrutura', color: 'bg-yellow-100 text-yellow-800' }
      case 'general':
        return { name: 'Comentário geral', color: 'bg-red-100 text-red-800' }
      case 'cohesion':
        return { name: 'Coesão e coerência', color: 'bg-blue-100 text-blue-800' }
      default:
        return { name: 'Outro', color: 'bg-gray-100 text-gray-800' }
    }
  }

  if (pageAnnotations.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        Nenhuma anotação nesta página
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pageAnnotations.map((annotation) => {
        const { name, color } = getCategoryInfo(annotation.category)
        
        return (
          <div 
            key={annotation.id}
            className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${color} mb-2`}>
                {name}
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => onEditAnnotation(annotation.id)}
                  className="p-1 text-blue-600 hover:text-blue-800 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => onDeleteAnnotation(annotation.id)}
                  className="p-1 text-red-600 hover:text-red-800 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              {annotation.comment || <em className="text-gray-500">Sem comentário</em>}
            </p>
          </div>
        )
      })}
    </div>
  )
}