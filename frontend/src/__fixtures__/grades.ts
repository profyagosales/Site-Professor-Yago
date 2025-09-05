/**
 * Fixtures de dados para notas e avaliações
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface AssessmentFixture {
  id: string;
  name: string;
  type: 'prova' | 'trabalho' | 'apresentacao' | 'projeto';
  weight: number;
  maxGrade: number;
  classId: string;
  bimester: string;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradeFixture {
  id: string;
  studentId: string;
  assessmentId: string;
  value: number;
  classId: string;
  bimester: string;
  createdAt: string;
  updatedAt: string;
}

export const assessments: AssessmentFixture[] = [
  {
    id: 'assessment-1',
    name: 'Prova 1 - Álgebra',
    type: 'prova',
    weight: 3,
    maxGrade: 10,
    classId: 'class-1',
    bimester: '1',
    dueDate: '2024-02-15T08:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-2',
    name: 'Trabalho - Geometria',
    type: 'trabalho',
    weight: 2,
    maxGrade: 10,
    classId: 'class-1',
    bimester: '1',
    dueDate: '2024-02-20T23:59:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-3',
    name: 'Prova 2 - Trigonometria',
    type: 'prova',
    weight: 3,
    maxGrade: 10,
    classId: 'class-1',
    bimester: '1',
    dueDate: '2024-03-01T08:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-4',
    name: 'Apresentação - Literatura',
    type: 'apresentacao',
    weight: 2,
    maxGrade: 10,
    classId: 'class-2',
    bimester: '1',
    dueDate: '2024-02-25T14:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-5',
    name: 'Prova - Gramática',
    type: 'prova',
    weight: 4,
    maxGrade: 10,
    classId: 'class-2',
    bimester: '1',
    dueDate: '2024-02-28T08:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-6',
    name: 'Projeto - História do Brasil',
    type: 'projeto',
    weight: 3,
    maxGrade: 10,
    classId: 'class-3',
    bimester: '1',
    dueDate: '2024-03-05T23:59:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-7',
    name: 'Prova - Geografia Física',
    type: 'prova',
    weight: 4,
    maxGrade: 10,
    classId: 'class-4',
    bimester: '1',
    dueDate: '2024-03-08T08:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'assessment-8',
    name: 'Experimento - Ciências',
    type: 'trabalho',
    weight: 2,
    maxGrade: 10,
    classId: 'class-5',
    bimester: '1',
    dueDate: '2024-03-10T14:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
];

export const grades: GradeFixture[] = [
  // Notas da turma 1 (class-1)
  { id: 'grade-1', studentId: 'student-1', assessmentId: 'assessment-1', value: 8.5, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-2', studentId: 'student-2', assessmentId: 'assessment-1', value: 9.2, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-3', studentId: 'student-3', assessmentId: 'assessment-1', value: 7.8, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-4', studentId: 'student-1', assessmentId: 'assessment-2', value: 9.0, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-5', studentId: 'student-2', assessmentId: 'assessment-2', value: 8.7, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-6', studentId: 'student-3', assessmentId: 'assessment-2', value: 8.2, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-7', studentId: 'student-1', assessmentId: 'assessment-3', value: 8.8, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-8', studentId: 'student-2', assessmentId: 'assessment-3', value: 9.5, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-9', studentId: 'student-3', assessmentId: 'assessment-3', value: 7.9, classId: 'class-1', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },

  // Notas da turma 2 (class-2)
  { id: 'grade-10', studentId: 'student-4', assessmentId: 'assessment-4', value: 8.0, classId: 'class-2', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-11', studentId: 'student-5', assessmentId: 'assessment-4', value: 9.3, classId: 'class-2', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-12', studentId: 'student-4', assessmentId: 'assessment-5', value: 7.5, classId: 'class-2', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-13', studentId: 'student-5', assessmentId: 'assessment-5', value: 8.9, classId: 'class-2', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },

  // Notas da turma 3 (class-3)
  { id: 'grade-14', studentId: 'student-6', assessmentId: 'assessment-6', value: 8.1, classId: 'class-3', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-15', studentId: 'student-7', assessmentId: 'assessment-6', value: 7.8, classId: 'class-3', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },

  // Notas da turma 4 (class-4)
  { id: 'grade-16', studentId: 'student-8', assessmentId: 'assessment-7', value: 8.4, classId: 'class-4', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'grade-17', studentId: 'student-9', assessmentId: 'assessment-7', value: 9.1, classId: 'class-4', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },

  // Notas da turma 5 (class-5)
  { id: 'grade-18', studentId: 'student-10', assessmentId: 'assessment-8', value: 8.6, classId: 'class-5', bimester: '1', createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
];

export const gradesByClass = {
  'class-1': grades.filter(g => g.classId === 'class-1'),
  'class-2': grades.filter(g => g.classId === 'class-2'),
  'class-3': grades.filter(g => g.classId === 'class-3'),
  'class-4': grades.filter(g => g.classId === 'class-4'),
  'class-5': grades.filter(g => g.classId === 'class-5'),
};

export const gradesByStudent = {
  'student-1': grades.filter(g => g.studentId === 'student-1'),
  'student-2': grades.filter(g => g.studentId === 'student-2'),
  'student-3': grades.filter(g => g.studentId === 'student-3'),
  'student-4': grades.filter(g => g.studentId === 'student-4'),
  'student-5': grades.filter(g => g.studentId === 'student-5'),
  'student-6': grades.filter(g => g.studentId === 'student-6'),
  'student-7': grades.filter(g => g.studentId === 'student-7'),
  'student-8': grades.filter(g => g.studentId === 'student-8'),
  'student-9': grades.filter(g => g.studentId === 'student-9'),
  'student-10': grades.filter(g => g.studentId === 'student-10'),
};

export const gradesByAssessment = {
  'assessment-1': grades.filter(g => g.assessmentId === 'assessment-1'),
  'assessment-2': grades.filter(g => g.assessmentId === 'assessment-2'),
  'assessment-3': grades.filter(g => g.assessmentId === 'assessment-3'),
  'assessment-4': grades.filter(g => g.assessmentId === 'assessment-4'),
  'assessment-5': grades.filter(g => g.assessmentId === 'assessment-5'),
  'assessment-6': grades.filter(g => g.assessmentId === 'assessment-6'),
  'assessment-7': grades.filter(g => g.assessmentId === 'assessment-7'),
  'assessment-8': grades.filter(g => g.assessmentId === 'assessment-8'),
};

export const assessmentsByClass = {
  'class-1': assessments.filter(a => a.classId === 'class-1'),
  'class-2': assessments.filter(a => a.classId === 'class-2'),
  'class-3': assessments.filter(a => a.classId === 'class-3'),
  'class-4': assessments.filter(a => a.classId === 'class-4'),
  'class-5': assessments.filter(a => a.classId === 'class-5'),
};

export const assessmentsByType = {
  prova: assessments.filter(a => a.type === 'prova'),
  trabalho: assessments.filter(a => a.type === 'trabalho'),
  apresentacao: assessments.filter(a => a.type === 'apresentacao'),
  projeto: assessments.filter(a => a.type === 'projeto'),
};

export default { assessments, grades };
