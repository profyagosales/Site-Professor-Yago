import api from '@api'

export async function listStudentsByClass(classId) {
  const { data } = await api.get(`/classes/${classId}/students`)
  return data
}

export async function createStudent(fd) {
  const classId = String(fd.get('classId'))
  const { data } = await api.post(`/classes/${classId}/students`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export default {
  listStudentsByClass,
  createStudent,
}

