import { api, toArray } from '@/lib/api';

function unwrapData(response) {
  if (!response) return {};
  const base = response.data !== undefined ? response.data : response;
  if (base && typeof base === 'object' && 'data' in base && base.success !== false) {
    return base.data ?? {};
  }
  return base ?? {};
}

function normalizeAttachment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = typeof raw.url === 'string' ? raw.url : null;
  if (!url) return null;
  return {
    url,
    name:
      typeof raw.name === 'string'
        ? raw.name
        : typeof raw.originalname === 'string'
          ? raw.originalname
          : null,
    mime: typeof raw.mime === 'string' ? raw.mime : null,
    size: Number.isFinite(raw.size) ? Number(raw.size) : null,
    publicId:
      typeof raw.publicId === 'string'
        ? raw.publicId
        : typeof raw.public_id === 'string'
          ? raw.public_id
          : null,
  };
}

function normalizeTarget(raw) {
  if (!raw || typeof raw !== 'object') {
    return { type: 'class', value: [] };
  }
  const type = typeof raw.type === 'string' ? raw.type : typeof raw.targetType === 'string' ? raw.targetType : 'class';
  const rawValue =
    Array.isArray(raw.value)
      ? raw.value
      : Array.isArray(raw.targetValues)
        ? raw.targetValues
        : [];
  const value = rawValue
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && entry.id) return String(entry.id);
      return entry != null ? String(entry) : null;
    })
    .filter((entry) => typeof entry === 'string' && entry.trim());
  return {
    type: type === 'email' ? 'email' : 'class',
    value,
  };
}

export function normalizeAnnouncement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw._id === 'string'
        ? raw._id
        : null;
  if (!id) return null;

  const schedule =
    raw.scheduleAt instanceof Date
      ? raw.scheduleAt.toISOString()
      : typeof raw.scheduleAt === 'string'
        ? raw.scheduleAt
        : raw.scheduledFor instanceof Date
          ? raw.scheduledFor.toISOString()
          : typeof raw.scheduledFor === 'string'
            ? raw.scheduledFor
            : null;

  const emailSentAt =
    raw.emailSentAt instanceof Date
      ? raw.emailSentAt.toISOString()
      : typeof raw.emailSentAt === 'string'
        ? raw.emailSentAt
        : null;

  const createdAt =
    raw.createdAt instanceof Date
      ? raw.createdAt.toISOString()
      : typeof raw.createdAt === 'string'
        ? raw.createdAt
        : null;

  const updatedAt =
    raw.updatedAt instanceof Date
      ? raw.updatedAt.toISOString()
      : typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : null;

  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map((item) => normalizeAttachment(item)).filter(Boolean)
    : [];

  const target = normalizeTarget(raw.target ?? raw);

  return {
    id,
    subject:
      typeof raw.subject === 'string' && raw.subject.trim()
        ? raw.subject.trim()
        : 'Aviso',
    message: typeof raw.message === 'string' ? raw.message : '',
    html: typeof raw.html === 'string' ? raw.html : '',
    attachments,
    classIds: Array.isArray(raw.classIds)
      ? raw.classIds.map((entry) => (typeof entry === 'string' ? entry : entry?._id || '')).filter(Boolean)
      : [],
    extraEmails: Array.isArray(raw.extraEmails)
      ? raw.extraEmails.filter((entry) => typeof entry === 'string' && entry.trim())
      : [],
    includeTeachers: Boolean(raw.includeTeachers),
    target,
    scheduleAt: schedule,
    emailStatus: typeof raw.emailStatus === 'string' ? raw.emailStatus : null,
    emailError: typeof raw.emailError === 'string' ? raw.emailError : null,
    emailSentAt,
    createdAt,
    updatedAt,
  };
}

function extractItems(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export async function listAnnouncements({ limit = 5, page = 1, includeScheduled = false, classId } = {}) {
  const params = {};
  if (Number.isFinite(limit)) params.limit = limit;
  if (Number.isFinite(page)) params.page = page;
  if (includeScheduled) params.includeScheduled = true;
  if (classId) params.classId = classId;

  const response = await api.get('/announcements', {
    params,
    meta: { noCache: true },
  });

  const data = unwrapData(response);
  const items = extractItems(data)
    .map((entry) => normalizeAnnouncement(entry))
    .filter(Boolean);

  const total = Number.isFinite(data?.total) ? Number(data.total) : items.length;
  const normalizedLimit = Number.isFinite(data?.limit) ? Number(data.limit) : limit;
  const normalizedPage = Number.isFinite(data?.page) ? Number(data.page) : page;
  const offset = Number.isFinite(data?.offset)
    ? Number(data.offset)
    : (normalizedPage - 1) * normalizedLimit;
  const hasMore =
    typeof data?.hasMore === 'boolean'
      ? data.hasMore
      : offset + items.length < total;

  return {
    items,
    total,
    limit: normalizedLimit,
    page: normalizedPage,
    offset,
    hasMore,
  };
}

export async function getClassAnnouncements({ classId, limit = 5 } = {}) {
  if (!classId) return [];
  const { items } = await listAnnouncements({ classId, limit });
  return items;
}

export async function listAnnouncementsForStudent({ studentId, limit = 5 } = {}) {
  if (!studentId) return [];
  const response = await api.get(`/announcements/student/${studentId}`, {
    params: { limit },
    meta: { noCache: true },
  });
  const data = unwrapData(response);
  return extractItems(data)
    .map((entry) => normalizeAnnouncement(entry))
    .filter(Boolean);
}

export async function createAnnouncement({
  type = 'class',
  value = [],
  subject,
  html,
  message,
  scheduleAt,
  bccTeachers = false,
  attachments = [],
} = {}) {
  const formData = new FormData();
  const normalizedType = type === 'email' ? 'email' : 'class';
  formData.append('type', normalizedType);

  toArray(value)
    .map((entry) => (entry != null ? String(entry).trim() : ''))
    .filter(Boolean)
    .forEach((entry) => {
      formData.append('value[]', entry);
    });

  if (typeof subject === 'string') {
    formData.append('subject', subject.trim());
  }
  if (typeof html === 'string') {
    formData.append('html', html);
  }
  if (typeof message === 'string' && message.trim()) {
    formData.append('message', message.trim());
  }
  if (scheduleAt) {
    formData.append('scheduleAt', scheduleAt);
  }
  if (bccTeachers) {
    formData.append('bccTeachers', 'true');
  }

  toArray(attachments).forEach((file) => {
    if (file instanceof File || (typeof Blob !== 'undefined' && file instanceof Blob)) {
      formData.append('files', file);
    }
  });

  const response = await api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    meta: { noCache: true },
  });

  const base = response?.data ?? {};
  const payload = base?.data ?? base;

  return {
    announcement: normalizeAnnouncement(payload),
    mail: base?.mail ?? null,
    raw: base,
  };
}

export async function updateAnnouncement(
  id,
  {
    type = 'class',
    value = [],
    subject,
    html,
    message,
    scheduleAt,
    bccTeachers = false,
    attachments = [],
    keepAttachments = [],
  } = {}
) {
  if (!id) {
    throw new Error('ID do aviso é obrigatório para atualização.');
  }

  const formData = new FormData();
  const normalizedType = type === 'email' ? 'email' : 'class';
  formData.append('type', normalizedType);

  toArray(value)
    .map((entry) => (entry != null ? String(entry).trim() : ''))
    .filter(Boolean)
    .forEach((entry) => {
      formData.append('value[]', entry);
    });

  if (typeof subject === 'string') {
    formData.append('subject', subject.trim());
  }
  if (typeof html === 'string') {
    formData.append('html', html);
  }
  if (typeof message === 'string' && message.trim()) {
    formData.append('message', message.trim());
  }
  if (scheduleAt) {
    formData.append('scheduleAt', scheduleAt);
  }
  if (bccTeachers) {
    formData.append('bccTeachers', 'true');
  }

  toArray(keepAttachments)
    .map((entry) => (entry != null ? String(entry).trim() : ''))
    .filter(Boolean)
    .forEach((entry) => {
      formData.append('keepAttachments[]', entry);
    });

  toArray(attachments).forEach((file) => {
    if (file instanceof File || (typeof Blob !== 'undefined' && file instanceof Blob)) {
      formData.append('files', file);
    }
  });

  const response = await api.put(`/announcements/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    meta: { noCache: true },
  });

  const base = response?.data ?? {};
  const payload = base?.data ?? base;

  return {
    announcement: normalizeAnnouncement(payload),
    mail: base?.mail ?? null,
    raw: base,
  };
}

export async function deleteAnnouncement(id) {
  if (!id) {
    throw new Error('ID do aviso é obrigatório para exclusão.');
  }
  await api.delete(`/announcements/${id}`, { meta: { noCache: true } });
  return true;
}

export default {
  listAnnouncements,
  listAnnouncementsForStudent,
  getClassAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  normalizeAnnouncement,
  uploadAnnouncementImage,
};

export async function uploadAnnouncementImage(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/announcements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    meta: { noCache: true },
  });
  const payload = response?.data?.data ?? response?.data ?? null;
  if (!payload) return null;
  return normalizeAttachment(payload);
}
