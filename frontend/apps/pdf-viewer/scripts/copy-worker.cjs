const fs = require('fs');
const path = require('path');

// Copiar worker da versão específica para public/
const workerSrc = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const publicDir = path.join(__dirname, '..', 'public');

// Criar diretório se não existir
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const workerDest = path.join(publicDir, 'pdf.worker.mjs');

try {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('copied pdf.worker.mjs to public/');
} catch (e) {
  console.error('Failed to copy worker:', e.message);
  process.exit(1);
}
