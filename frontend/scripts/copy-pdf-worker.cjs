#!/usr/bin/env node
// Copia o worker do pdfjs-dist para public/ aceitando ESM (.mjs) e UMD (.js)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);

const candidatesMjs = [
  ['pdfjs-dist','build','pdf.worker.min.mjs'],
  ['pdfjs-dist','build','pdf.worker.mjs'],
];
const candidatesUmd = [
  ['pdfjs-dist','legacy','build','pdf.worker.min.js'],
  ['pdfjs-dist','build','pdf.worker.min.js'],
  ['pdfjs-dist','build','pdf.worker.js'],
];

const firstExisting = (arr) => {
  for (const parts of arr) {
    const p = nm(...parts);
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const mjsSrc = firstExisting(candidatesMjs);
const umdSrc = firstExisting(candidatesUmd);

fs.mkdirSync(path.join(root, 'public'), { recursive: true });

if (mjsSrc) {
  fs.copyFileSync(mjsSrc, path.join(root, 'public', 'pdf.worker.min.mjs'));
  console.error(`[copy-pdf-worker] Copiado ESM: ${mjsSrc}`);
}
if (umdSrc) {
  fs.copyFileSync(umdSrc, path.join(root, 'public', 'pdf.worker.min.js'));
  console.error(`[copy-pdf-worker] Copiado UMD: ${umdSrc}`);
}

// Não aborta o build se não achar (alguns ambientes só terão um dos formatos)
if (!mjsSrc && !umdSrc) {
  console.error('[copy-pdf-worker] Aviso: nenhum worker encontrado em pdfjs-dist');
  process.exit(0);
}
