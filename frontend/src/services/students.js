import { api } from '@/services/api';

export async function listStudents(classId) {
  if (!classId) return [];
  const { data } = await api.get(`/classes/${classId}/students`);
  return data;
}

export async function create(classId, payload) {
  const { photoFile, number, name, phone, email, password } = payload;
  let data;
  const config = {};
  if (photoFile) {
    const fd = new FormData();
    fd.append('classId', classId);
    fd.append('number', number);
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('email', email);
    fd.append('password', password);
    fd.append('photo', photoFile);
    data = fd;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  } else {
    data = { number, name, phone, email, password, classId };
  }
  const res = await api.post(`/classes/${classId}/students`, data, config);
  return res.data;
}

export async function update(classId, studentId, payload) {
  const { photoFile, number, name, phone, email, password } = payload || {};
  const config = {};
  let data;
  if (photoFile) {
    const fd = new FormData();
    if (number !== undefined) fd.append('number', String(number));
    if (name !== undefined) fd.append('name', name);
    if (phone !== undefined) fd.append('phone', phone);
    if (email !== undefined) fd.append('email', email);
    if (password) fd.append('password', password);
    fd.append('photo', photoFile);
    data = fd;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  } else {
    data = { number, name, phone, email, password };
  }
  return (await api.put(`/classes/${classId}/students/${studentId}`, data, config))?.data;
}

export async function remove(classId, studentId) {
  return (await api.delete(`/classes/${classId}/students/${studentId}`))?.data;
}

/**
 * Valida dados de um aluno
 */
export function validateStudentData(payload) {
  const errors = {};

  if (!payload.name?.trim()) {
    errors.name = 'Nome é obrigatório';
  } else if (payload.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres';
  } else if (payload.name.trim().length > 100) {
    errors.name = 'Nome deve ter no máximo 100 caracteres';
  }

  if (!payload.email?.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = 'E-mail inválido';
  }

  if (payload.phone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(payload.phone)) {
    errors.phone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
  }

  if (payload.number && (payload.number < 1 || payload.number > 999)) {
    errors.number = 'Número deve estar entre 1 e 999';
  }

  if (payload.password && payload.password.length < 6) {
    errors.password = 'Senha deve ter pelo menos 6 caracteres';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida dados de convite
 */
export function validateInviteData(email) {
  const errors = {};

  if (!email?.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'E-mail inválido';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Cria um novo estudante
 */
export async function createStudent(classId, payload) {
  try {
    const { photoFile, ...otherData } = payload;
    
    const formData = new FormData();
    formData.append('data', JSON.stringify(otherData));
    
    if (photoFile) {
      formData.append('photo', photoFile);
    }
    
    const response = await api.post(`/classes/${classId}/students`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to create student', {
      action: 'students',
      classId,
      payload: { name: payload.name, email: payload.email },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Atualiza um estudante existente
 */
export async function updateStudent(classId, studentId, payload) {
  try {
    const { photoFile, ...otherData } = payload;
    
    const formData = new FormData();
    formData.append('data', JSON.stringify(otherData));
    
    if (photoFile) {
      formData.append('photo', photoFile);
    }
    
    const response = await api.put(`/classes/${classId}/students/${studentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to update student', {
      action: 'students',
      classId,
      studentId,
      payload: { name: payload.name, email: payload.email },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove um estudante
 */
export async function deleteStudent(classId, studentId) {
  try {
    await api.delete(`/classes/${classId}/students/${studentId}`);
  } catch (error) {
    logger.error('Failed to delete student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Convidar um estudante para a turma
 */
export async function inviteStudent(classId, email) {
  try {
    const response = await api.post(`/classes/${classId}/students/invite`, { email });
    return pickData(response);
  } catch (error) {
    logger.error('Failed to invite student', {
      action: 'students',
      classId,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}


/**
 * Remove um estudante
 */
export async function removeStudent(classId, studentId) {
  try {
    await api.delete(`/classes/${classId}/students/${studentId}`);
    
    logger.info('Student removed successfully', {
      action: 'students',
      classId,
      studentId,
    });
  } catch (error) {
    logger.error('Failed to remove student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Busca um estudante específico
 */
export async function getStudent(classId, studentId) {
  try {
    const response = await api.get(`/classes/${classId}/students/${studentId}`);
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export const list = listStudents;
export default { 
  list: listStudents, 
  listStudents, 
  create, 
  update, 
  remove,
  validateStudentData,
  validateInviteData,
  createStudent,
  updateStudent,
  deleteStudent,
  removeStudent,
  inviteStudent,
  getStudent
};
