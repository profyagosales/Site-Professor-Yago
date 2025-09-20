const fs = require('fs');
const path = require('path');

const src = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.js');
const dest = path.resolve(__dirname, '..', 'public', 'pdf.worker.min.js');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('copied legacy pdf.worker.min.js');
