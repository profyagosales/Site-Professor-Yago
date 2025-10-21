export type EntityKey = "student" | "class" | "activity";

export const ENTITY_LABEL: Record<EntityKey, string> = {
  student: "Alunos",
  class: "Turmas",
  activity: "Atividades",
};

// label -> key
export const ENTITY_BY_LABEL = Object.fromEntries(
  Object.entries(ENTITY_LABEL).map(([k, v]) => [v, k])
) as Record<(typeof ENTITY_LABEL)[keyof typeof ENTITY_LABEL], EntityKey>;

// retrocompat
export const entityMap = ENTITY_BY_LABEL;
// Provide a label resolver for entity keys
export function resolveEntityLabel(key: EntityKey): (typeof ENTITY_LABEL)[EntityKey] {
  return ENTITY_LABEL[key] ?? (key as any);
}
