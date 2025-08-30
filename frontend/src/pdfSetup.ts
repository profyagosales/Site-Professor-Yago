import { pdfjs } from 'react-pdf';
// use o asset empacotado pelo Vite
// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as string;
