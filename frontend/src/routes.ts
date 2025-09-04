export const ROUTES = {
  home: "/",
  auth: {
    loginProf: "/login-professor",
    loginAluno: "/login-aluno",
  },
  prof: {
    base: "/professor",
    resumo: "/professor/resumo",
    turmas: "/professor/turmas",
    notasClasse: "/professor/notas-da-classe",
    caderno: "/professor/caderno",
    gabarito: "/professor/gabarito",
    redacao: "/professor/redacao",
    redacaoShow: (id: string) => `/professor/redacao/${id}`,
  },
  aluno: {
    base: "/aluno",
    resumo: "/aluno/resumo",
    notas: "/aluno/notas",
    recados: "/aluno/recados",
    redacao: "/aluno/redacao",
  },
  notFound: "*",
} as const;
