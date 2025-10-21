const FALLBACK_ENTITY_MAP = {
  student: 'Alunos',
  class: 'Turmas',
  activity: 'Atividades',
} as const;

// HOTFIX de proteção — pode remover depois que padronizar os imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const entityMap: typeof FALLBACK_ENTITY_MAP =
  ((globalThis as { __IGNORED__?: typeof FALLBACK_ENTITY_MAP }).__IGNORED__ as
    | typeof FALLBACK_ENTITY_MAP
    | undefined) ?? FALLBACK_ENTITY_MAP;

export const ENTITY_MAP = Object.freeze(entityMap);

export type EntityKey = keyof typeof ENTITY_MAP;

export const ENTITY_KEYS: readonly EntityKey[] = Object.freeze(
  Object.keys(ENTITY_MAP) as EntityKey[],
);

export const DEFAULT_ENTITY_KEY: EntityKey = 'student';

export function ensureEntityKey(entity: unknown): EntityKey {
  return ENTITY_KEYS.includes(entity as EntityKey)
    ? (entity as EntityKey)
    : DEFAULT_ENTITY_KEY;
}

export function getEntityLabel(entity: unknown): (typeof ENTITY_MAP)[EntityKey] {
  return ENTITY_MAP[ensureEntityKey(entity)];
}

// (optional) outras constantes do Radar
export const DEFAULT_LIMIT = 10;
