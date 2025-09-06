// frontend/src/routes/paths.ts
export const HOME_PATH = '/';
export const LOGIN_ALUNO_PATH = '/login-aluno';
export const LOGIN_PROFESSOR_PATH = '/login-professor';

// Rotas públicas (não exigem auth)
export const PUBLIC_ROUTES = new Set<string>([
  HOME_PATH,
  LOGIN_ALUNO_PATH,
  LOGIN_PROFESSOR_PATH,
]);

// Aliases legados que devem redirecionar para as slugs antigas
export const LEGACY_ALIASES: Record<string, string> = {
  '/aluno/login': LOGIN_ALUNO_PATH,
  '/professor/login': LOGIN_PROFESSOR_PATH,
  '/login': LOGIN_ALUNO_PATH,
};
