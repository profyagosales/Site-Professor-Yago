/**
 * Função para validar rotas em desenvolvimento
 * Lança erro se o path estiver vazio ou não começar com "/"
 */
function assertRoute(name: string, path: string): void {
  if (process.env.NODE_ENV === 'development') {
    if (!path || path.trim() === '') {
      throw new Error(`Route "${name}" cannot be empty`);
    }
    if (!path.startsWith('/')) {
      throw new Error(`Route "${name}" must start with "/", got: "${path}"`);
    }
  }
}

export const ROUTES = {
  home: (() => {
    const path = '/';
    assertRoute('home', path);
    return path;
  })(),
  auth: {
    loginProf: (() => {
      const path = '/login-professor';
      assertRoute('auth.loginProf', path);
      return path;
    })(),
    loginAluno: (() => {
      const path = '/login-aluno';
      assertRoute('auth.loginAluno', path);
      return path;
    })(),
  },
  prof: {
    base: (() => {
      const path = '/professor';
      assertRoute('prof.base', path);
      return path;
    })(),
    root: (() => {
      const path = '/professor';
      assertRoute('prof.root', path);
      return path;
    })(),
    resumo: (() => {
      const path = '/professor/resumo';
      assertRoute('prof.resumo', path);
      return path;
    })(),
    turmas: (() => {
      const path = '/professor/turmas';
      assertRoute('prof.turmas', path);
      return path;
    })(),
    notasClasse: (() => {
      const path = '/professor/notas-da-classe';
      assertRoute('prof.notasClasse', path);
      return path;
    })(),
    caderno: (() => {
      const path = '/professor/caderno';
      assertRoute('prof.caderno', path);
      return path;
    })(),
    gabarito: (() => {
      const path = '/professor/gabarito';
      assertRoute('prof.gabarito', path);
      return path;
    })(),
    redacao: (() => {
      const path = '/professor/redacao';
      assertRoute('prof.redacao', path);
      return path;
    })(),
    redacaoShow: (id: string) => {
      const path = `/professor/redacao/${id}`;
      assertRoute('prof.redacaoShow', path);
      return path;
    },
    alunos: (() => {
      const path = '/professor/alunos';
      assertRoute('prof.alunos', path);
      return path;
    })(),
    alunoPerfil: (id: string) => {
      const path = `/professor/alunos/${id}`;
      assertRoute('prof.alunoPerfil', path);
      return path;
    },
    turmaAlunos: (id: string) => {
      const path = `/professor/turmas/${id}/alunos`;
      assertRoute('prof.turmaAlunos', path);
      return path;
    },
    turmaCaderno: (id: string) => {
      const path = `/professor/turmas/${id}/caderno`;
      assertRoute('prof.turmaCaderno', path);
      return path;
    },
    turmaDetalhes: (id: string) => {
      const path = `/professor/turmas/${id}`;
      assertRoute('prof.turmaDetalhes', path);
      return path;
    },
    avisos: (() => {
      const path = '/professor/avisos';
      assertRoute('prof.avisos', path);
      return path;
    })(),
  },
  aluno: {
    login: (() => {
      const path = '/login-aluno';
      assertRoute('aluno.login', path);
      return path;
    })(),
    base: (() => {
      const path = '/aluno';
      assertRoute('aluno.base', path);
      return path;
    })(),
    resumo: (() => {
      const path = '/aluno/resumo';
      assertRoute('aluno.resumo', path);
      return path;
    })(),
    notas: (() => {
      const path = '/aluno/notas';
      assertRoute('aluno.notas', path);
      return path;
    })(),
    recados: (() => {
      const path = '/aluno/recados';
      assertRoute('aluno.recados', path);
      return path;
    })(),
    gabaritos: (() => {
      const path = '/aluno/gabaritos';
      assertRoute('aluno.gabaritos', path);
      return path;
    })(),
    redacao: (() => {
      const path = '/aluno/redacao';
      assertRoute('aluno.redacao', path);
      return path;
    })(),
    caderno: (() => {
      const path = '/aluno/caderno';
      assertRoute('aluno.caderno', path);
      return path;
    })(),
    redacoes: (() => {
      const path = '/aluno/redacoes';
      assertRoute('aluno.redacoes', path);
      return path;
    })(),
    // Mantendo compatibilidade com estrutura existente
    landing: (() => {
      const path = '/aluno/resumo'; // landing redireciona para resumo
      assertRoute('aluno.landing', path);
      return path;
    })(),
    dashboard: 'resumo', // path relativo
  },
  notFound: (() => {
    const path = '*';
    // Catch-all routes são especiais e não precisam começar com "/"
    if (process.env.NODE_ENV === 'development') {
      if (!path || path.trim() === '') {
        throw new Error(`Route "notFound" cannot be empty`);
      }
      // Catch-all routes podem ser "*" ou "/*"
      if (path !== '*' && path !== '/*' && !path.startsWith('/')) {
        throw new Error(
          `Route "notFound" must be "*", "/*", or start with "/", got: "${path}"`
        );
      }
    }
    return path;
  })(),
} as const;
