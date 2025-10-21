export type EntityKey = "student" | "class" | "activity";

export const ENTITY_LABEL: Record<EntityKey, string> = {
  student: "Alunos",
  class: "Turmas",
  activity: "Atividades",
};

export function resolveEntityLabel(key: string): string {
  return ENTITY_LABEL[key as EntityKey] ?? key;
}

/** Aliases para compatibilidade retroativa */
export const entityMap = ENTITY_LABEL;
export const resolveEntity = resolveEntityLabel;

