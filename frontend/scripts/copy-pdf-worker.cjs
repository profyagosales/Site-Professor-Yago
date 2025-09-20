const fs = require('fs');
const path = require('path');

// Use o worker legacy UMD para evitar erros de "export" em ambientes que não suportam módulos em workers
const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js');
const dst = path.resolve(__dirname, '..', 'public', 'pdf.worker.min.js');
if (!fs.existsSync(src)) {
  console.error('legacy pdf.worker.min.js não encontrado em', src);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('Copied legacy pdf.worker.min.js to public/');
