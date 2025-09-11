import { useState } from 'react'

// Tipos para as anotações no PDF
export type Annotation = {
  id: string
  page: number
  rect: { x: number; y: number; width: number; height: number }
  color: string
  category: string
  comment: string
}

interface PDFViewerProps {
  pdfUrl: string
  annotations: Annotation[]
  activeCategory: string
  onAddAnnotation?: (page: number, rect: { x: number; y: number; width: number; height: number }) => void
  onPageChange?: (page: number) => void
}

export function PDFViewer({ 
  pdfUrl, 
  annotations, 
  activeCategory, 
  onAddAnnotation,
  onPageChange
}: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1) // Seria definido quando o PDF carregar
  const [scale, setScale] = useState(1.0)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 })

  // Funções de manipulação de seleção para criar anotações
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddAnnotation) return
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsSelecting(true)
    setSelectionStart({ x, y })
    setSelectionEnd({ x, y })
  }
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setSelectionEnd({ x, y })
  }
  
  const handleMouseUp = () => {
    if (!isSelecting || !onAddAnnotation) return
    
    const x = Math.min(selectionStart.x, selectionEnd.x)
    const y = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)
    
    // Apenas cria anotação se a seleção for grande o suficiente
    if (width > 10 && height > 10) {
      onAddAnnotation(currentPage, { x, y, width, height })
    }
    
    setIsSelecting(false)
  }

  // Funções de navegação entre páginas
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      if (onPageChange) {
        onPageChange(newPage)
      }
    }
  }
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      if (onPageChange) {
        onPageChange(newPage)
      }
    }
  }
  
  // Função para alterar o zoom
  const changeZoom = (newScale: number) => {
    setScale(newScale)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra de ferramentas */}
      <div className="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`p-1 rounded ${
              currentPage === 1
                ? 'text-gray-400'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <span className="text-sm">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`p-1 rounded ${
              currentPage === totalPages
                ? 'text-gray-400'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeZoom(scale - 0.1)}
            className="p-1 rounded text-gray-700 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
            </svg>
          </button>
          
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          
          <button
            onClick={() => changeZoom(scale + 0.1)}
            className="p-1 rounded text-gray-700 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Área de visualização do PDF */}
      <div 
        className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Placeholder para a página do PDF */}
        <div 
          className="bg-white shadow-md mx-auto my-4 relative"
          style={{ 
            width: `${8.5 * scale * 96}px`, // 8.5 x 11 inch at 96 DPI
            height: `${11 * scale * 96}px` 
          }}
        >
          {/* Em uma implementação real, aqui seria renderizada a página do PDF */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mt-2">Página {currentPage}</p>
              <p className="text-sm mt-1">
                (Em uma implementação real, o PDF seria renderizado aqui usando uma biblioteca como react-pdf)
              </p>
            </div>
          </div>
          
          {/* Anotações na página atual */}
          {annotations
            .filter(anno => anno.page === currentPage)
            .map(anno => (
              <div
                key={anno.id}
                className={`absolute ${anno.color} opacity-60`}
                style={{
                  left: anno.rect.x * scale,
                  top: anno.rect.y * scale,
                  width: anno.rect.width * scale,
                  height: anno.rect.height * scale,
                  cursor: 'pointer'
                }}
                title={anno.comment}
              ></div>
            ))
          }
          
          {/* Seleção atual */}
          {isSelecting && (
            <div
              className={`absolute border-2 ${
                activeCategory === 'formal' ? 'border-orange-500' :
                activeCategory === 'grammar' ? 'border-green-500' :
                activeCategory === 'argument' ? 'border-yellow-500' :
                activeCategory === 'general' ? 'border-red-500' :
                'border-blue-500' // cohesion
              }`}
              style={{
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y),
              }}
            ></div>
          )}
        </div>
      </div>
    </div>
  )
}