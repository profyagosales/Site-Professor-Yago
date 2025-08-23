import api from '@api'

export async function listUpcomingExams({ teacherId, daysAhead = 30, limit = 5 }){
  if (!teacherId) return []
  const { data } = await api.get(`/teachers/${teacherId}/exams/upcoming`, { params: { daysAhead, limit } })
  return data
}

export default {
  listUpcomingExams,
}
