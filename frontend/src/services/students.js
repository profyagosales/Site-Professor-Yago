import api from '@api'

export async function listStudentsByClass(classId) {
  const { data } = await api.get(`/classes/${classId}/students`)
  return data
}

// Backwards-compatible alias for callers expecting a `listStudents` export
// The service still requires a class identifier and falls back to the
// class-based endpoint. When called without a class ID, the request will
// reject and callers are expected to handle the failure (e.g. returning an
// empty array).
export async function listStudents(classId) {
  return listStudentsByClass(classId)
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
  listStudents,
  createStudent,
}

