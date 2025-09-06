import { api, pickData } from '@/services/api';

export const getClassMatrix = (classId) =>
  api.get(`/grades/class/${classId}`).then(pickData);

// Alias to getClassMatrix for clarity when only totals are needed
export const getClassTotals = (classId) =>
  api.get(`/grades/class/${classId}`).then(pickData);

export const getStudentGrades = (studentId) =>
  api.get(`/grades/student/${studentId}`).then(pickData);

export const postGrade = (data) => api.post('/grades', data).then(pickData);

export const exportClassPdf = (classId) =>
  api.get(`/grades/class/${classId}/export`, { responseType: 'blob' }).then(pickData);

export const exportStudentPdf = (studentId) =>
  api.get(`/grades/student/${studentId}/export`, { responseType: 'blob' }).then(pickData);

export const sendStudentReport = (studentId) =>
  api.post(`/grades/student/${studentId}/send`).then(pickData);

/**
 * Lista todas as notas de uma turma organizadas em matriz aluno × avaliações
 */
export const listClassGrades = async (params) => {
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
    console.error('Erro ao carregar notas da turma:', error);
    throw error;
  }
};

/**
 * Lista as notas de um aluno específico
 */
export const listStudentGrades = async (params) => {
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
    console.error('Erro ao carregar notas do aluno:', error);
    throw error;
  }
};

/**
 * Calcula os totais do bimestre para todos os alunos
 */
export const computeTermTotals = (students, evaluations, grades, term) => {
  const totals = {};
  
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
};

/**
 * Calcula as médias do bimestre para todos os alunos
 */
export const computeTermAverages = (students, evaluations, grades, term) => {
  const averages = {};
  
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
};

/**
 * Formata uma nota para exibição
 */
export const formatGrade = (score, maxScore) => {
  if (score === null || score === undefined) return '-';
  return `${score}/${maxScore}`;
};

/**
 * Formata uma porcentagem para exibição
 */
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value * 100) / 100}%`;
};

// Compatibilidade com hooks antigos
export const getClassGrades = getClassMatrix;
export const saveGradeDebounced = postGrade;
export const validateGradeValue = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};
export const formatGradeValue = formatGrade;
export const parseGradeValue = (value) => parseFloat(value) || 0;
export const calculateStudentAverage = computeStudentAverageScore;

// Funções auxiliares
const computeStudentTotalScore = (evaluations, grades, term) => {
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
};

const computeStudentAverageScore = (evaluations, grades, term) => {
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
};

const computeMaxPossibleScore = (evaluations, term) => {
  const termEvaluations = term 
    ? evaluations.filter(e => e.term === term)
    : evaluations;
  
  let total = 0;
  termEvaluations.forEach(evaluation => {
    const weight = evaluation.weight || 1;
    total += weight * 100;
  });
  
  return total;
};

/**
 * Cria ou atualiza uma nota (idempotente)
 */
export const upsertGrade = async (data) => {
  try {
    const response = await api.post('/grades', data);
    const grade = pickData(response);
    
    console.info('Nota salva com sucesso:', {
      studentId: data.studentId,
      evaluationId: data.evaluationId,
      score: data.score,
      term: data.term,
    });
    
    return grade;
  } catch (error) {
    console.error('Erro ao salvar nota:', error);
    throw error;
  }
};

export default {
  getClassMatrix,
  getClassTotals,
  getStudentGrades,
  postGrade,
  exportClassPdf,
  exportStudentPdf,
  sendStudentReport,
  listClassGrades,
  listStudentGrades,
  computeTermTotals,
  computeTermAverages,
  formatGrade,
  formatPercentage,
  getClassGrades,
  saveGradeDebounced,
  validateGradeValue,
  formatGradeValue,
  parseGradeValue,
  calculateStudentAverage,
  upsertGrade,
};

