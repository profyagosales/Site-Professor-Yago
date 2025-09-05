/**
 * Fixtures de dados para estudantes
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface StudentFixture {
  id: string;
  name: string;
  email: string;
  classId: string;
  className: string;
  series: number;
  letter: string;
  discipline: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const students: StudentFixture[] = [
  {
    id: 'student-1',
    name: 'Ana Silva Santos',
    email: 'ana.silva@escola.com',
    classId: 'class-1',
    className: '9º A',
    series: 9,
    letter: 'A',
    discipline: 'Matemática',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-2',
    name: 'Bruno Oliveira Costa',
    email: 'bruno.oliveira@escola.com',
    classId: 'class-1',
    className: '9º A',
    series: 9,
    letter: 'A',
    discipline: 'Matemática',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-3',
    name: 'Carla Mendes Lima',
    email: 'carla.mendes@escola.com',
    classId: 'class-1',
    className: '9º A',
    series: 9,
    letter: 'A',
    discipline: 'Matemática',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-4',
    name: 'Diego Rodrigues Pereira',
    email: 'diego.rodrigues@escola.com',
    classId: 'class-2',
    className: '9º B',
    series: 9,
    letter: 'B',
    discipline: 'Português',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-5',
    name: 'Elisa Ferreira Souza',
    email: 'elisa.ferreira@escola.com',
    classId: 'class-2',
    className: '9º B',
    series: 9,
    letter: 'B',
    discipline: 'Português',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-6',
    name: 'Fabio Almeida Rocha',
    email: 'fabio.almeida@escola.com',
    classId: 'class-3',
    className: '8º A',
    series: 8,
    letter: 'A',
    discipline: 'História',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-7',
    name: 'Gabriela Nunes Barbosa',
    email: 'gabriela.nunes@escola.com',
    classId: 'class-3',
    className: '8º A',
    series: 8,
    letter: 'A',
    discipline: 'História',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-8',
    name: 'Henrique Castro Silva',
    email: 'henrique.castro@escola.com',
    classId: 'class-4',
    className: '8º B',
    series: 8,
    letter: 'B',
    discipline: 'Geografia',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-9',
    name: 'Isabela Santos Oliveira',
    email: 'isabela.santos@escola.com',
    classId: 'class-4',
    className: '8º B',
    series: 8,
    letter: 'B',
    discipline: 'Geografia',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'student-10',
    name: 'João Pedro Lima Costa',
    email: 'joao.pedro@escola.com',
    classId: 'class-5',
    className: '7º A',
    series: 7,
    letter: 'A',
    discipline: 'Ciências',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
];

export const studentsByClass = {
  'class-1': students.filter(s => s.classId === 'class-1'),
  'class-2': students.filter(s => s.classId === 'class-2'),
  'class-3': students.filter(s => s.classId === 'class-3'),
  'class-4': students.filter(s => s.classId === 'class-4'),
  'class-5': students.filter(s => s.classId === 'class-5'),
};

export const studentsBySeries = {
  7: students.filter(s => s.series === 7),
  8: students.filter(s => s.series === 8),
  9: students.filter(s => s.series === 9),
};

export default students;
