import { pdfjs } from 'react-pdf';

// caminho ABSOLUTO para não ser engolido pelo SPA router:
pdfjs.GlobalWorkerOptions.workerSrc = '/viewer/pdf.worker.mjs';
