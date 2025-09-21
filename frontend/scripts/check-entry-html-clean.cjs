#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('dist/index.html não encontrado');
  process.exit(2);
}
const html = fs.readFileSync(htmlPath, 'utf8');

const bad = html.match(/assets\/(pdf|ReactKonva)-[A-Za-z0-9_-]+\.js/g);
if (bad && bad.length) {
  console.error('❌ index.html contém pré-carregamento de chunks pesados:', Array.from(new Set(bad)).join(', '));
  process.exit(2);
}
console.log('OK: index.html sem pré-carregamento de pdf/konva');
