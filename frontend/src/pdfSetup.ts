import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?worker&url'
GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string
