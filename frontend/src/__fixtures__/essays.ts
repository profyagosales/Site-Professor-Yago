/**
 * Fixtures de dados para redações
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface EssayFixture {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  topic: string;
  type: 'ENEM' | 'PAS' | 'outro';
  bimester: string;
  status: 'pendente' | 'corrigida' | 'enviada';
  grade?: number;
  comments?: string;
  fileUrl?: string;
  submittedAt: string;
  correctedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const essays: EssayFixture[] = [
  {
    id: 'essay-1',
    studentId: 'student-1',
    studentName: 'Ana Silva Santos',
    studentEmail: 'ana.silva@escola.com',
    classId: 'class-1',
    className: '9º A',
    topic: 'Mobilidade Urbana Sustentável',
    type: 'ENEM',
    bimester: '1',
    status: 'pendente',
    fileUrl: 'https://example.com/essay-1.pdf',
    submittedAt: '2024-01-20T10:00:00Z',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'essay-2',
    studentId: 'student-2',
    studentName: 'Bruno Oliveira Costa',
    studentEmail: 'bruno.oliveira@escola.com',
    classId: 'class-1',
    className: '9º A',
    topic: 'Inclusão Digital na Educação',
    type: 'PAS',
    bimester: '1',
    status: 'corrigida',
    grade: 8.5,
    comments: 'Excelente argumentação e estrutura. Pontos a melhorar: uso de conectivos e conclusão mais robusta.',
    fileUrl: 'https://example.com/essay-2.pdf',
    submittedAt: '2024-01-19T14:30:00Z',
    correctedAt: '2024-01-21T09:15:00Z',
    createdAt: '2024-01-19T14:30:00Z',
    updatedAt: '2024-01-21T09:15:00Z',
  },
  {
    id: 'essay-3',
    studentId: 'student-3',
    studentName: 'Carla Mendes Lima',
    studentEmail: 'carla.mendes@escola.com',
    classId: 'class-1',
    className: '9º A',
    topic: 'Sustentabilidade Ambiental',
    type: 'ENEM',
    bimester: '1',
    status: 'corrigida',
    grade: 7.8,
    comments: 'Boa introdução e desenvolvimento. Atenção à ortografia e uso de vírgulas.',
    fileUrl: 'https://example.com/essay-3.pdf',
    submittedAt: '2024-01-18T16:45:00Z',
    correctedAt: '2024-01-20T11:30:00Z',
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-20T11:30:00Z',
  },
  {
    id: 'essay-4',
    studentId: 'student-4',
    studentName: 'Diego Rodrigues Pereira',
    studentEmail: 'diego.rodrigues@escola.com',
    classId: 'class-2',
    className: '9º B',
    topic: 'Democracia e Participação Social',
    type: 'PAS',
    bimester: '1',
    status: 'pendente',
    fileUrl: 'https://example.com/essay-4.pdf',
    submittedAt: '2024-01-21T08:20:00Z',
    createdAt: '2024-01-21T08:20:00Z',
    updatedAt: '2024-01-21T08:20:00Z',
  },
  {
    id: 'essay-5',
    studentId: 'student-5',
    studentName: 'Elisa Ferreira Souza',
    studentEmail: 'elisa.ferreira@escola.com',
    classId: 'class-2',
    className: '9º B',
    topic: 'Tecnologia e Sociedade',
    type: 'ENEM',
    bimester: '1',
    status: 'corrigida',
    grade: 9.2,
    comments: 'Redação exemplar! Excelente domínio da língua portuguesa, argumentação sólida e proposta de intervenção bem estruturada.',
    fileUrl: 'https://example.com/essay-5.pdf',
    submittedAt: '2024-01-17T13:15:00Z',
    correctedAt: '2024-01-19T15:45:00Z',
    createdAt: '2024-01-17T13:15:00Z',
    updatedAt: '2024-01-19T15:45:00Z',
  },
  {
    id: 'essay-6',
    studentId: 'student-6',
    studentName: 'Fabio Almeida Rocha',
    studentEmail: 'fabio.almeida@escola.com',
    classId: 'class-3',
    className: '8º A',
    topic: 'História do Brasil Colonial',
    type: 'outro',
    bimester: '1',
    status: 'pendente',
    fileUrl: 'https://example.com/essay-6.pdf',
    submittedAt: '2024-01-22T09:30:00Z',
    createdAt: '2024-01-22T09:30:00Z',
    updatedAt: '2024-01-22T09:30:00Z',
  },
  {
    id: 'essay-7',
    studentId: 'student-7',
    studentName: 'Gabriela Nunes Barbosa',
    studentEmail: 'gabriela.nunes@escola.com',
    classId: 'class-3',
    className: '8º A',
    topic: 'Revolução Industrial',
    type: 'outro',
    bimester: '1',
    status: 'corrigida',
    grade: 8.0,
    comments: 'Bom conteúdo histórico, mas precisa melhorar a estrutura do texto.',
    fileUrl: 'https://example.com/essay-7.pdf',
    submittedAt: '2024-01-16T11:45:00Z',
    correctedAt: '2024-01-18T14:20:00Z',
    createdAt: '2024-01-16T11:45:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
  },
  {
    id: 'essay-8',
    studentId: 'student-8',
    studentName: 'Henrique Castro Silva',
    studentEmail: 'henrique.castro@escola.com',
    classId: 'class-4',
    className: '8º B',
    topic: 'Geografia Física do Brasil',
    type: 'outro',
    bimester: '1',
    status: 'pendente',
    fileUrl: 'https://example.com/essay-8.pdf',
    submittedAt: '2024-01-23T07:15:00Z',
    createdAt: '2024-01-23T07:15:00Z',
    updatedAt: '2024-01-23T07:15:00Z',
  },
  {
    id: 'essay-9',
    studentId: 'student-9',
    studentName: 'Isabela Santos Oliveira',
    studentEmail: 'isabela.santos@escola.com',
    classId: 'class-4',
    className: '8º B',
    topic: 'Biodiversidade Amazônica',
    type: 'outro',
    bimester: '1',
    status: 'corrigida',
    grade: 7.5,
    comments: 'Conteúdo interessante, mas precisa de mais fontes e argumentação.',
    fileUrl: 'https://example.com/essay-9.pdf',
    submittedAt: '2024-01-15T12:00:00Z',
    correctedAt: '2024-01-17T16:30:00Z',
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-17T16:30:00Z',
  },
  {
    id: 'essay-10',
    studentId: 'student-10',
    studentName: 'João Pedro Lima Costa',
    studentEmail: 'joao.pedro@escola.com',
    classId: 'class-5',
    className: '7º A',
    topic: 'Sistema Solar',
    type: 'outro',
    bimester: '1',
    status: 'corrigida',
    grade: 8.8,
    comments: 'Muito bom! Demonstra conhecimento científico e boa escrita.',
    fileUrl: 'https://example.com/essay-10.pdf',
    submittedAt: '2024-01-14T15:30:00Z',
    correctedAt: '2024-01-16T10:15:00Z',
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-16T10:15:00Z',
  },
];

export const essaysByStatus = {
  pendente: essays.filter(e => e.status === 'pendente'),
  corrigida: essays.filter(e => e.status === 'corrigida'),
  enviada: essays.filter(e => e.status === 'enviada'),
};

export const essaysByClass = {
  'class-1': essays.filter(e => e.classId === 'class-1'),
  'class-2': essays.filter(e => e.classId === 'class-2'),
  'class-3': essays.filter(e => e.classId === 'class-3'),
  'class-4': essays.filter(e => e.classId === 'class-4'),
  'class-5': essays.filter(e => e.classId === 'class-5'),
};

export const essaysByType = {
  ENEM: essays.filter(e => e.type === 'ENEM'),
  PAS: essays.filter(e => e.type === 'PAS'),
  outro: essays.filter(e => e.type === 'outro'),
};

export const essaysByBimester = {
  '1': essays.filter(e => e.bimester === '1'),
  '2': essays.filter(e => e.bimester === '2'),
  '3': essays.filter(e => e.bimester === '3'),
  '4': essays.filter(e => e.bimester === '4'),
};

export default essays;
