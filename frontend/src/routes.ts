export const ROUTES = {
  home: "/",
  loginProfessor: "/login-professor",
  loginAluno: "/login-aluno",

  prof: {
    base: "/professor",
    root: "/professor",
    resumo: "/professor/resumo",
    turmas: "/professor/turmas",
    notasDaClasse: "/professor/notas-da-classe",
    notas: "/professor/notas-da-classe",
    caderno: "/professor/caderno",
    gabarito: "/professor/gabarito",
    redacao: "/professor/redacao",
    redacaoItem: (id: string) => `/professor/redacao/${id}`,
    alunos: "/professor/alunos",
    alunoPerfil: (id: string) => `/professor/alunos/${id}`,
  },

  aluno: {
    base: "/aluno",
    landing: "/aluno/caderno",
    dashboard: "/aluno/dashboard",
    caderno: "/aluno/caderno",
    gabaritos: "/aluno/gabaritos",
    redacoes: "/aluno/redacoes",
    notas: "/aluno/notas",
  },

  legacy: {
    dashboardAluno: "/dashboard-aluno",
  },

  auth: {
    loginProf: "/login-professor",
    loginAluno: "/login-aluno",
  },
} as const;
