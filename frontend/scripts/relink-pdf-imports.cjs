#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('src');
const files = [];

(function walk(dir){
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(t|j)sx?$/.test(f)) files.push(p);
  }
})(ROOT);

// cobre imports estáticos e dinâmicos, com/sem subpasta intermediária, incluindo alias @/ e src/
const staticRe = /from\s+(['"])((?:\.{1,2}\/|@\/|src\/)[^'\"]*\/)?PdfAnnotator\1/g;
const dynRe    = /import\(\s*(['"])((?:\.{1,2}\/|@\/|src\/)[^'\"]*\/)?PdfAnnotator\1\s*\)/g;

let count = 0;
for (const p of files) {
  if (/(^|\/)PdfAnnotator(\.lazy)?\.tsx?$/.test(p)) continue;

  let src = fs.readFileSync(p, 'utf8');
  let out = src.replace(staticRe, (_m, q, pre='') => `from ${q}${pre}PdfAnnotator.lazy${q}`);
  out = out.replace(dynRe,   (_m, q, pre='') => `import(${q}${pre}PdfAnnotator.lazy${q})`);

  if (out !== src) {
    fs.writeFileSync(p, out);
    console.log('[relink]', p);
    count++;
  }
}
console.log('Total relinked:', count);
