export type AgendaUpdatePayload = {
  title?: string;
  description?: string | null;
  date?: string | null;
  classId?: string | null;
  type?: string;
};

async function handleResponse(response: Response) {
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    const error = message?.trim() ? message : 'Falha ao comunicar com a agenda';
    throw new Error(error);
  }
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return true;
}

export async function updateAgenda(id: string, data: AgendaUpdatePayload) {
  const response = await fetch(`/api/agenda/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function deleteAgenda(id: string) {
  const response = await fetch(`/api/agenda/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await handleResponse(response);
  return true;
}

export default {
  updateAgenda,
  deleteAgenda,
};
