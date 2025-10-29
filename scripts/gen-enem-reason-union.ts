import fs from 'node:fs';
import path from 'node:path';

const RUBRIC_PATHS = [
  'frontend/src/features/essay/rubrics/enem2024.ts',
  'frontend/src/features/enem/enem2024.ts',
  'frontend/src/features/enem/enem.ts',
  'frontend/src/features/redacao/pdf/mirrors/enem.ts',
];

function readFirstExisting(paths: string[]): string {
  for (const p of paths) {
    const full = path.resolve(p);
    if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  }
  throw new Error('Não encontrei o arquivo do rubric ENEM (tentei: ' + paths.join(', ') + ')');
}

const src = readFirstExisting(RUBRIC_PATHS);

// pega todos os slugs tipo c2_l3_..., c4_l2_...
const matches = src.match(/\bc[1-5]_l[0-5]_[a-z0-9_]+\b/gi) ?? [];
const uniq = Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b));

const out =
  `// ⚠️ Gerado por scripts/gen-enem-reason-union.ts\n` +
  `export type RubricReasonId =\n` +
  uniq.map((id) => `  | '${id}'`).join('\n') +
  `;\n\nexport const ALL_RUBRIC_REASON_IDS = ${JSON.stringify(uniq, null, 2)} as const;\n`;

const OUT_PATH = path.resolve('frontend/src/features/enem/rubricReasonIds.ts');
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log(`✓ Gerado ${OUT_PATH} com ${uniq.length} reasonIds.`);
