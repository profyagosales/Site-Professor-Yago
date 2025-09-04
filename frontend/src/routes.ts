export const ROUTES = {
  home: "/",
  auth: {
    loginProf: "/login-professor",
    loginAluno: "/login-aluno",
  },
  prof: {
    base: "/professor",
    root: "/professor",
    resumo: "/professor/resumo",
    turmas: "/professor/turmas",
    notasClasse: "/professor/notas-da-classe",
    caderno: "/professor/caderno",
    gabarito: "/professor/gabarito",
    redacao: "/professor/redacao",
    redacaoShow: (id: string) => `/professor/redacao/${id}`,
  },
  aluno: {
    login: "/login-aluno",
    base: "/aluno",
    resumo: "/aluno/resumo",
    notas: "/aluno/notas",
    recados: "/aluno/recados",
    redacao: "/aluno/redacao",
    caderno: "/aluno/caderno",
    gabaritos: "/aluno/gabaritos",
    redacoes: "/aluno/redacoes",
    // Mantendo compatibilidade com estrutura existente
    landing: "/aluno/resumo", // landing redireciona para resumo
    dashboard: "resumo", // path relativo
  },
  notFound: "*",
} as const;
