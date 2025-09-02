const fs = require('fs');
const path = require('path');

// Copiar worker da versão específica para public/assets
const workerSrc = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(publicDir, 'assets');

// Criar diretórios se não existirem
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const workerDest = path.join(assetsDir, 'pdf.worker.min.js');

try {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('copied pdf.worker.min.js to assets');
} catch (e) {
  console.error('Failed to copy worker:', e.message);
  process.exit(1);
}
