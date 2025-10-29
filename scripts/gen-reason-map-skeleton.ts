import fs from 'node:fs';
import path from 'node:path';

const SRC_PATHS = [
  'frontend/src/features/essay/rubrics/enem2024.ts',
  'frontend/src/features/enem/enem2024.ts',
  'frontend/src/features/enem/enem.ts',
  'frontend/src/features/redacao/pdf/mirrors/enem.ts',
];

function readFirstExisting(paths: string[]) {
  for (const p of paths) {
    const full = path.resolve(p);
    if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  }
  throw new Error('Rubric ENEM não encontrado. Verifique caminhos.');
}

const src = readFirstExisting(SRC_PATHS);
const ids = Array.from(new Set(src.match(/\bc([1-5])_l([0-5])_[a-z0-9_]+\b/gi) ?? [])).sort();

const byCL: Record<string, string[]> = {};
for (const id of ids) {
  const m = id.match(/^c([1-5])_l([0-5])_/i)!;
  const c = m[1];
  const l = m[2];
  const key = `C${c}_N${l}`;
  (byCL[key] ??= []).push(id);
}

let out = `// ⚠️ Esqueleto gerado — ajuste MANDATORY/CHOICE_SINGLE/CHOICE_MULTI manualmente e cole no REASON_MAP.\n// Dica: obrigatórios conhecidos sem ID (ex.: "abordagem completa do tema") ficam fora; apenas logue o gap no bridge.\n\nexport const REASON_MAP_SKELETON = {\n`;

for (const k of Object.keys(byCL).sort()) {
  out += `  '${k}': {\n`;
  for (const rid of byCL[k]) {
    out += `    // Exemplos:\n`;
    out += `    // '${rid}': { kind: 'MANDATORY', reasonId: '${rid}' },\n`;
    out += `    // 'grupo_x': { kind: 'CHOICE_SINGLE', options: { optA: '${rid}' /*,...*/ } },\n`;
    out += `    // 'grupo_y': { kind: 'CHOICE_MULTI',  options: { opt1: '${rid}' /*,...*/ } },\n`;
  }
  out += `  },\n`;
}
out += `} as const;\n`;

const OUT = path.resolve('frontend/src/features/enem/reasonMap.generated.ts');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
console.log('✓ Gerado', OUT);
