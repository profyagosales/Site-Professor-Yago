/**
 * Testes para fixtures de dados
 * 
 * Funcionalidades testadas:
 * - Validação de estruturas de dados
 * - Utilitários de teste
 * - Consistência dos dados
 * - Geração de mocks
 */

import { describe, it, expect } from '@jest/globals';
import { 
  students, 
  classes, 
  essays, 
  essayThemes, 
  grades, 
  diary,
  studentUtils,
  classUtils,
  essayUtils,
  themeUtils,
  gradeUtils,
  diaryUtils,
  testUtils,
} from '@/__fixtures__/testUtils';

describe('Fixtures de Dados', () => {
  describe('Estrutura dos Dados', () => {
    it('deve ter estudantes válidos', () => {
      expect(students).toHaveLength(10);
      students.forEach(student => {
        expect(studentUtils.validate(student)).toBe(true);
      });
    });

    it('deve ter turmas válidas', () => {
      expect(classes).toHaveLength(5);
      classes.forEach(classData => {
        expect(classUtils.validate(classData)).toBe(true);
      });
    });

    it('deve ter redações válidas', () => {
      expect(essays).toHaveLength(10);
      essays.forEach(essay => {
        expect(essayUtils.validate(essay)).toBe(true);
      });
    });

    it('deve ter temas válidos', () => {
      expect(essayThemes).toHaveLength(11);
      essayThemes.forEach(theme => {
        expect(themeUtils.validate(theme)).toBe(true);
      });
    });

    it('deve ter notas válidas', () => {
      expect(grades.grades).toHaveLength(18);
      grades.grades.forEach(grade => {
        expect(gradeUtils.validate(grade)).toBe(true);
      });
    });

    it('deve ter entradas de diário válidas', () => {
      expect(diary.diaryEntries).toHaveLength(17);
      diary.diaryEntries.forEach(entry => {
        expect(diaryUtils.validate(entry)).toBe(true);
      });
    });
  });

  describe('Utilitários de Estudantes', () => {
    it('deve obter estudante por ID', () => {
      const student = studentUtils.getById('student-1');
      expect(student).toBeDefined();
      expect(student?.name).toBe('Ana Silva Santos');
    });

    it('deve obter estudantes por turma', () => {
      const classStudents = studentUtils.getByClass('class-1');
      expect(classStudents).toHaveLength(3);
      expect(classStudents.every(s => s.classId === 'class-1')).toBe(true);
    });

    it('deve obter estudantes por série', () => {
      const ninthGradeStudents = studentUtils.getBySeries(9);
      expect(ninthGradeStudents).toHaveLength(5);
      expect(ninthGradeStudents.every(s => s.series === 9)).toBe(true);
    });

    it('deve gerar estudante mock', () => {
      const mockStudent = studentUtils.generateMock({
        name: 'Teste Mock',
        email: 'mock@test.com',
      });
      
      expect(mockStudent.name).toBe('Teste Mock');
      expect(mockStudent.email).toBe('mock@test.com');
      expect(studentUtils.validate(mockStudent)).toBe(true);
    });
  });

  describe('Utilitários de Turmas', () => {
    it('deve obter turma por ID', () => {
      const classData = classUtils.getById('class-1');
      expect(classData).toBeDefined();
      expect(classData?.className).toBe('9º A');
    });

    it('deve obter turmas por série', () => {
      const ninthGradeClasses = classUtils.getBySeries(9);
      expect(ninthGradeClasses).toHaveLength(2);
      expect(ninthGradeClasses.every(c => c.series === 9)).toBe(true);
    });

    it('deve obter turmas por professor', () => {
      const teacherClasses = classUtils.getByTeacher('teacher-1');
      expect(teacherClasses).toHaveLength(1);
      expect(teacherClasses[0].teacherId).toBe('teacher-1');
    });

    it('deve gerar turma mock', () => {
      const mockClass = classUtils.generateMock({
        series: 7,
        letter: 'C',
        discipline: 'Ciências',
      });
      
      expect(mockClass.series).toBe(7);
      expect(mockClass.letter).toBe('C');
      expect(mockClass.discipline).toBe('Ciências');
      expect(classUtils.validate(mockClass)).toBe(true);
    });
  });

  describe('Utilitários de Redações', () => {
    it('deve obter redação por ID', () => {
      const essay = essayUtils.getById('essay-1');
      expect(essay).toBeDefined();
      expect(essay?.topic).toBe('Mobilidade Urbana Sustentável');
    });

    it('deve obter redações por status', () => {
      const pendingEssays = essayUtils.getByStatus('pendente');
      const correctedEssays = essayUtils.getByStatus('corrigida');
      
      expect(pendingEssays.length + correctedEssays.length).toBe(essays.length);
      expect(pendingEssays.every(e => e.status === 'pendente')).toBe(true);
      expect(correctedEssays.every(e => e.status === 'corrigida')).toBe(true);
    });

    it('deve obter redações por turma', () => {
      const classEssays = essayUtils.getByClass('class-1');
      expect(classEssays).toHaveLength(3);
      expect(classEssays.every(e => e.classId === 'class-1')).toBe(true);
    });

    it('deve obter redações por tipo', () => {
      const enemEssays = essayUtils.getByType('ENEM');
      const pasEssays = essayUtils.getByType('PAS');
      
      expect(enemEssays.every(e => e.type === 'ENEM')).toBe(true);
      expect(pasEssays.every(e => e.type === 'PAS')).toBe(true);
    });

    it('deve gerar redação mock', () => {
      const mockEssay = essayUtils.generateMock({
        topic: 'Tema Mock',
        type: 'PAS',
        status: 'corrigida',
      });
      
      expect(mockEssay.topic).toBe('Tema Mock');
      expect(mockEssay.type).toBe('PAS');
      expect(mockEssay.status).toBe('corrigida');
      expect(essayUtils.validate(mockEssay)).toBe(true);
    });
  });

  describe('Utilitários de Temas', () => {
    it('deve obter tema por ID', () => {
      const theme = themeUtils.getById('theme-1');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Mobilidade Urbana Sustentável');
    });

    it('deve obter temas ativos', () => {
      const activeThemes = themeUtils.getActive();
      expect(activeThemes.length).toBeLessThanOrEqual(essayThemes.length);
      expect(activeThemes.every(t => t.isActive)).toBe(true);
    });

    it('deve obter temas por tipo', () => {
      const enemThemes = themeUtils.getByType('ENEM');
      const pasThemes = themeUtils.getByType('PAS');
      
      expect(enemThemes.every(t => t.type === 'ENEM' && t.isActive)).toBe(true);
      expect(pasThemes.every(t => t.type === 'PAS' && t.isActive)).toBe(true);
    });

    it('deve gerar tema mock', () => {
      const mockTheme = themeUtils.generateMock({
        name: 'Tema Mock',
        type: 'outro',
        isActive: false,
      });
      
      expect(mockTheme.name).toBe('Tema Mock');
      expect(mockTheme.type).toBe('outro');
      expect(mockTheme.isActive).toBe(false);
      expect(themeUtils.validate(mockTheme)).toBe(true);
    });
  });

  describe('Utilitários de Notas', () => {
    it('deve obter notas por turma', () => {
      const classGrades = gradeUtils.getByClass('class-1');
      expect(classGrades).toHaveLength(9);
      expect(classGrades.every(g => g.classId === 'class-1')).toBe(true);
    });

    it('deve obter notas por estudante', () => {
      const studentGrades = gradeUtils.getByStudent('student-1');
      expect(studentGrades).toHaveLength(3);
      expect(studentGrades.every(g => g.studentId === 'student-1')).toBe(true);
    });

    it('deve obter avaliações por turma', () => {
      const classAssessments = gradeUtils.getAssessmentsByClass('class-1');
      expect(classAssessments).toHaveLength(3);
      expect(classAssessments.every(a => a.classId === 'class-1')).toBe(true);
    });

    it('deve gerar nota mock', () => {
      const mockGrade = gradeUtils.generateMock({
        value: 9.5,
        studentId: 'student-test',
      });
      
      expect(mockGrade.value).toBe(9.5);
      expect(mockGrade.studentId).toBe('student-test');
      expect(gradeUtils.validate(mockGrade)).toBe(true);
    });

    it('deve gerar avaliação mock', () => {
      const mockAssessment = gradeUtils.generateAssessmentMock({
        name: 'Avaliação Mock',
        type: 'trabalho',
        weight: 2,
      });
      
      expect(mockAssessment.name).toBe('Avaliação Mock');
      expect(mockAssessment.type).toBe('trabalho');
      expect(mockAssessment.weight).toBe(2);
    });
  });

  describe('Utilitários de Diário', () => {
    it('deve obter entradas por turma', () => {
      const classEntries = diaryUtils.getByClass('class-1');
      expect(classEntries.length).toBeGreaterThan(0);
      expect(classEntries.every(e => e.classId === 'class-1')).toBe(true);
    });

    it('deve obter entradas por data', () => {
      const dateEntries = diaryUtils.getByDate('2024-01-15');
      expect(dateEntries.length).toBeGreaterThan(0);
      expect(dateEntries.every(e => e.date === '2024-01-15')).toBe(true);
    });

    it('deve obter entradas por estudante', () => {
      const studentEntries = diaryUtils.getByStudent('student-1');
      expect(studentEntries.length).toBeGreaterThan(0);
      expect(studentEntries.every(e => e.studentId === 'student-1')).toBe(true);
    });

    it('deve gerar entrada mock', () => {
      const mockEntry = diaryUtils.generateMock({
        present: false,
        activity: 'Atividade Mock',
      });
      
      expect(mockEntry.present).toBe(false);
      expect(mockEntry.activity).toBe('Atividade Mock');
      expect(diaryUtils.validate(mockEntry)).toBe(true);
    });
  });

  describe('Utilitários Gerais', () => {
    it('deve validar propriedades obrigatórias', () => {
      const obj = { id: '1', name: 'Test', email: 'test@test.com' };
      const required = ['id', 'name', 'email'];
      
      expect(testUtils.hasRequiredProperties(obj, required)).toBe(true);
      expect(testUtils.hasRequiredProperties(obj, [...required, 'missing'])).toBe(false);
    });

    it('deve gerar ID único', () => {
      const id1 = testUtils.generateId('test');
      const id2 = testUtils.generateId('test');
      
      expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('deve gerar data ISO', () => {
      const today = testUtils.generateDate(0);
      const tomorrow = testUtils.generateDate(1);
      const yesterday = testUtils.generateDate(-1);
      
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      const todayDate = new Date(today);
      const tomorrowDate = new Date(tomorrow);
      const yesterdayDate = new Date(yesterday);
      
      expect(tomorrowDate.getTime()).toBeGreaterThan(todayDate.getTime());
      expect(yesterdayDate.getTime()).toBeLessThan(todayDate.getTime());
    });
  });

  describe('Consistência dos Dados', () => {
    it('deve ter relacionamentos consistentes entre estudantes e turmas', () => {
      students.forEach(student => {
        const classData = classes.find(c => c.id === student.classId);
        expect(classData).toBeDefined();
        expect(classData?.series).toBe(student.series);
        expect(classData?.letter).toBe(student.letter);
      });
    });

    it('deve ter relacionamentos consistentes entre redações e estudantes', () => {
      essays.forEach(essay => {
        const student = students.find(s => s.id === essay.studentId);
        expect(student).toBeDefined();
        expect(student?.name).toBe(essay.studentName);
        expect(student?.email).toBe(essay.studentEmail);
      });
    });

    it('deve ter relacionamentos consistentes entre notas e estudantes', () => {
      grades.grades.forEach(grade => {
        const student = students.find(s => s.id === grade.studentId);
        expect(student).toBeDefined();
      });
    });

    it('deve ter relacionamentos consistentes entre notas e avaliações', () => {
      grades.grades.forEach(grade => {
        const assessment = grades.assessments.find(a => a.id === grade.assessmentId);
        expect(assessment).toBeDefined();
        expect(assessment?.classId).toBe(grade.classId);
      });
    });

    it('deve ter relacionamentos consistentes entre diário e estudantes', () => {
      diary.diaryEntries.forEach(entry => {
        const student = students.find(s => s.id === entry.studentId);
        expect(student).toBeDefined();
      });
    });
  });
});
