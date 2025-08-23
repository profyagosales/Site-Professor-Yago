import { api } from '@/lib/api';

export async function listThemes() {
  const res = await fetch(api('/redactions/themes'));
  if (!res.ok) throw new Error('failed to list themes');
  return res.json();
}

export async function createTheme(payload: { name: string }) {
  const res = await fetch(api('/redactions/themes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('failed to create theme');
  return res.json();
}

export async function listSubmissionsByTeacher() {
  const res = await fetch(api('/redactions/submissions/teacher'));
  if (!res.ok) throw new Error('failed to list submissions');
  return res.json();
}

export async function createSubmission(formData: FormData) {
  if (!formData) throw new Error('formData required');
  const res = await fetch(api('/redactions/submissions'), {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('failed to create submission');
  return res.json();
}

export async function getSubmission(submissionId: string) {
  if (!submissionId) throw new Error('submissionId required');
  const res = await fetch(api(`/redactions/submissions/${submissionId}`));
  if (!res.ok) throw new Error('failed to get submission');
  return res.json();
}

export async function gradeEnem(submissionId: string, payload: { enemScore: number }) {
  if (!submissionId) throw new Error('submissionId required');
  const res = await fetch(api(`/redactions/submissions/${submissionId}/grade-enem`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('failed to grade ENEM');
  return res.json();
}

export async function gradePas(submissionId: string, payload: { NC?: number; NE?: number; NL?: number }) {
  if (!submissionId) throw new Error('submissionId required');
  const res = await fetch(api(`/redactions/submissions/${submissionId}/grade-pas`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('failed to grade PAS');
  return res.json();
}

export async function sendCorrectedPdf(submissionId: string) {
  if (!submissionId) throw new Error('submissionId required');
  const res = await fetch(api(`/redactions/submissions/${submissionId}/corrected-pdf`), {
    method: 'POST',
  });
  if (!res.ok) throw new Error('failed to send corrected pdf');
  try {
    return await res.json();
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
