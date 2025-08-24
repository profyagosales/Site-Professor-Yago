export type NavItem = { label: string; to: string };

export const NAV_TEACHER: NavItem[] = [
  { label: "Turmas", to: "/turmas" },
  { label: "Notas da Classe", to: "/notas-classe" },
  { label: "Caderno", to: "/caderno-classe" },
  { label: "Gabarito", to: "/corrigir-gabaritos" },
  { label: "Redação", to: "/dashboard-redacoes" },
];

export const NAV_STUDENT: NavItem[] = [
  { label: "Notas", to: "/aluno/notas" },
  { label: "Caderno", to: "/aluno/caderno" },
  { label: "Gabarito", to: "/aluno/gabarito" },
  { label: "Redação", to: "/aluno/redacoes" },
];
