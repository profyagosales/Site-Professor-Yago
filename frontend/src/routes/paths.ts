// frontend/src/routes/paths.ts
export const HOME_PATH = '/';
export const LOGIN_ALUNO_PATH = '/aluno/login';
export const LOGIN_PROFESSOR_PATH = '/professor/login';

// Rotas públicas (não exigem auth)
export const PUBLIC_ROUTES = new Set<string>([
  HOME_PATH,
  LOGIN_ALUNO_PATH,
  LOGIN_PROFESSOR_PATH,
]);
