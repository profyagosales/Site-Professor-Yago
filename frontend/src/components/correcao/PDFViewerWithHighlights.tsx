
import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { APIAnnotation } from '../../services/essayService';
import { CorrectionCategory } from '../../constants/correction';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerWithHighlightsProps {
  pdfUrl: string;
  annotations: APIAnnotation[];
  selectedCategory: CorrectionCategory;
  onAddAnnotation: (annotation: APIAnnotation) => void;
}

const PDFViewerWithHighlights: React.FC<PDFViewerWithHighlightsProps> = ({ 
  pdfUrl, 
  annotations,
  selectedCategory,
  onAddAnnotation 
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const pageElement = range.startContainer.parentElement?.closest('.react-pdf__Page');
    if (!pageElement) return;

    const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '0', 10);
    const pageRect = pageElement.getBoundingClientRect();
    const selectionRects = Array.from(range.getClientRects()).map(rect => ({
      x: rect.left - pageRect.left,
      y: rect.top - pageRect.top,
      w: rect.width,
      h: rect.height,
    }));

    const newAnnotation: APIAnnotation = {
      page: pageNumber,
      rects: selectionRects,
      color: selectedCategory.color,
      category: selectedCategory.id,
      comment: '', // O comentário será adicionado depois
    };

    onAddAnnotation(newAnnotation);
    window.getSelection()?.removeAllRanges();
  }, [selectedCategory, onAddAnnotation]);

  return (
    <div className="relative w-full h-full bg-gray-200 overflow-auto" onMouseUp={handleTextSelection}>
      <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1}>
            <div className="absolute inset-0">
              {annotations
                .filter(a => a.page === index + 1)
                .flatMap(a => a.rects.map((rect, i) => (
                  <div
                    key={`${a.id || Math.random()}-${i}`}
                    className="absolute opacity-50"
                    style={{
                      left: `${rect.x}px`,
                      top: `${rect.y}px`,
                      width: `${rect.w}px`,
                      height: `${rect.h}px`,
                      backgroundColor: a.color,
                    }}
                  />
                )))
              }
            </div>
          </Page>
        ))}
      </Document>
    </div>
  );
};

export default PDFViewerWithHighlights;
