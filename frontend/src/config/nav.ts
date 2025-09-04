import { ROUTES } from '@/routes';

export type NavItem = { label: string; to: string };

export const NAV_TEACHER: NavItem[] = [
  { label: 'Turmas', to: ROUTES.prof.turmas },
  { label: 'Notas da Classe', to: ROUTES.prof.notasClasse },
  { label: 'Caderno', to: ROUTES.prof.caderno },
  { label: 'Gabarito', to: ROUTES.prof.gabarito },
  { label: 'Redação', to: ROUTES.prof.redacao },
];

export const NAV_STUDENT: NavItem[] = [
  { label: 'Notas', to: ROUTES.aluno.notas },
  { label: 'Caderno', to: ROUTES.aluno.caderno },
  { label: 'Gabarito', to: ROUTES.aluno.gabaritos },
  { label: 'Redação', to: ROUTES.aluno.redacoes },
];
