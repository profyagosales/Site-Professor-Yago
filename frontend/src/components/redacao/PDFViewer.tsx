import { useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
// Usando nosso próprio CSS em vez do CSS do pacote
import './pdf-styles.css'

// Configuração do worker do PDF.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

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
  const [totalPages, setTotalPages] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // Funções para navegar entre páginas
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      onPageChange?.(newPage)
    }
  }
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      onPageChange?.(newPage)
    }
  }
  
  // Funções para zoom
  const changeZoom = (newScale: number) => {
    if (newScale > 0.5 && newScale < 2) {
      setScale(newScale)
    }
  }

  // Eventos de carregamento do PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages)
    setPdfLoaded(true)
    setPdfError(false)
  }

  const onDocumentLoadError = () => {
    setPdfError(true)
    setPdfLoaded(false)
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
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 mx-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-3 text-gray-600">Carregando PDF...</p>
              </div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <svg className="h-12 w-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <p className="mt-3 text-gray-800">Não foi possível carregar o PDF</p>
                <p className="text-sm text-gray-500 mt-1">Verifique se o arquivo é válido ou tente novamente mais tarde.</p>
              </div>
            </div>
          }
        >
          {pdfLoaded && (
            <div className="shadow-lg my-4 mx-auto bg-white">
              <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="mx-auto"
                />
                
                {/* Anotações na página atual */}
                {annotations
                  .filter(anno => anno.page === currentPage)
                  .map(anno => (
                    <div
                      key={anno.id}
                      className={`absolute ${anno.color} opacity-60`}
                      style={{
                        left: anno.rect.x,
                        top: anno.rect.y,
                        width: anno.rect.width,
                        height: anno.rect.height,
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
          )}
        </Document>
      </div>
    </div>
  );
}