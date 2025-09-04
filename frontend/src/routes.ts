export const ROUTES = {
  home: '/',
  auth: {
    loginProf: '/login-professor',
    loginAluno: '/login-aluno',
  },
  prof: {
    base: '/professor',
    root: '/professor',
    resumo: '/professor/resumo',      // usamos explicitamente nos links
    turmas: '/professor/turmas',
    notas: '/professor/notas-da-classe',
    notasDaClasse: '/professor/notas-da-classe',
    caderno: '/professor/caderno',
    gabarito: '/professor/gabarito',
    redacao: '/professor/redacao',
    redacaoItem: (id: string) => `/professor/redacao/${id}`,
    alunos: '/professor/alunos',
    alunoPerfil: (id: string) => `/professor/alunos/${id}`,
  },
  aluno: {
    base: '/aluno',
    landing: '/aluno/caderno',
    dashboard: '/aluno/dashboard',
    caderno: '/aluno/caderno',
    gabaritos: '/aluno/gabaritos',
    redacoes: '/aluno/redacoes',
    notas: '/aluno/notas',
  },
  legacy: {
    dashboardAluno: '/dashboard-aluno',
  },
} as const;
