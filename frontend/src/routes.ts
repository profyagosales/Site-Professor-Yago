export const ROUTES = {
  home: "/",
  loginProfessor: "/login-professor",
  prof: {
    base: "/professor",
    resumo: "/professor/resumo",
    turmas: "/professor/turmas",
    notas: "/professor/notas-da-classe",
    caderno: "/professor/caderno",
    gabarito: "/professor/gabarito",
    redacao: "/professor/redacao",
    redacaoId: (id: string = ":id") => `/professor/redacao/${id}`,
  },
} as const;
