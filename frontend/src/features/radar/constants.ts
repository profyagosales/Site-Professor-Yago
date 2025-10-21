export const ENTITY_MAP = {
  student: 'Alunos',
  class: 'Turmas',
  activity: 'Atividades',
} as const;

export type EntityKey = keyof typeof ENTITY_MAP;

export const ENTITY_KEYS = Object.keys(ENTITY_MAP) as EntityKey[];

export const DEFAULT_ENTITY_KEY: EntityKey = 'student';

export const toEntityKey = (entity: unknown): EntityKey => {
  if (typeof entity === 'string' && ENTITY_KEYS.includes(entity as EntityKey)) {
    return entity as EntityKey;
  }
  return DEFAULT_ENTITY_KEY;
};

export const getEntityLabel = (entity: unknown): (typeof ENTITY_MAP)[EntityKey] =>
  ENTITY_MAP[toEntityKey(entity)];

// HOTFIX: garante que bundles antigos que referenciam `entityMap` não quebrem.
if (typeof globalThis === 'object' && globalThis) {
  const scope = globalThis as Record<string, unknown>;
  scope.entityMap = scope.entityMap ?? ENTITY_MAP;
}

// (opcional) outras constantes do Radar
export const DEFAULT_LIMIT = 10;
