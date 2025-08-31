const fs = require('fs');
const path = require('path');

const src = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
const dest = path.resolve(__dirname, '..', 'public', 'pdf.worker.mjs');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('copied pdf.worker.mjs');
