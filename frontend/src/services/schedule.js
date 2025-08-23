import api from '@api'

export async function getTeacherWeeklySchedule(teacherId){
  if (!teacherId) return []
  const { data } = await api.get(`/teachers/${teacherId}/schedule`)
  return data
}

export default {
  getTeacherWeeklySchedule,
}
