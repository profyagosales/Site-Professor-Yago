/**
 * Fixtures de dados para diário (presença e atividades)
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface DiaryEntryFixture {
  id: string;
  classId: string;
  date: string;
  studentId: string;
  present: boolean;
  activity: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryHistoryFixture {
  date: string;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  activities: string[];
  entries: DiaryEntryFixture[];
}

export const diaryEntries: DiaryEntryFixture[] = [
  // Entradas para 2024-01-15 (Segunda-feira)
  {
    id: 'diary-1',
    classId: 'class-1',
    date: '2024-01-15',
    studentId: 'student-1',
    present: true,
    activity: 'Aula de álgebra - resolução de equações do 2º grau',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'diary-2',
    classId: 'class-1',
    date: '2024-01-15',
    studentId: 'student-2',
    present: true,
    activity: 'Aula de álgebra - resolução de equações do 2º grau',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'diary-3',
    classId: 'class-1',
    date: '2024-01-15',
    studentId: 'student-3',
    present: false,
    activity: 'Aula de álgebra - resolução de equações do 2º grau',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },

  // Entradas para 2024-01-16 (Terça-feira)
  {
    id: 'diary-4',
    classId: 'class-1',
    date: '2024-01-16',
    studentId: 'student-1',
    present: true,
    activity: 'Exercícios de geometria - cálculo de áreas',
    createdAt: '2024-01-16T08:00:00Z',
    updatedAt: '2024-01-16T08:00:00Z',
  },
  {
    id: 'diary-5',
    classId: 'class-1',
    date: '2024-01-16',
    studentId: 'student-2',
    present: true,
    activity: 'Exercícios de geometria - cálculo de áreas',
    createdAt: '2024-01-16T08:00:00Z',
    updatedAt: '2024-01-16T08:00:00Z',
  },
  {
    id: 'diary-6',
    classId: 'class-1',
    date: '2024-01-16',
    studentId: 'student-3',
    present: true,
    activity: 'Exercícios de geometria - cálculo de áreas',
    createdAt: '2024-01-16T08:00:00Z',
    updatedAt: '2024-01-16T08:00:00Z',
  },

  // Entradas para 2024-01-17 (Quarta-feira)
  {
    id: 'diary-7',
    classId: 'class-1',
    date: '2024-01-17',
    studentId: 'student-1',
    present: true,
    activity: 'Prova de álgebra - equações e funções',
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-01-17T08:00:00Z',
  },
  {
    id: 'diary-8',
    classId: 'class-1',
    date: '2024-01-17',
    studentId: 'student-2',
    present: true,
    activity: 'Prova de álgebra - equações e funções',
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-01-17T08:00:00Z',
  },
  {
    id: 'diary-9',
    classId: 'class-1',
    date: '2024-01-17',
    studentId: 'student-3',
    present: false,
    activity: 'Prova de álgebra - equações e funções',
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-01-17T08:00:00Z',
  },

  // Entradas para 2024-01-18 (Quinta-feira)
  {
    id: 'diary-10',
    classId: 'class-1',
    date: '2024-01-18',
    studentId: 'student-1',
    present: true,
    activity: 'Correção da prova e exercícios de revisão',
    createdAt: '2024-01-18T08:00:00Z',
    updatedAt: '2024-01-18T08:00:00Z',
  },
  {
    id: 'diary-11',
    classId: 'class-1',
    date: '2024-01-18',
    studentId: 'student-2',
    present: true,
    activity: 'Correção da prova e exercícios de revisão',
    createdAt: '2024-01-18T08:00:00Z',
    updatedAt: '2024-01-18T08:00:00Z',
  },
  {
    id: 'diary-12',
    classId: 'class-1',
    date: '2024-01-18',
    studentId: 'student-3',
    present: true,
    activity: 'Correção da prova e exercícios de revisão',
    createdAt: '2024-01-18T08:00:00Z',
    updatedAt: '2024-01-18T08:00:00Z',
  },

  // Entradas para 2024-01-19 (Sexta-feira)
  {
    id: 'diary-13',
    classId: 'class-1',
    date: '2024-01-19',
    studentId: 'student-1',
    present: true,
    activity: 'Introdução à trigonometria - seno, cosseno e tangente',
    createdAt: '2024-01-19T08:00:00Z',
    updatedAt: '2024-01-19T08:00:00Z',
  },
  {
    id: 'diary-14',
    classId: 'class-1',
    date: '2024-01-19',
    studentId: 'student-2',
    present: true,
    activity: 'Introdução à trigonometria - seno, cosseno e tangente',
    createdAt: '2024-01-19T08:00:00Z',
    updatedAt: '2024-01-19T08:00:00Z',
  },
  {
    id: 'diary-15',
    classId: 'class-1',
    date: '2024-01-19',
    studentId: 'student-3',
    present: false,
    activity: 'Introdução à trigonometria - seno, cosseno e tangente',
    createdAt: '2024-01-19T08:00:00Z',
    updatedAt: '2024-01-19T08:00:00Z',
  },

  // Entradas para outras turmas
  {
    id: 'diary-16',
    classId: 'class-2',
    date: '2024-01-15',
    studentId: 'student-4',
    present: true,
    activity: 'Aula de literatura - análise de poemas',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'diary-17',
    classId: 'class-2',
    date: '2024-01-15',
    studentId: 'student-5',
    present: true,
    activity: 'Aula de literatura - análise de poemas',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

export const diaryHistory: DiaryHistoryFixture[] = [
  {
    date: '2024-01-15',
    presentCount: 2,
    absentCount: 1,
    totalStudents: 3,
    activities: ['Aula de álgebra - resolução de equações do 2º grau'],
    entries: diaryEntries.filter(e => e.date === '2024-01-15' && e.classId === 'class-1'),
  },
  {
    date: '2024-01-16',
    presentCount: 3,
    absentCount: 0,
    totalStudents: 3,
    activities: ['Exercícios de geometria - cálculo de áreas'],
    entries: diaryEntries.filter(e => e.date === '2024-01-16' && e.classId === 'class-1'),
  },
  {
    date: '2024-01-17',
    presentCount: 2,
    absentCount: 1,
    totalStudents: 3,
    activities: ['Prova de álgebra - equações e funções'],
    entries: diaryEntries.filter(e => e.date === '2024-01-17' && e.classId === 'class-1'),
  },
  {
    date: '2024-01-18',
    presentCount: 3,
    absentCount: 0,
    totalStudents: 3,
    activities: ['Correção da prova e exercícios de revisão'],
    entries: diaryEntries.filter(e => e.date === '2024-01-18' && e.classId === 'class-1'),
  },
  {
    date: '2024-01-19',
    presentCount: 2,
    absentCount: 1,
    totalStudents: 3,
    activities: ['Introdução à trigonometria - seno, cosseno e tangente'],
    entries: diaryEntries.filter(e => e.date === '2024-01-19' && e.classId === 'class-1'),
  },
];

export const entriesByClass = {
  'class-1': diaryEntries.filter(e => e.classId === 'class-1'),
  'class-2': diaryEntries.filter(e => e.classId === 'class-2'),
  'class-3': diaryEntries.filter(e => e.classId === 'class-3'),
  'class-4': diaryEntries.filter(e => e.classId === 'class-4'),
  'class-5': diaryEntries.filter(e => e.classId === 'class-5'),
};

export const entriesByDate = {
  '2024-01-15': diaryEntries.filter(e => e.date === '2024-01-15'),
  '2024-01-16': diaryEntries.filter(e => e.date === '2024-01-16'),
  '2024-01-17': diaryEntries.filter(e => e.date === '2024-01-17'),
  '2024-01-18': diaryEntries.filter(e => e.date === '2024-01-18'),
  '2024-01-19': diaryEntries.filter(e => e.date === '2024-01-19'),
};

export const entriesByStudent = {
  'student-1': diaryEntries.filter(e => e.studentId === 'student-1'),
  'student-2': diaryEntries.filter(e => e.studentId === 'student-2'),
  'student-3': diaryEntries.filter(e => e.studentId === 'student-3'),
  'student-4': diaryEntries.filter(e => e.studentId === 'student-4'),
  'student-5': diaryEntries.filter(e => e.studentId === 'student-5'),
};

export const attendanceStats = {
  'class-1': {
    totalDays: 5,
    presentDays: 12,
    absentDays: 3,
    attendanceRate: 80.0,
  },
  'class-2': {
    totalDays: 1,
    presentDays: 2,
    absentDays: 0,
    attendanceRate: 100.0,
  },
};

export default { diaryEntries, diaryHistory, entriesByClass, entriesByDate, entriesByStudent, attendanceStats };
