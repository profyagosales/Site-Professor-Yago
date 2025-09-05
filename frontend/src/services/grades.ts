import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

// Compatibilidade com funções antigas - iremos migrar gradualmente
export const getClassMatrix = async (classId: string) => {
  const data = await listClassGrades({ classId });
  return {
    students: data.students,
    grades: data.grades.map(g => ({
      ...g,
      assessments: g.score,
      caderno: 0, // Para compatibilidade
    }))
  };
};

export const getStudentGrades = async (studentId: string, term?: number) => {
  const data = await listStudentGrades({ studentId, term });
  return {
    student: { name: data.studentName },
    bimesters: { [term || 1]: data.averageScore }
  };
};

export const exportClassPdf = async (classId: string) => {
  // Placeholder para exportação de PDF
  const blob = new Blob(['PDF content'], { type: 'application/pdf' });
  return blob;
};

export const exportStudentPdf = async (studentId: string) => {
  // Placeholder para exportação de PDF do aluno
  const blob = new Blob(['Student PDF content'], { type: 'application/pdf' });
  return blob;
};

export const sendStudentReport = async (studentId: string) => {
  // Placeholder para envio de relatório
  return { success: true };
};

// Compatibilidade com hooks antigos
export const getClassGrades = getClassMatrix;
export const saveGradeDebounced = upsertGrade;
export const validateGradeValue = validateGrade;
export const formatGradeValue = formatGrade;
export const parseGradeValue = (value: string) => parseFloat(value) || 0;
export const calculateStudentAverage = computeStudentAverageScore;

// Tipos para compatibilidade
export type GradeMatrix = ClassGradesMatrix;
export type Student = Student;
export type Assessment = Evaluation;
export type Grade = Grade;
export type SaveGradeParams = GradeUpsertData;

export interface Grade {
  id: string;
  studentId: string;
  evaluationId: string;
  score: number;
  term: number;
  weight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Evaluation {
  id: string;
  name: string;
  term: number;
  weight: number;
  maxScore: number;
  classId: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  classId: string;
}

export interface ClassGradesMatrix {
  students: Student[];
  evaluations: Evaluation[];
  grades: Grade[];
  termTotals: Record<string, number>; // studentId -> total score
  termAverages: Record<string, number>; // studentId -> average score
}

export interface StudentGrades {
  studentId: string;
  studentName: string;
  term: number;
  grades: Grade[];
  evaluations: Evaluation[];
  totalScore: number;
  averageScore: number;
  maxPossibleScore: number;
}

export interface GradeUpsertData {
  studentId: string;
  evaluationId: string;
  score: number;
  term: number;
  weight?: number;
}

/**
 * Lista todas as notas de uma turma organizadas em matriz aluno × avaliações
 */
export async function listClassGrades(params: {
  classId: string;
  term?: number;
}): Promise<ClassGradesMatrix> {
  const { classId, term } = params;
  
  try {
    const response = await api.get(`/classes/${classId}/grades`, {
      params: { term }
    });
    
    const data = pickData(response);
    
    // Processar dados para criar matriz
    const students = data.students || [];
    const evaluations = data.evaluations || [];
    const grades = data.grades || [];
    
    // Calcular totais e médias do bimestre
    const termTotals = computeTermTotals(students, evaluations, grades, term);
    const termAverages = computeTermAverages(students, evaluations, grades, term);
    
    return {
      students,
      evaluations,
      grades,
      termTotals,
      termAverages,
    };
  } catch (error) {
    logger.error('Erro ao carregar notas da turma:', error);
    throw error;
  }
}

/**
 * Lista as notas de um aluno específico
 */
export async function listStudentGrades(params: {
  studentId: string;
  term?: number;
}): Promise<StudentGrades> {
  const { studentId, term } = params;
  
  try {
    const response = await api.get(`/students/${studentId}/grades`, {
      params: { term }
    });
    
    const data = pickData(response);
    
    const student = data.student;
    const evaluations = data.evaluations || [];
    const grades = data.grades || [];
    
    // Calcular totais e médias
    const totalScore = computeStudentTotalScore(evaluations, grades, term);
    const averageScore = computeStudentAverageScore(evaluations, grades, term);
    const maxPossibleScore = computeMaxPossibleScore(evaluations, term);
    
    return {
      studentId,
      studentName: student.name,
      term: term || 1,
      grades,
      evaluations,
      totalScore,
      averageScore,
      maxPossibleScore,
    };
  } catch (error) {
    logger.error('Erro ao carregar notas do aluno:', error);
    throw error;
  }
}

/**
 * Calcula os totais do bimestre para todos os alunos
 */
export function computeTermTotals(
  students: Student[],
  evaluations: Evaluation[],
  grades: Grade[],
  term?: number
): Record<string, number> {
  const totals: Record<string, number> = {};
  
  // Filtrar avaliações do bimestre se especificado
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  students.forEach(student => {
    let total = 0;
    
    termEvaluations.forEach(evaluation => {
      const grade = grades.find(g => 
        g.studentId === student.id && 
        g.evaluationId === evaluation.id
      );
      
      if (grade) {
        const weight = grade.weight || evaluation.weight || 1;
        total += (grade.score / evaluation.maxScore) * weight * 100;
      }
    });
    
    totals[student.id] = Math.round(total * 100) / 100;
  });
  
  return totals;
}

/**
 * Calcula as médias do bimestre para todos os alunos
 */
export function computeTermAverages(
  students: Student[],
  evaluations: Evaluation[],
  grades: Grade[],
  term?: number
): Record<string, number> {
  const averages: Record<string, number> = {};
  
  // Filtrar avaliações do bimestre se especificado
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  students.forEach(student => {
    let totalWeight = 0;
    let weightedSum = 0;
    
    termEvaluations.forEach(evaluation => {
      const grade = grades.find(g => 
        g.studentId === student.id && 
        g.evaluationId === evaluation.id
      );
      
      if (grade) {
        const weight = grade.weight || evaluation.weight || 1;
        const normalizedScore = grade.score / evaluation.maxScore;
        weightedSum += normalizedScore * weight;
        totalWeight += weight;
      }
    });
    
    averages[student.id] = totalWeight > 0 
      ? Math.round((weightedSum / totalWeight) * 10000) / 100
      : 0;
  });
  
  return averages;
}

/**
 * Calcula o total de pontos de um aluno
 */
export function computeStudentTotalScore(
  evaluations: Evaluation[],
  grades: Grade[],
  term?: number
): number {
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  let total = 0;
  
  termEvaluations.forEach(evaluation => {
    const grade = grades.find(g => g.evaluationId === evaluation.id);
    if (grade) {
      const weight = grade.weight || evaluation.weight || 1;
      total += (grade.score / evaluation.maxScore) * weight * 100;
    }
  });
  
  return Math.round(total * 100) / 100;
}

/**
 * Calcula a média de um aluno
 */
export function computeStudentAverageScore(
  evaluations: Evaluation[],
  grades: Grade[],
  term?: number
): number {
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  termEvaluations.forEach(evaluation => {
    const grade = grades.find(g => g.evaluationId === evaluation.id);
    if (grade) {
      const weight = grade.weight || evaluation.weight || 1;
      const normalizedScore = grade.score / evaluation.maxScore;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 
    ? Math.round((weightedSum / totalWeight) * 10000) / 100
    : 0;
}

/**
 * Calcula a pontuação máxima possível
 */
export function computeMaxPossibleScore(
  evaluations: Evaluation[],
  term?: number
): number {
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  return termEvaluations.reduce((total, evaluation) => {
    const weight = evaluation.weight || 1;
    return total + (weight * 100);
  }, 0);
}

/**
 * Cria ou atualiza uma nota (idempotente)
 */
export async function upsertGrade(data: GradeUpsertData): Promise<Grade> {
  try {
    const response = await api.post('/grades', data);
    const grade = pickData(response);
    
    logger.info('Nota salva com sucesso:', {
      studentId: data.studentId,
      evaluationId: data.evaluationId,
      score: data.score,
      term: data.term,
    });
    
    return grade;
  } catch (error) {
    logger.error('Erro ao salvar nota:', error);
    throw error;
  }
}

/**
 * Remove uma nota
 */
export async function deleteGrade(gradeId: string): Promise<void> {
  try {
    await api.delete(`/grades/${gradeId}`);
    
    logger.info('Nota removida com sucesso:', { gradeId });
  } catch (error) {
    logger.error('Erro ao remover nota:', error);
    throw error;
  }
}

/**
 * Exporta notas para CSV
 */
export function exportGradesToCSV(
  matrix: ClassGradesMatrix,
  term?: number
): string {
  const headers = ['Aluno', 'Avaliação', 'Nota', 'Bimestre', 'Peso'];
  const rows = [headers.join(',')];
  
  const termEvaluations = term 
    ? matrix.evaluations.filter(e => e.term === term)
    : matrix.evaluations;
  
  matrix.students.forEach(student => {
    termEvaluations.forEach(evaluation => {
      const grade = matrix.grades.find(g => 
        g.studentId === student.id && 
        g.evaluationId === evaluation.id
      );
      
      const score = grade ? grade.score : 0;
      const weight = grade?.weight || evaluation.weight || 1;
      
      rows.push([
        `"${student.name}"`,
        `"${evaluation.name}"`,
        score.toString(),
        evaluation.term.toString(),
        weight.toString(),
      ].join(','));
    });
  });
  
  return rows.join('\n');
}

/**
 * Exporta notas para XLSX
 */
export function exportGradesToXLSX(
  matrix: ClassGradesMatrix,
  term?: number
): any {
  // Esta função seria implementada com a biblioteca xlsx
  // Por enquanto, retorna os dados estruturados
  const termEvaluations = term 
    ? matrix.evaluations.filter(e => e.term === term)
    : matrix.evaluations;
  
  const data = matrix.students.map(student => {
    const studentData: any = {
      'Aluno': student.name,
      'Email': student.email,
    };
    
    termEvaluations.forEach(evaluation => {
      const grade = matrix.grades.find(g => 
        g.studentId === student.id && 
        g.evaluationId === evaluation.id
      );
      
      studentData[evaluation.name] = grade ? grade.score : 0;
    });
    
    // Adicionar totais
    studentData['Total'] = matrix.termTotals[student.id] || 0;
    studentData['Média'] = matrix.termAverages[student.id] || 0;
    
    return studentData;
  });
  
  return {
    data,
    headers: ['Aluno', 'Email', ...termEvaluations.map(e => e.name), 'Total', 'Média'],
  };
}

/**
 * Valida se uma nota está dentro dos limites
 */
export function validateGrade(score: number, maxScore: number): boolean {
  return score >= 0 && score <= maxScore;
}

/**
 * Formata uma nota para exibição
 */
export function formatGrade(score: number, maxScore: number): string {
  return `${score.toFixed(1)}/${maxScore}`;
}

/**
 * Formata uma porcentagem para exibição
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default {
  listClassGrades,
  listStudentGrades,
  computeTermTotals,
  computeTermAverages,
  computeStudentTotalScore,
  computeStudentAverageScore,
  computeMaxPossibleScore,
  upsertGrade,
  deleteGrade,
  exportGradesToCSV,
  exportGradesToXLSX,
  validateGrade,
  formatGrade,
  formatPercentage,
};