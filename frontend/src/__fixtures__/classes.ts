/**
 * Fixtures de dados para turmas
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface ClassFixture {
  id: string;
  series: number;
  letter: string;
  discipline: string;
  className: string;
  teacherId: string;
  teacherName: string;
  schedule: Array<{
    day: string;
    slot: number;
    time: string;
  }>;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export const classes: ClassFixture[] = [
  {
    id: 'class-1',
    series: 9,
    letter: 'A',
    discipline: 'Matemática',
    className: '9º A',
    teacherId: 'teacher-1',
    teacherName: 'Prof. João Silva',
    schedule: [
      { day: 'Segunda', slot: 1, time: '08:00' },
      { day: 'Quarta', slot: 2, time: '10:00' },
      { day: 'Sexta', slot: 3, time: '14:00' },
    ],
    isActive: true,
    studentCount: 3,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'class-2',
    series: 9,
    letter: 'B',
    discipline: 'Português',
    className: '9º B',
    teacherId: 'teacher-2',
    teacherName: 'Prof. Maria Santos',
    schedule: [
      { day: 'Terça', slot: 1, time: '08:00' },
      { day: 'Quinta', slot: 2, time: '10:00' },
    ],
    isActive: true,
    studentCount: 2,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'class-3',
    series: 8,
    letter: 'A',
    discipline: 'História',
    className: '8º A',
    teacherId: 'teacher-3',
    teacherName: 'Prof. Carlos Oliveira',
    schedule: [
      { day: 'Segunda', slot: 2, time: '10:00' },
      { day: 'Quarta', slot: 3, time: '14:00' },
    ],
    isActive: true,
    studentCount: 2,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'class-4',
    series: 8,
    letter: 'B',
    discipline: 'Geografia',
    className: '8º B',
    teacherId: 'teacher-4',
    teacherName: 'Prof. Ana Costa',
    schedule: [
      { day: 'Terça', slot: 2, time: '10:00' },
      { day: 'Quinta', slot: 3, time: '14:00' },
    ],
    isActive: true,
    studentCount: 2,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'class-5',
    series: 7,
    letter: 'A',
    discipline: 'Ciências',
    className: '7º A',
    teacherId: 'teacher-5',
    teacherName: 'Prof. Pedro Lima',
    schedule: [
      { day: 'Segunda', slot: 3, time: '14:00' },
      { day: 'Sexta', slot: 1, time: '08:00' },
    ],
    isActive: true,
    studentCount: 1,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
];

export const classesBySeries = {
  7: classes.filter(c => c.series === 7),
  8: classes.filter(c => c.series === 8),
  9: classes.filter(c => c.series === 9),
};

export const classesByTeacher = {
  'teacher-1': classes.filter(c => c.teacherId === 'teacher-1'),
  'teacher-2': classes.filter(c => c.teacherId === 'teacher-2'),
  'teacher-3': classes.filter(c => c.teacherId === 'teacher-3'),
  'teacher-4': classes.filter(c => c.teacherId === 'teacher-4'),
  'teacher-5': classes.filter(c => c.teacherId === 'teacher-5'),
};

export default classes;
