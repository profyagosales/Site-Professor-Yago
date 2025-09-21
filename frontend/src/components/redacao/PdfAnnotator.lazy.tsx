import React, { Suspense } from "react";

const Inner = React.lazy(() => import(/* @vite-ignore */ "./PdfAnnotator"));

export default function PdfAnnotatorLazy(props: any) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
