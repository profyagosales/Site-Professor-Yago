import { api, pickData } from '@/services/api';

export const listClasses = () => api.get('/classes').then(pickData);

export const getClassById = (id) => api.get(`/classes/${id}`).then(pickData);

const normalizeSchedulePayload = (payload) => ({
  ...payload,
  schedule: Array.isArray(payload.schedule)
    ? payload.schedule
    : payload.schedule
    ? [payload.schedule]
    : [],
});

export const createClass = (payload) =>
  api.post('/classes', normalizeSchedulePayload(payload)).then(pickData);

export const updateClass = (id, payload) =>
  api.put(`/classes/${id}`, normalizeSchedulePayload(payload)).then(pickData);

export const deleteClass = (id) => api.delete(`/classes/${id}`).then(pickData);

export const listStudents = (classId) =>
  api.get(`/classes/${classId}/students`).then(pickData);

/**
 * Verifica se uma turma pode ser removida (sem alunos)
 */
export const canDeleteClass = async (id) => {
  try {
    const students = await listStudents(id);
    return students.length === 0;
  } catch (error) {
    console.error('Failed to check if class can be deleted', {
      action: 'classes',
      classId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

/**
 * Valida dados de uma turma
 */
export const validateClassData = (payload) => {
  const errors = {};

  if (!payload.series || payload.series < 1 || payload.series > 9) {
    errors.series = 'Selecione uma série válida (1ª a 9ª)';
  }

  if (!payload.letter?.trim()) {
    errors.letter = 'Informe a letra da turma';
  } else if (payload.letter.trim().length > 2) {
    errors.letter = 'A letra deve ter no máximo 2 caracteres';
  }

  if (!payload.discipline?.trim()) {
    errors.discipline = 'Informe a disciplina';
  } else if (payload.discipline.trim().length > 50) {
    errors.discipline = 'A disciplina deve ter no máximo 50 caracteres';
  }

  if (!payload.schedule || payload.schedule.length === 0) {
    errors.schedule = 'Adicione pelo menos um horário';
  } else {
    const invalidSchedules = payload.schedule.filter(s => !s.day || !s.slot || !s.time);
    if (invalidSchedules.length > 0) {
      errors.schedule = 'Preencha todos os campos dos horários';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Gera nome da turma baseado na série e letra
 */
export const generateClassName = (series, letter) => {
  return `${series}ª ${letter.toUpperCase()}`;
};

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  listStudents,
  canDeleteClass,
  validateClassData,
  generateClassName,
};
