/**
 * Utilitários para testes com fixtures
 * 
 * Funcionalidades:
 * - Helpers para usar fixtures em testes
 * - Mock de dados consistentes
 * - Geração de dados de teste
 * - Validação de fixtures
 */

import { 
  students, 
  classes, 
  essays, 
  essayThemes, 
  grades, 
  diary,
  type StudentFixture,
  type ClassFixture,
  type EssayFixture,
  type EssayThemeFixture,
  type AssessmentFixture,
  type GradeFixture,
  type DiaryEntryFixture,
} from './index';

/**
 * Utilitários para estudantes
 */
export const studentUtils = {
  /**
   * Obtém estudante por ID
   */
  getById: (id: string): StudentFixture | undefined => {
    return students.find(s => s.id === id);
  },

  /**
   * Obtém estudantes por turma
   */
  getByClass: (classId: string): StudentFixture[] => {
    return students.filter(s => s.classId === classId);
  },

  /**
   * Obtém estudantes por série
   */
  getBySeries: (series: number): StudentFixture[] => {
    return students.filter(s => s.series === series);
  },

  /**
   * Gera estudante mock
   */
  generateMock: (overrides: Partial<StudentFixture> = {}): StudentFixture => {
    const baseId = `student-${Date.now()}`;
    return {
      id: baseId,
      name: 'Estudante Teste',
      email: 'teste@escola.com',
      classId: 'class-1',
      className: '9º A',
      series: 9,
      letter: 'A',
      discipline: 'Matemática',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura do estudante
   */
  validate: (student: any): boolean => {
    return (
      typeof student.id === 'string' &&
      typeof student.name === 'string' &&
      typeof student.email === 'string' &&
      typeof student.classId === 'string' &&
      typeof student.series === 'number' &&
      typeof student.letter === 'string' &&
      typeof student.discipline === 'string' &&
      typeof student.isActive === 'boolean'
    );
  },
};

/**
 * Utilitários para turmas
 */
export const classUtils = {
  /**
   * Obtém turma por ID
   */
  getById: (id: string): ClassFixture | undefined => {
    return classes.find(c => c.id === id);
  },

  /**
   * Obtém turmas por série
   */
  getBySeries: (series: number): ClassFixture[] => {
    return classes.filter(c => c.series === series);
  },

  /**
   * Obtém turmas por professor
   */
  getByTeacher: (teacherId: string): ClassFixture[] => {
    return classes.filter(c => c.teacherId === teacherId);
  },

  /**
   * Gera turma mock
   */
  generateMock: (overrides: Partial<ClassFixture> = {}): ClassFixture => {
    const baseId = `class-${Date.now()}`;
    return {
      id: baseId,
      series: 9,
      letter: 'A',
      discipline: 'Matemática',
      className: '9º A',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Teste',
      schedule: [
        { day: 'Segunda', slot: 1, time: '08:00' },
        { day: 'Quarta', slot: 2, time: '10:00' },
      ],
      isActive: true,
      studentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura da turma
   */
  validate: (classData: any): boolean => {
    return (
      typeof classData.id === 'string' &&
      typeof classData.series === 'number' &&
      typeof classData.letter === 'string' &&
      typeof classData.discipline === 'string' &&
      typeof classData.className === 'string' &&
      typeof classData.teacherId === 'string' &&
      typeof classData.teacherName === 'string' &&
      Array.isArray(classData.schedule) &&
      typeof classData.isActive === 'boolean'
    );
  },
};

/**
 * Utilitários para redações
 */
export const essayUtils = {
  /**
   * Obtém redação por ID
   */
  getById: (id: string): EssayFixture | undefined => {
    return essays.find(e => e.id === id);
  },

  /**
   * Obtém redações por status
   */
  getByStatus: (status: 'pendente' | 'corrigida' | 'enviada'): EssayFixture[] => {
    return essays.filter(e => e.status === status);
  },

  /**
   * Obtém redações por turma
   */
  getByClass: (classId: string): EssayFixture[] => {
    return essays.filter(e => e.classId === classId);
  },

  /**
   * Obtém redações por tipo
   */
  getByType: (type: 'ENEM' | 'PAS' | 'outro'): EssayFixture[] => {
    return essays.filter(e => e.type === type);
  },

  /**
   * Gera redação mock
   */
  generateMock: (overrides: Partial<EssayFixture> = {}): EssayFixture => {
    const baseId = `essay-${Date.now()}`;
    return {
      id: baseId,
      studentId: 'student-1',
      studentName: 'Estudante Teste',
      studentEmail: 'teste@escola.com',
      classId: 'class-1',
      className: '9º A',
      topic: 'Tema Teste',
      type: 'ENEM',
      bimester: '1',
      status: 'pendente',
      fileUrl: 'https://example.com/test.pdf',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura da redação
   */
  validate: (essay: any): boolean => {
    return (
      typeof essay.id === 'string' &&
      typeof essay.studentId === 'string' &&
      typeof essay.studentName === 'string' &&
      typeof essay.classId === 'string' &&
      typeof essay.topic === 'string' &&
      ['ENEM', 'PAS', 'outro'].includes(essay.type) &&
      ['pendente', 'corrigida', 'enviada'].includes(essay.status)
    );
  },
};

/**
 * Utilitários para temas de redação
 */
export const themeUtils = {
  /**
   * Obtém tema por ID
   */
  getById: (id: string): EssayThemeFixture | undefined => {
    return essayThemes.find(t => t.id === id);
  },

  /**
   * Obtém temas ativos
   */
  getActive: (): EssayThemeFixture[] => {
    return essayThemes.filter(t => t.isActive);
  },

  /**
   * Obtém temas por tipo
   */
  getByType: (type: 'ENEM' | 'PAS' | 'outro'): EssayThemeFixture[] => {
    return essayThemes.filter(t => t.type === type && t.isActive);
  },

  /**
   * Gera tema mock
   */
  generateMock: (overrides: Partial<EssayThemeFixture> = {}): EssayThemeFixture => {
    const baseId = `theme-${Date.now()}`;
    return {
      id: baseId,
      name: 'Tema Teste',
      type: 'ENEM',
      description: 'Descrição do tema teste',
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura do tema
   */
  validate: (theme: any): boolean => {
    return (
      typeof theme.id === 'string' &&
      typeof theme.name === 'string' &&
      ['ENEM', 'PAS', 'outro'].includes(theme.type) &&
      typeof theme.isActive === 'boolean' &&
      typeof theme.usageCount === 'number'
    );
  },
};

/**
 * Utilitários para notas
 */
export const gradeUtils = {
  /**
   * Obtém notas por turma
   */
  getByClass: (classId: string): GradeFixture[] => {
    return grades.grades.filter(g => g.classId === classId);
  },

  /**
   * Obtém notas por estudante
   */
  getByStudent: (studentId: string): GradeFixture[] => {
    return grades.grades.filter(g => g.studentId === studentId);
  },

  /**
   * Obtém avaliações por turma
   */
  getAssessmentsByClass: (classId: string): AssessmentFixture[] => {
    return grades.assessments.filter(a => a.classId === classId);
  },

  /**
   * Gera nota mock
   */
  generateMock: (overrides: Partial<GradeFixture> = {}): GradeFixture => {
    const baseId = `grade-${Date.now()}`;
    return {
      id: baseId,
      studentId: 'student-1',
      assessmentId: 'assessment-1',
      value: 8.5,
      classId: 'class-1',
      bimester: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Gera avaliação mock
   */
  generateAssessmentMock: (overrides: Partial<AssessmentFixture> = {}): AssessmentFixture => {
    const baseId = `assessment-${Date.now()}`;
    return {
      id: baseId,
      name: 'Avaliação Teste',
      type: 'prova',
      weight: 3,
      maxGrade: 10,
      classId: 'class-1',
      bimester: '1',
      dueDate: new Date().toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura da nota
   */
  validate: (grade: any): boolean => {
    return (
      typeof grade.id === 'string' &&
      typeof grade.studentId === 'string' &&
      typeof grade.assessmentId === 'string' &&
      typeof grade.value === 'number' &&
      typeof grade.classId === 'string'
    );
  },
};

/**
 * Utilitários para diário
 */
export const diaryUtils = {
  /**
   * Obtém entradas por turma
   */
  getByClass: (classId: string): DiaryEntryFixture[] => {
    return diary.diaryEntries.filter(e => e.classId === classId);
  },

  /**
   * Obtém entradas por data
   */
  getByDate: (date: string): DiaryEntryFixture[] => {
    return diary.diaryEntries.filter(e => e.date === date);
  },

  /**
   * Obtém entradas por estudante
   */
  getByStudent: (studentId: string): DiaryEntryFixture[] => {
    return diary.diaryEntries.filter(e => e.studentId === studentId);
  },

  /**
   * Gera entrada mock
   */
  generateMock: (overrides: Partial<DiaryEntryFixture> = {}): DiaryEntryFixture => {
    const baseId = `diary-${Date.now()}`;
    return {
      id: baseId,
      classId: 'class-1',
      date: new Date().toISOString().split('T')[0],
      studentId: 'student-1',
      present: true,
      activity: 'Atividade teste',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Valida estrutura da entrada
   */
  validate: (entry: any): boolean => {
    return (
      typeof entry.id === 'string' &&
      typeof entry.classId === 'string' &&
      typeof entry.date === 'string' &&
      typeof entry.studentId === 'string' &&
      typeof entry.present === 'boolean' &&
      typeof entry.activity === 'string'
    );
  },
};

/**
 * Utilitários gerais
 */
export const testUtils = {
  /**
   * Limpa dados de teste
   */
  clearTestData: (): void => {
    // Implementação para limpar dados de teste
    // Pode ser usado para resetar estado entre testes
  },

  /**
   * Valida se objeto tem propriedades obrigatórias
   */
  hasRequiredProperties: (obj: any, required: string[]): boolean => {
    return required.every(prop => prop in obj);
  },

  /**
   * Gera ID único para testes
   */
  generateId: (prefix: string = 'test'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Gera data ISO para testes
   */
  generateDate: (daysOffset: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString();
  },
};

export default {
  studentUtils,
  classUtils,
  essayUtils,
  themeUtils,
  gradeUtils,
  diaryUtils,
  testUtils,
};
