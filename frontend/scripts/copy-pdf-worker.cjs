#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const nm = (p) => path.join(root, 'node_modules', 'pdfjs-dist', p);
const candidates = [
  'legacy/build/pdf.worker.min.js',
  'build/pdf.worker.min.js',
  'legacy/build/pdf.worker.js',
  'build/pdf.worker.js',
];

const outDir = path.join(root, 'public');
const outFile = path.join(outDir, 'pdf.worker.min.js');
fs.mkdirSync(outDir, { recursive: true });

const src = candidates.map(nm).find((p) => fs.existsSync(p));
if (!src) {
  const mjs = [nm('build/pdf.worker.min.mjs'), nm('build/pdf.worker.mjs')].find(fs.existsSync);
  if (mjs) {
    console.error('Só encontrei ESM (mjs). Considere bundlar com ?worker&url.');
  }
  throw new Error('Nenhum pdf.worker(.min).js encontrado em pdfjs-dist');
}
fs.copyFileSync(src, outFile);
console.log(`pdf.js worker copiado: ${path.relative(root, src)} -> ${path.relative(root, outFile)}`);
