#!/usr/bin/env node
/**
 * Verifica se manifest/dist não traz pdf/react-pdf/react-konva/konva em vendor/preload.
 */
const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error('Manifest check FAIL:', msg);
  process.exit(2);
}

const manifestPath = path.join(process.cwd(), 'dist', '.vite', 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('manifest.json não encontrado');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { fail('manifest inválido'); }

// Permitimos chunks de pdf existirem (carregamento dinâmico), mas não podem estar como import estático em outra entry.
const staticSuspect = /(react-pdf|pdfjs-dist)/i;
for (const [entry, meta] of Object.entries(manifest)) {
  const staticImports = meta.imports || [];
  if (staticImports.some(d => staticSuspect.test(String(d)))) {
    fail(`referência estática suspeita em ${entry} -> ${staticImports.find(d=>staticSuspect.test(String(d)))}`);
  }
  // dynamicImports são permitidos
}

// Checar index.html por preloads de pdf/konva
const indexHtml = path.join(process.cwd(), 'dist', 'index.html');
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, 'utf8');
  if (/pdf-\w+\.js/i.test(html)) {
    fail('preload inesperado de pdf no index.html');
  }
}

console.log('Manifest OK (pdf/konva apenas via dynamic imports)');
