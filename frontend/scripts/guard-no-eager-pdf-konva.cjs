#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findEntryJs(distDir) {
  const assets = fs.readdirSync(path.join(distDir, 'assets'));
  const entry = assets.find((f) => /^index-.*\.js$/.test(f));
  if (!entry) {
    console.error('❌ Guard: não encontrei index-*.js em dist/assets');
    process.exit(1);
  }
  return path.join(distDir, 'assets', entry);
}

const distDir = 'dist';
const entryPath = findEntryJs(distDir);
const code = fs.readFileSync(entryPath, 'utf8');
const bad = /(react-konva|\bkonva\b|react-pdf|pdfjs-dist)/;

if (bad.test(code)) {
  console.error('❌ Guard: PDF/Konva vazou no entry bundle. Verifique imports estáticos.');
  process.exit(1);
} else {
  console.log('✅ Guard: entry limpo (sem PDF/Konva).');
}
