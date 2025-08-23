import { api } from '@/lib/api';

export async function listThemes() {
  const { data } = await api.get('/redactions/themes');
  return data;
}

export async function createTheme(payload: { name: string }) {
  const { data } = await api.post('/redactions/themes', payload);
  return data;
}

export async function listSubmissionsByTeacher() {
  const { data } = await api.get('/redactions/submissions/teacher');
  return data;
}

export async function createSubmission(formData: FormData) {
  if (!formData) throw new Error('formData required');
  const { data } = await api.post('/redactions/submissions', formData);
  return data;
}

export async function getSubmission(submissionId: string) {
  if (!submissionId) throw new Error('submissionId required');
  const { data } = await api.get(`/redactions/submissions/${submissionId}`);
  return data;
}

export async function gradeEnem(
  submissionId: string,
  payload: { enemScore: number }
) {
  if (!submissionId) throw new Error('submissionId required');
  const { data } = await api.post(
    `/redactions/submissions/${submissionId}/grade-enem`,
    payload
  );
  return data;
}

export async function gradePas(
  submissionId: string,
  payload: { NC?: number; NE?: number; NL?: number }
) {
  if (!submissionId) throw new Error('submissionId required');
  const { data } = await api.post(
    `/redactions/submissions/${submissionId}/grade-pas`,
    payload
  );
  return data;
}

export async function sendCorrectedPdf(submissionId: string) {
  if (!submissionId) throw new Error('submissionId required');
  const res = await api.post(
    `/redactions/submissions/${submissionId}/corrected-pdf`
  );
  try {
    return res.data;
  } catch {
    return undefined;
  }
}

export default {
  listThemes,
  createTheme,
  listSubmissionsByTeacher,
  createSubmission,
  getSubmission,
  gradeEnem,
  gradePas,
  sendCorrectedPdf,
};
