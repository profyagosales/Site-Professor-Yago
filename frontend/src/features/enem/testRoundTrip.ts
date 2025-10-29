import { COMPOSERS, REASON_MAP, buildSelectionFromReasonIds, buildSavePayload } from './composerBridge';
import type { ComposerId, LevelComposer } from './composerBridge';
import type { RubricReasonId } from './rubricReasonIds';

export function selfTestRoundTrip() {
  const problems: string[] = [];

  const entries = Object.entries(COMPOSERS) as Array<[ComposerId, LevelComposer]>;

  for (const [composerId, composer] of entries) {
    const reasonEntries = REASON_MAP[composerId] ?? {};
    const picked: RubricReasonId[] = [];

    composer.pieces.forEach((piece) => {
      const entry = reasonEntries[piece.key];
      if (!entry) return;

      if (entry.kind === 'MANDATORY') {
        if (entry.reasonId) picked.push(entry.reasonId);
        return;
      }

      if (entry.kind === 'CHOICE_SINGLE') {
        const first = Object.values(entry.options)[0];
        if (first) picked.push(first);
        return;
      }

      if (entry.kind === 'CHOICE_MULTI') {
        const first = Object.values(entry.options)[0];
        if (first) picked.push(first);
        return;
      }

      if (entry.kind === 'MONOBLOCK') {
        if (entry.reasonId) picked.push(entry.reasonId);
      }
    });

    const selection = buildSelectionFromReasonIds(composer, picked);
    const payload = buildSavePayload(composer, selection);
    const check = (payload.reasonIds ?? []).slice().sort().join('|');
    const orig = picked.slice().sort().join('|');
    if (check !== orig) {
      problems.push(`${composerId} round-trip falhou: ${orig} => ${check}`);
    }
  }

  if (problems.length) {
    console.warn('[ENEM composer RT]', problems);
  } else {
    console.log('✓ ENEM composer: round-trip OK para', entries.length, 'composers');
  }
}
