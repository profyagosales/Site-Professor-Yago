import React from 'react';
import { AnnotationToolbar } from '../../../features/annotations/AnnotationToolbar';
import { PdfCorrectionViewer } from '../../../features/pdf/PdfCorrectionViewer';
import { AnnotationSidebar } from '../../../features/annotations/AnnotationSidebar';

export function GradeWorkspace({ generating }) {
  return (
    <div
      data-printing={generating ? '1' : '0'}
      className="mx-auto grid h-full w-full max-w-none grid-cols-[minmax(240px,260px)_1fr_minmax(340px,380px)] gap-x-[var(--ws-gutter-x,24px)] gap-y-3 px-2 py-4 sm:px-3 lg:px-4"
      style={{ ['--pdf-viewport-offset' as any]: '170px', ['--hero-sticky-top' as any]: '68px' }}
    >
      <div className="col-start-1 col-span-1">
        <AnnotationToolbar />
      </div>

      <div className="col-start-2 col-span-2 card ...">
        {/* Hero/header content: student title, meta, and cards “TOTAL”/“MODELO” */}
      </div>

      <div className="col-start-2 col-span-1 min-w-0">
        <PdfCorrectionViewer />
      </div>

      <div className="col-start-3 col-span-1 min-w-0">
        <AnnotationSidebar />
      </div>
    </div>
  );
}
