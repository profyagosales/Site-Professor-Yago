const fs = require('fs');
const path = require('path');

const dst = path.resolve(__dirname, '../public/pdf.worker.mjs');
const possible = [
  path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
];
const src = possible.find(fs.existsSync);
if (!src) {
  console.error('pdf.worker.min.mjs não encontrado');
  process.exit(1);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('pdf.worker.mjs copiado para public/');
