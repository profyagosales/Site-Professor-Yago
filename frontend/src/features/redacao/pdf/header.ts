import React from 'react';
import { AnnotationToolbar } from '../../../features/annotations/AnnotationToolbar';
import { PdfCorrectionViewer } from '../../../features/pdf/PdfCorrectionViewer';
import { AnnotationSidebar } from '../../../features/annotations/AnnotationSidebar';

export function GradeWorkspace({ generating }) {
  return (
    <div
      data-printing={generating ? '1' : '0'}
      className="mx-auto grid h-full w-full max-w-none grid-cols-[var(--aside-w)_1fr_var(--hero-right-col)] gap-x-[var(--hero-gap,24px)] gap-y-3 px-2 py-4 sm:px-3 lg:px-4"
      style={{ ['--pdf-viewport-offset' as any]: '170px', ['--hero-sticky-top' as any]: '68px' }}
    >
      <div className="col-start-1 col-span-1">
        <AnnotationToolbar />
      </div>

      <div className="col-start-2 col-span-2 card grid grid-cols-[var(--hero-logo-col)_1fr_var(--hero-right-col)] items-center gap-x-[var(--hero-gap,24px)] gap-y-2 min-h-[var(--hero-min-h)] py-[var(--hero-py)]">
        {/* Hero/header content: student title, meta, and cards “TOTAL”/“MODELO” */}
      </div>

      <div className="col-start-2 col-span-1 min-w-0">
        <PdfCorrectionViewer />
      </div>

      <aside className="col-start-3 col-span-1 min-w-0 ws-right-rail">
        <AnnotationSidebar />
      </aside>
    </div>
  );
}
