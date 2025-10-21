export const ENTITY_MAP = {
  student: 'Alunos',
  class: 'Turmas',
  activity: 'Atividades',
} as const;

export type EntityKey = keyof typeof ENTITY_MAP;

const ENTITY_KEYS = Object.keys(ENTITY_MAP) as EntityKey[];

const DEFAULT_ENTITY_KEY: EntityKey = 'student';

export const toEntityKey = (entity: unknown): EntityKey => {
  if (typeof entity === 'string' && ENTITY_KEYS.includes(entity as EntityKey)) {
    return entity as EntityKey;
  }
  return DEFAULT_ENTITY_KEY;
};

export const getEntityLabel = (entity: unknown): (typeof ENTITY_MAP)[EntityKey] =>
  ENTITY_MAP[toEntityKey(entity)];

// (opcional) outras constantes do Radar
export const DEFAULT_LIMIT = 10;
