import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_PATH = path.resolve('frontend/src/features/enem/composerBridge.ts');
const RUBRIC_OUT = path.resolve('frontend/src/features/enem/rubricReasonIds.ts');

if (!fs.existsSync(BRIDGE_PATH)) throw new Error('composerBridge.ts não encontrado.');
if (!fs.existsSync(RUBRIC_OUT)) throw new Error('rubricReasonIds.ts não encontrado. Rode: npm run gen:enem-reasons');

const bridgeSrc = fs.readFileSync(BRIDGE_PATH, 'utf8');
const reasonIdsInBridge = Array.from(new Set(bridgeSrc.match(/\bc[1-5]_l[0-5]_[a-z0-9_]+\b/gi) ?? [])).sort();

const rubricSrc = fs.readFileSync(RUBRIC_OUT, 'utf8');
const rubricIdsMatch = rubricSrc.match(/'c[1-5]_l[0-5]_[a-z0-9_]+'/gi) ?? [];
const rubricIds = Array.from(new Set(rubricIdsMatch.map((s) => s.slice(1, -1)))).sort();

const set = (xs: string[]) => new Set(xs);
const inBridge = set(reasonIdsInBridge);
const inRubric = set(rubricIds);

const missingInRubric = reasonIdsInBridge.filter((id) => !inRubric.has(id));
const unusedInBridge = rubricIds.filter((id) => !inBridge.has(id));

console.log('— REASON_IDs no REASON_MAP:', reasonIdsInBridge.length);
console.log('— REASON_IDs no RUBRIC:', rubricIds.length);

if (missingInRubric.length) {
  console.log('\n⚠︎ Faltando NO RUBRIC (aparecem no REASON_MAP mas não no rubric):');
  missingInRubric.forEach((id) => console.log('  -', id));
}

if (unusedInBridge.length) {
  console.log('\nℹ︎ Presentes no RUBRIC mas não usados no REASON_MAP:');
  unusedInBridge.forEach((id) => console.log('  -', id));
}

if (!missingInRubric.length) console.log('\n✓ Tudo que o REASON_MAP referencia existe no rubric.');
