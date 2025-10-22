#!/usr/bin/env node
/* Verifica se há imports estáticos de libs pesadas fora dos componentes permitidos */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const ALLOW_FILES = new Set([
  path.join('components','redacao','PdfAnnotator.tsx'),
  path.join('components','redacao','PdfAnnotator.lazy.tsx'),
  path.join('lib','pdf.ts'),
]);

/** @type {Array<{file:string,line:number,match:string}>} */
const violations = [];

/** @param {string} dir */
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (/\.(t|j)sx?$/.test(name)) {
      const rel = path.relative(path.resolve(__dirname, '..'), p);
      if (ALLOW_FILES.has(path.relative(path.resolve(__dirname, '..', 'src'), p))) continue;
      const txt = fs.readFileSync(p, 'utf8');
      const lines = txt.split(/\r?\n/);
      const re = /(import\s+[^'";]+\s+from\s+['"](react-pdf|pdfjs-dist|react-konva|konva)['"])|require\(\s*['"](react-pdf|pdfjs-dist|react-konva|konva)['"]\s*\)/g;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          violations.push({ file: rel, line: i + 1, match: line.trim() });
        }
      }
    }
  }
}

if (fs.existsSync(ROOT)) walk(ROOT);

if (violations.length) {
  console.error('\n❌ Encontrado import estático de PDF/Konva em arquivos não permitidos:');
  for (const v of violations) console.error(`- ${v.file}:${v.line} :: ${v.match}`);
  process.exit(2);
} else {
  console.log('OK: sem imports estáticos de PDF/Konva fora dos componentes permitidos');
}
