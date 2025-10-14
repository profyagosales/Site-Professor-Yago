import { api } from './api';
import type {
  ClassDetail as SchoolClassDetail,
  ClassSummary as SchoolClassSummary,
  StudentLite,
  StudentGrade,
  StudentNote,
  Weekday,
  TimeSlot,
  TeacherLite,
} from '@/types/school';

export type ClassSummary = {
  id: string;
  _id?: string;
  name?: string;
  subject?: string;
  year?: number;
  series?: number;
  letter?: string;
  discipline?: string;
  schedule?: any;
  studentsCount: number;
  teachersCount: number;
  teacherIds?: string[];
  responsibleTeacherId?: string | null;
};

export type ClassStudent = {
  id: string;
  name: string;
  rollNumber?: number;
  email?: string;
  photo?: string;
  phone?: string;
};

export type ClassTeacher = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  subjects: string[];
  responsible?: boolean;
};

export type ClassActivity = {
  id: string;
  _id: string;
  title: string;
  dateISO: string | null;
  createdAt: string;
};

export type ClassMilestone = {
  id: string;
  _id: string;
  label: string;
  dateISO: string | null;
};

export type ClassNoticeAudience = 'teachers' | 'all';

export type ClassNotice = {
  id: string;
  _id: string;
  message: string;
  audience: ClassNoticeAudience;
  createdAt: string;
  createdBy?: string;
};

export type ClassCalendarItem = {
  id: string;
  sourceId: string;
  type: 'activity' | 'milestone';
  title: string;
  dateISO: string;
  createdAt: string;
};

export type ClassEmailResult = {
  message: string;
  recipients: string[];
  stats: {
    totalSent: number;
    studentsSent: number;
    teachersSent: number;
    includeTeachers: boolean;
  };
  skipped: {
    studentsWithoutEmail: string[];
    teachersWithoutEmail: string[];
    duplicateEmails: string[];
  };
  messageId: string | null;
};

export type ClassGradeSnapshot = {
  score: number;
  status: GradeStatusValue;
};

export type ClassGradesStudent = {
  id: string;
  roll: number | null;
  name: string;
  email: string;
  photoUrl?: string | null;
  grades: Record<string, ClassGradeSnapshot>;
};

export type ClassGradesResponse = {
  class: {
    id: string;
    name: string;
    subject?: string;
    discipline?: string;
    series?: number | null;
    letter?: string;
    year?: number | null;
  };
  year: number;
  terms: number[];
  students: ClassGradesStudent[];
};

export type ClassDetails = {
  id: string;
  _id?: string;
  name?: string;
  subject?: string;
  year?: number;
  series?: number;
  letter?: string;
  discipline?: string;
  schedule?: any;
  studentsCount: number;
  teachersCount: number;
  teacherIds: string[];
  responsibleTeacherId?: string | null;
  students: ClassStudent[];
  teachers: ClassTeacher[];
  activities: ClassActivity[];
  milestones: ClassMilestone[];
  notices: ClassNotice[];
};

export type ClassTeacherList = {
  teachers: ClassTeacher[];
  teacherIds: string[];
  responsibleTeacherId?: string | null;
};

function extractData<T>(res: any): T | null {
  if (res?.data?.data !== undefined) return res.data.data as T;
  if (res?.data !== undefined) return res.data as T;
  return null;
}

function normalizeId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.id ?? obj._id;
    if (typeof candidate === 'string' && candidate) return candidate;
    if (candidate != null) return String(candidate);
  }
  return '';
}

function normalizeIdList(values: unknown[]): string[] {
  return values
    .map((value) => normalizeId(value))
    .filter((value) => typeof value === 'string' && value.length > 0) as string[];
}

function formatStudentRecord(raw: unknown): ClassStudent {
  const student = raw as Record<string, unknown>;
  const rollSource = student?.rollNumber as unknown;
  let rollNumber: number | undefined;
  if (typeof rollSource === 'number') {
    rollNumber = rollSource;
  } else if (typeof rollSource === 'string' && rollSource.trim() !== '') {
    const parsed = Number(rollSource);
    rollNumber = Number.isNaN(parsed) ? undefined : parsed;
  }

  return {
    id: normalizeId(student?.id ?? student?._id ?? student),
    name: typeof student?.name === 'string' ? student.name : '',
    rollNumber,
    email: typeof student?.email === 'string' ? student.email : undefined,
    photo: typeof student?.photo === 'string' ? student.photo : undefined,
    phone: typeof student?.phone === 'string' ? student.phone : undefined,
  };
}

function formatTeacherRecord(raw: unknown): ClassTeacher {
  const teacher = raw as Record<string, unknown>;
  const subjects = Array.isArray(teacher?.subjects)
    ? (teacher.subjects as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    id: normalizeId(teacher?.id ?? teacher?._id ?? teacher),
    name: typeof teacher?.name === 'string' ? teacher.name : '',
    email: typeof teacher?.email === 'string' ? teacher.email : undefined,
    phone: typeof teacher?.phone === 'string' ? teacher.phone : undefined,
    photoUrl: typeof teacher?.photoUrl === 'string' ? teacher.photoUrl : undefined,
    subjects,
    responsible: Boolean(teacher?.responsible),
  };
}

function parseTeacherListFromResponse(res: any): ClassTeacherList {
  const rawTeachers = extractData<any[]>(res) ?? [];
  const teachers = Array.isArray(rawTeachers) ? rawTeachers.map((item) => formatTeacherRecord(item)) : [];
  const meta = res?.data?.meta ?? {};
  const teacherIds = Array.isArray(meta?.teacherIds)
    ? normalizeIdList(meta.teacherIds as unknown[])
    : teachers.map((teacher) => teacher.id);
  const responsibleIdRaw = meta?.responsibleTeacherId;
  const responsibleTeacherId = responsibleIdRaw ? normalizeId(responsibleIdRaw) : undefined;

  const normalizedTeachers = teachers.map((teacher) => ({
    ...teacher,
    responsible: responsibleTeacherId ? teacher.id === responsibleTeacherId || teacher.responsible : teacher.responsible,
  }));

  return {
    teachers: normalizedTeachers,
    teacherIds,
    responsibleTeacherId: responsibleTeacherId || undefined,
  };
}

function normalizeIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toISOString();
}

function formatActivityRecord(raw: unknown): ClassActivity {
  const record = raw as Record<string, unknown>;
  const createdAtRaw = record?.createdAt;
  return {
    id: normalizeId(record?.id ?? record?._id ?? record),
    _id: normalizeId(record?.id ?? record?._id ?? record),
    title: typeof record?.title === 'string' ? record.title : '',
    dateISO: normalizeIsoDate(record?.dateISO),
    createdAt:
      createdAtRaw instanceof Date
        ? createdAtRaw.toISOString()
        : typeof createdAtRaw === 'string'
          ? createdAtRaw
          : new Date().toISOString(),
  };
}

function formatMilestoneRecord(raw: unknown): ClassMilestone {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record?.id ?? record?._id ?? record),
    _id: normalizeId(record?.id ?? record?._id ?? record),
    label: typeof record?.label === 'string' ? record.label : '',
    dateISO: normalizeIsoDate(record?.dateISO),
  };
}

function normalizeNoticeAudience(raw: unknown): ClassNoticeAudience {
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'all' || normalized === 'todos' || normalized === 'everyone') {
      return 'all';
    }
    if (normalized === 'teachers' || normalized === 'professores') {
      return 'teachers';
    }
  }
  return 'teachers';
}

function formatNoticeRecord(raw: unknown): ClassNotice {
  const record = raw as Record<string, unknown>;
  const createdAtRaw = record?.createdAt;
  return {
    id: normalizeId(record?.id ?? record?._id ?? record),
    _id: normalizeId(record?.id ?? record?._id ?? record),
    message: typeof record?.message === 'string' ? record.message : '',
    audience: normalizeNoticeAudience(record?.audience),
    createdBy: normalizeId(record?.createdBy),
    createdAt:
      createdAtRaw instanceof Date
        ? createdAtRaw.toISOString()
        : typeof createdAtRaw === 'string'
          ? createdAtRaw
          : new Date().toISOString(),
  };
}

function formatCalendarRecord(raw: unknown): ClassCalendarItem | null {
  const record = raw as Record<string, unknown>;
  const typeRaw = typeof record?.type === 'string' ? record.type.trim().toLowerCase() : '';
  const type = typeRaw === 'activity' || typeRaw === 'milestone' ? (typeRaw as 'activity' | 'milestone') : null;
  const dateISO = normalizeIsoDate(record?.dateISO);
  if (!type || !dateISO) {
    return null;
  }

  const rawId = normalizeId(record?.id ?? record?._id ?? record?.sourceId ?? record);
  const rawSourceId = normalizeId(record?.sourceId ?? record?.id ?? record?._id ?? record);
  const createdAt = normalizeIsoDate(record?.createdAt) ?? dateISO;
  const title = typeof record?.title === 'string' ? record.title : '';

  const safeId = rawId || `${type}-${dateISO}`;
  const safeSource = rawSourceId || safeId;

  return {
    id: safeId,
    sourceId: safeSource,
    type,
    title,
    dateISO,
    createdAt,
  };
}

const gradeStatusValues = ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'] as const;

export type GradeStatusValue = (typeof gradeStatusValues)[number];

function normalizeGradeStatus(raw: unknown): GradeStatusValue {
  if (typeof raw !== 'string') return 'FREQUENTE';
  const candidate = raw.trim().toUpperCase();
  return gradeStatusValues.includes(candidate as GradeStatusValue)
    ? (candidate as GradeStatusValue)
    : 'FREQUENTE';
}

function formatGradeRecord(raw: any): StudentGrade {
  const year = Number(raw?.year);
  const term = Number(raw?.term);
  const score = Number(raw?.score);
  const createdAtRaw = raw?.createdAt;
  const updatedAtRaw = raw?.updatedAt;

  return {
    _id: normalizeId(raw),
    studentId: normalizeId(raw?.student ?? raw?.studentId ?? raw?.student_id),
    classId: normalizeId(raw?.class ?? raw?.classId ?? raw?.class_id),
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    term: [1, 2, 3, 4].includes(term) ? (term as 1 | 2 | 3 | 4) : 1,
    score: Number.isFinite(score) ? score : 0,
    status: normalizeGradeStatus(raw?.status),
    createdAt:
      createdAtRaw instanceof Date
        ? createdAtRaw.toISOString()
        : typeof createdAtRaw === 'string'
          ? createdAtRaw
          : new Date().toISOString(),
    updatedAt:
      updatedAtRaw instanceof Date
        ? updatedAtRaw.toISOString()
        : typeof updatedAtRaw === 'string'
          ? updatedAtRaw
          : new Date().toISOString(),
  };
}

const dayNameToWeekday: Record<string, Weekday> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
};

function normalizeScheduleEntries(raw: unknown): Array<{ weekday: Weekday; slot: TimeSlot }> {
  if (!Array.isArray(raw)) return [];
  const entries: Array<{ weekday: Weekday; slot: TimeSlot }> = [];
  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const entry = item as Record<string, unknown>;
    const slotRaw = entry.slot ?? entry.timeSlot ?? entry.lesson;
    const slotNumber = typeof slotRaw === 'number' ? slotRaw : Number(slotRaw);
    if (![1, 2, 3].includes(slotNumber)) return;

    const pushDay = (value: unknown) => {
      if (typeof value === 'number' && value >= 1 && value <= 5) {
        entries.push({ weekday: value as Weekday, slot: slotNumber as TimeSlot });
      } else if (typeof value === 'string') {
        const mapped = dayNameToWeekday[value.trim().toUpperCase()];
        if (mapped) {
          entries.push({ weekday: mapped as Weekday, slot: slotNumber as TimeSlot });
        }
      }
    };

    if (Array.isArray(entry.days)) {
      entry.days.forEach(pushDay);
      return;
    }

    const weekdaysRaw = entry.weekdays ?? entry.weekDays;
    if (Array.isArray(weekdaysRaw)) {
      weekdaysRaw.forEach(pushDay);
      return;
    }

    const dayRaw = entry.weekday ?? entry.day ?? entry.weekDay;
    pushDay(dayRaw);
  });
  return entries;
}

function normalizeTeacherLite(raw: any): TeacherLite {
  return {
    id: normalizeId(raw),
    _id: normalizeId(raw),
    name: typeof raw?.name === 'string' ? raw.name : '',
    email: typeof raw?.email === 'string' ? raw.email : '',
    phone: typeof raw?.phone === 'string' ? raw.phone : undefined,
    photoUrl: typeof raw?.photoUrl === 'string' ? raw.photoUrl : undefined,
    subjects: Array.isArray(raw?.subjects)
      ? (raw.subjects as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    responsible: Boolean(raw?.responsible),
  };
}

function normalizeStudentLite(raw: any): StudentLite {
  const rollRaw = raw?.rollNumber;
  const rollNumber = typeof rollRaw === 'number' ? rollRaw : Number(rollRaw);
  return {
    _id: normalizeId(raw),
    name: typeof raw?.name === 'string' ? raw.name : '',
    email: typeof raw?.email === 'string' ? raw.email : '',
    phone: typeof raw?.phone === 'string' ? raw.phone : undefined,
    avatarUrl:
      typeof raw?.avatarUrl === 'string'
        ? raw.avatarUrl
        : typeof raw?.photo === 'string'
          ? raw.photo
          : undefined,
    rollNumber: Number.isNaN(rollNumber) ? undefined : rollNumber,
  };
}

function ensureResponseOk(res: any, fallbackMessage: string) {
  if (!res || typeof res.status !== 'number') {
    throw new Error(fallbackMessage);
  }
  if (res.status >= 400) {
    const message = res?.data?.message || fallbackMessage;
    throw new Error(message);
  }
  if (res?.data?.success === false) {
    const message = res.data?.message || fallbackMessage;
    throw new Error(message);
  }
}

function resolveData<T>(res: any, fallbackMessage: string): T {
  ensureResponseOk(res, fallbackMessage);
  const payload = extractData<T | undefined>(res);
  if (payload === undefined || payload === null) {
    throw new Error(fallbackMessage);
  }
  return payload;
}

function toSchoolSummary(raw: any): SchoolClassSummary {
  const subject = typeof raw?.subject === 'string' ? raw.subject : typeof raw?.discipline === 'string' ? raw.discipline : '';
  const teacherIdsSource = Array.isArray(raw?.teacherIds)
    ? raw.teacherIds
    : Array.isArray(raw?.teachers)
      ? raw.teachers
      : [];
  const teacherIds = normalizeIdList(Array.isArray(teacherIdsSource) ? teacherIdsSource : []);
  const responsibleTeacherId = raw?.responsibleTeacherId
    ? normalizeId(raw.responsibleTeacherId)
    : undefined;
  return {
    _id: normalizeId(raw),
    name: typeof raw?.name === 'string' ? raw.name : '',
    subject,
    year: typeof raw?.year === 'number' ? raw.year : undefined,
    studentsCount: Number(raw?.studentsCount ?? 0),
    teachersCount: Number(raw?.teachersCount ?? (Array.isArray(raw?.teachers) ? raw.teachers.length : 0)),
    teacherIds,
    responsibleTeacherId: responsibleTeacherId || undefined,
  };
}

function toSchoolDetail(raw: any): SchoolClassDetail {
  const summary = toSchoolSummary(raw);
  const teachers = Array.isArray(raw?.teachers) ? raw.teachers.map(normalizeTeacherLite) : [];
  const schedule = normalizeScheduleEntries(raw?.schedule);
  return {
    ...summary,
    schedule,
    teachers,
  };
}

export async function listClasses(): Promise<ClassSummary[]> {
  const res = await api.get('/classes', {
    meta: { noCache: true } as any,
    validateStatus: () => true,
  } as any);

  if (res.status === 401) {
    return [];
  }

  const data = extractData<ClassSummary[] | undefined>(res) ?? [];
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const teacherIds = Array.isArray((item as any)?.teacherIds)
      ? normalizeIdList((item as any).teacherIds as unknown[])
      : undefined;
    const responsibleId = normalizeId((item as any)?.responsibleTeacherId);

    return {
      id: normalizeId(item),
      _id: normalizeId(item),
      name: typeof (item as any)?.name === 'string' ? String((item as any).name) : undefined,
      subject: typeof (item as any)?.subject === 'string' ? String((item as any).subject) : undefined,
      year: typeof (item as any)?.year === 'number' ? (item as any).year : undefined,
      series: item.series,
      letter: item.letter,
      discipline: item.discipline ?? (item as any)?.subject,
      schedule: item.schedule,
      studentsCount: Number(item.studentsCount || 0),
      teachersCount: Number(item.teachersCount || 0),
      teacherIds,
      responsibleTeacherId: responsibleId || undefined,
    };
  });
}

export async function getClassDetails(id: string): Promise<ClassDetails | null> {
  if (!id) return null;
  const res = await api.get(`/classes/${id}`, {
    meta: { noCache: true } as any,
    validateStatus: () => true,
  } as any);

  if (res.status === 401) {
    return null;
  }

  if (res.status === 404) {
    return null;
  }

  if (res.status >= 400) {
    throw new Error(res.data?.message || 'Erro ao carregar turma');
  }

  const raw = extractData<ClassDetails | Record<string, unknown> | undefined>(res);
  if (!raw) return null;

  const cast = raw as Record<string, unknown>;
  const students = Array.isArray(cast.students) ? cast.students : [];
  const teachers = Array.isArray(cast.teachers) ? cast.teachers : [];
  const teacherIdsFromPayload = Array.isArray(cast.teacherIds)
    ? normalizeIdList(cast.teacherIds as unknown[])
    : normalizeIdList(teachers as unknown[]);
  const responsibleTeacherId = cast.responsibleTeacherId ? normalizeId(cast.responsibleTeacherId) : undefined;

  return {
    id: normalizeId(cast.id ?? cast._id ?? cast),
    _id: normalizeId(cast.id ?? cast._id ?? cast),
    name: typeof cast.name === 'string' ? cast.name : undefined,
    subject: typeof cast.subject === 'string' ? cast.subject : (typeof cast.discipline === 'string' ? cast.discipline : undefined),
    year: typeof cast.year === 'number' ? cast.year : undefined,
    series: cast.series as number | undefined,
    letter: cast.letter as string | undefined,
    discipline: (cast.discipline as string | undefined) ?? (cast.subject as string | undefined),
    schedule: cast.schedule,
    studentsCount: Number(cast.studentsCount || students.length || 0),
  teachersCount: Number(cast.teachersCount || teacherIdsFromPayload.length || teachers.length || 0),
  teacherIds: teacherIdsFromPayload,
  responsibleTeacherId: responsibleTeacherId || undefined,
    students: students.map((rawStudent) => formatStudentRecord(rawStudent)),
    teachers: teachers.map((rawTeacher) => formatTeacherRecord(rawTeacher)),
    activities: Array.isArray((cast as any).activities)
      ? (cast as any).activities.map((entry: unknown) => formatActivityRecord(entry))
      : [],
    milestones: Array.isArray((cast as any).milestones)
      ? (cast as any).milestones.map((entry: unknown) => formatMilestoneRecord(entry))
      : [],
    notices: Array.isArray((cast as any).notices)
      ? (cast as any).notices.map((entry: unknown) => formatNoticeRecord(entry))
      : [],
  };
}

export async function getClassCalendar(id: string): Promise<ClassCalendarItem[]> {
  if (!id) return [];
  const res = await api.get(`/classes/${id}/calendar`, {
    validateStatus: () => true,
  } as any);

  if (res.status === 401 || res.status === 404) {
    return [];
  }

  if (res.status >= 400) {
    throw new Error(res.data?.message || 'Erro ao carregar calendário da turma');
  }

  const data = extractData<any[]>(res) ?? [];
  if (!Array.isArray(data)) return [];

  return data
    .map((entry) => formatCalendarRecord(entry))
    .filter((entry): entry is ClassCalendarItem => Boolean(entry));
}

export async function sendClassEmail(
  id: string,
  payload: { subject: string; text?: string; html?: string; includeTeachers?: boolean }
): Promise<ClassEmailResult> {
  if (!id) {
    throw new Error('Turma inválida.');
  }

  const body: Record<string, unknown> = {
    subject: payload.subject,
  };
  if (payload.html) body.html = payload.html;
  if (payload.text) body.text = payload.text;
  if (payload.includeTeachers !== undefined) body.includeTeachers = payload.includeTeachers;

  const res = await api.post(`/classes/${id}/email`, body, {
    validateStatus: () => true,
  } as any);

  ensureResponseOk(res, 'Erro ao enviar o e-mail');
  const data = extractData<any>(res) ?? {};
  const skipped = data?.skipped ?? {};
  const stats = data?.stats ?? {};
  return {
    message: typeof res?.data?.message === 'string' ? res.data.message : 'E-mail enviado com sucesso.',
    recipients: Array.isArray(data?.recipients) ? (data.recipients as string[]) : [],
    stats: {
      totalSent: Number(stats?.totalSent ?? 0),
      studentsSent: Number(stats?.studentsSent ?? 0),
      teachersSent: Number(stats?.teachersSent ?? 0),
      includeTeachers: Boolean(stats?.includeTeachers),
    },
    skipped: {
      studentsWithoutEmail: Array.isArray(skipped?.studentsWithoutEmail)
        ? (skipped.studentsWithoutEmail as string[])
        : [],
      teachersWithoutEmail: Array.isArray(skipped?.teachersWithoutEmail)
        ? (skipped.teachersWithoutEmail as string[])
        : [],
      duplicateEmails: Array.isArray(skipped?.duplicateEmails) ? (skipped.duplicateEmails as string[]) : [],
    },
    messageId: typeof data?.messageId === 'string' ? data.messageId : data?.messageId ?? null,
  };
}

export async function getClassGrades(
  id: string,
  params: { year?: number; terms?: number[] } = {}
): Promise<ClassGradesResponse> {
  if (!id) {
    throw new Error('Turma inválida.');
  }

  const query: Record<string, unknown> = {};
  if (params.year) {
    query.year = params.year;
  }
  if (params.terms && params.terms.length) {
    query.terms = params.terms.join(',');
  }

  const res = await api.get(`/classes/${id}/grades`, {
    params: query,
    validateStatus: () => true,
  } as any);

  ensureResponseOk(res, 'Erro ao carregar notas da turma');

  const data = extractData<any>(res) ?? {};
  const rawStudents = Array.isArray(data?.students) ? data.students : [];

  const normalizeGrades = (rawGrades: any): Record<string, ClassGradeSnapshot> => {
    if (!rawGrades || typeof rawGrades !== 'object') return {};
    const result: Record<string, ClassGradeSnapshot> = {};
    Object.entries(rawGrades as Record<string, unknown>).forEach(([termKey, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const numericScore = Number((entry as any).score);
      if (!Number.isFinite(numericScore)) return;
      const status = normalizeGradeStatus((entry as any).status);
      result[String(termKey)] = {
        score: numericScore,
        status,
      };
    });
    return result;
  };

  const students: ClassGradesStudent[] = rawStudents.map((student: any) => ({
    id: normalizeId(student?.id ?? student?._id ?? student),
    roll: typeof student?.roll === 'number' ? student.roll : null,
    name: typeof student?.name === 'string' ? student.name : '',
    email: typeof student?.email === 'string' ? student.email : '',
    photoUrl: typeof student?.photoUrl === 'string' ? student.photoUrl : undefined,
    grades: normalizeGrades(student?.grades),
  }));

  const rawTerms: unknown[] = Array.isArray(data?.terms) ? data.terms : [];
  const mappedTerms = rawTerms
    .map((term) => Number(term))
    .filter((term): term is number => Number.isInteger(term));
  const validTerms = mappedTerms.filter((term) => [1, 2, 3, 4].includes(term));
  const normalizedTerms = Array.from(new Set<number>(validTerms)).sort((a, b) => a - b);

  const rawYear = Number(data?.year ?? params.year ?? new Date().getFullYear());
  const safeYear = Number.isFinite(rawYear) ? rawYear : new Date().getFullYear();

  const rawClass = data?.class ?? {};
  const classPayload = {
    id: normalizeId(rawClass?.id ?? rawClass?._id ?? id),
    name: typeof rawClass?.name === 'string' ? rawClass.name : '',
    subject: typeof rawClass?.subject === 'string' ? rawClass.subject : undefined,
    discipline: typeof rawClass?.discipline === 'string' ? rawClass.discipline : undefined,
    series: typeof rawClass?.series === 'number' ? rawClass.series : undefined,
    letter: typeof rawClass?.letter === 'string' ? rawClass.letter : undefined,
    year: typeof rawClass?.year === 'number' ? rawClass.year : undefined,
  };

  return {
    class: classPayload,
    year: safeYear,
    terms: normalizedTerms.length ? normalizedTerms : [1, 2, 3, 4],
    students,
  };
}

export async function exportClassGradesPdf(
  id: string,
  params: { year?: number; terms?: number[]; includeTotal?: boolean; sum?: boolean } = {}
): Promise<Blob> {
  if (!id) {
    throw new Error('Turma inválida.');
  }

  const query: Record<string, unknown> = {};
  if (params.year) {
    query.year = params.year;
  }
  if (params.terms && params.terms.length) {
    query.terms = params.terms.join(',');
  }
  if (params.includeTotal !== undefined) {
    query.includeTotal = params.includeTotal;
  } else if (params.sum !== undefined) {
    query.includeTotal = params.sum;
  }
  if (params.sum !== undefined) {
    query.sum = params.sum;
  }

  const res = await api.get(`/classes/${id}/grades/export.pdf`, {
    params: query,
    responseType: 'blob',
    validateStatus: () => true,
  } as any);

  if (res.status >= 200 && res.status < 300) {
    return res.data as Blob;
  }

  let message = 'Erro ao exportar notas da turma';
  try {
    const response = await new Response(res.data).text();
    const parsed = JSON.parse(response);
    if (parsed && typeof parsed.message === 'string') {
      message = parsed.message;
    }
  } catch (err) {
    // Ignora erros ao tentar extrair mensagem detalhada
  }

  const error = new Error(message);
  (error as any).status = res.status ?? 500;
  throw error;
}

export type UpsertStudentInput = {
  name: string;
  email: string;
  rollNumber?: number | '' | null;
  phone?: string;
  password?: string;
  generatePassword?: boolean;
  sendInvite?: boolean;
  photoFile?: File | null;
  removePhoto?: boolean;
};

export type StudentMutationResult = {
  student: ClassStudent;
  studentsCount: number;
  temporaryPassword?: string;
};

export type UpsertStudentGradeInput = {
  year: number;
  term: 1 | 2 | 3 | 4;
  score: number;
  status: GradeStatusValue;
};

function parseStudentMutationResponse(res: any): StudentMutationResult {
  const payload = res?.data ?? {};
  const meta = payload.meta ?? {};
  const studentsCount = Number(meta.studentsCount ?? 0);
  const studentData = payload.data ?? {};
  return {
    student: formatStudentRecord(studentData),
    studentsCount,
    temporaryPassword: meta.temporaryPassword ? String(meta.temporaryPassword) : undefined,
  };
}

function handleStudentError(res: any): never {
  const message = res?.data?.message || res?.message || 'Erro ao comunicar com o servidor';
  throw new Error(message);
}

export async function addStudent(classId: string, input: UpsertStudentInput): Promise<StudentMutationResult> {
  const form = new FormData();
  form.append('name', input.name);
  form.append('email', input.email);
  if (input.rollNumber !== undefined && input.rollNumber !== null && input.rollNumber !== '') {
    form.append('rollNumber', String(input.rollNumber));
  }
  if (input.phone !== undefined) {
    form.append('phone', input.phone);
  }
  if (input.password) {
    form.append('password', input.password);
  }
  if (input.generatePassword) {
    form.append('generatePassword', 'true');
  }
  if (input.sendInvite) {
    form.append('sendInvite', 'true');
  }
  if (input.photoFile) {
    form.append('photo', input.photoFile);
  }

  const res = await api.post(`/classes/${classId}/students`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: () => true,
  } as any);

  if (res.status >= 400) {
    handleStudentError(res);
  }

  return parseStudentMutationResponse(res);
}

export async function updateStudent(
  classId: string,
  studentId: string,
  input: UpsertStudentInput
): Promise<StudentMutationResult> {
  const form = new FormData();
  if (input.name !== undefined) {
    form.append('name', input.name);
  }
  if (input.email !== undefined) {
    form.append('email', input.email);
  }
  if (input.rollNumber !== undefined) {
    if (input.rollNumber === null || input.rollNumber === '') {
      form.append('rollNumber', '');
    } else {
      form.append('rollNumber', String(input.rollNumber));
    }
  }
  if (input.phone !== undefined) {
    form.append('phone', input.phone);
  }
  if (input.password) {
    form.append('password', input.password);
  }
  if (input.generatePassword) {
    form.append('generatePassword', 'true');
  }
  if (input.sendInvite) {
    form.append('sendInvite', 'true');
  }
  if (input.photoFile) {
    form.append('photo', input.photoFile);
  }
  if (input.removePhoto) {
    form.append('removePhoto', 'true');
  }

  const res = await api.patch(`/classes/${classId}/students/${studentId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: () => true,
  } as any);

  if (res.status >= 400) {
    handleStudentError(res);
  }

  return parseStudentMutationResponse(res);
}

export async function getStudentGrades(classId: string, studentId: string): Promise<StudentGrade[]> {
  if (!classId || !studentId) return [];

  const res = await api.get(`/classes/${classId}/students/${studentId}/grades`, {
    validateStatus: () => true,
    meta: { noCache: true } as any,
  } as any);

  if (res.status === 404) {
    return [];
  }

  if (res.status >= 400) {
    const message = res?.data?.message || 'Erro ao carregar notas do aluno';
    throw new Error(message);
  }

  const payload = extractData<StudentGrade[] | unknown[]>(res) ?? [];
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => formatGradeRecord(item));
}

export async function upsertStudentGrade(
  classId: string,
  studentId: string,
  input: UpsertStudentGradeInput
): Promise<StudentGrade> {
  if (!classId || !studentId) {
    throw new Error('Turma ou aluno inválido');
  }

  const res = await api.post(
    `/classes/${classId}/students/${studentId}/grades`,
    {
      year: input.year,
      term: input.term,
      score: input.score,
      status: input.status,
    },
    {
      validateStatus: () => true,
    } as any
  );

  if (res.status >= 400) {
    const message = res?.data?.message || 'Erro ao salvar nota do aluno';
    throw new Error(message);
  }

  const payload = extractData<StudentGrade | Record<string, unknown>>(res);
  if (!payload) {
    throw new Error('Resposta inválida do servidor');
  }

  return formatGradeRecord(payload);
}

export async function removeStudent(classId: string, studentId: string): Promise<{ studentsCount: number }> {
  const res = await api.delete(`/classes/${classId}/students/${studentId}`, {
    validateStatus: () => true,
  } as any);

  if (res.status >= 400) {
    handleStudentError(res);
  }

  const meta = res?.data?.meta ?? {};
  return {
    studentsCount: Number(meta.studentsCount ?? 0),
  };
}

export async function createClass(payload: {
  name: string;
  subject: string;
  year?: number;
  responsibleTeacherId?: string | null;
}): Promise<SchoolClassDetail> {
  const body: Record<string, unknown> = {
    name: payload.name,
    subject: payload.subject,
  };
  if (payload.year !== undefined) {
    body.year = payload.year;
  }
  if (payload.responsibleTeacherId !== undefined) {
    body.responsibleTeacherId = payload.responsibleTeacherId;
  }

  const res = await api.post('/classes', body, { validateStatus: () => true } as any);
  const data = resolveData<any>(res, 'Erro ao criar turma');
  return toSchoolDetail(data);
}

export async function updateClass(
  id: string,
  payload: Partial<{ name: string; subject: string; year: number; responsibleTeacherId: string | null }>
): Promise<SchoolClassDetail> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.subject !== undefined) body.subject = payload.subject;
  if (payload.year !== undefined) body.year = payload.year;
  if (payload.responsibleTeacherId !== undefined) {
    body.responsibleTeacherId = payload.responsibleTeacherId;
  }

  const res = await api.patch(`/classes/${id}`, body, { validateStatus: () => true } as any);
  const data = resolveData<any>(res, 'Erro ao atualizar turma');
  return toSchoolDetail(data);
}

export async function deleteClass(id: string): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${id}`, { validateStatus: () => true } as any);
  ensureResponseOk(res, 'Erro ao remover turma');
  return { success: true };
}

export async function getClass(id: string): Promise<SchoolClassDetail> {
  const res = await api.get(`/classes/${id}`, { validateStatus: () => true } as any);
  const data = resolveData<any>(res, 'Erro ao buscar turma');
  return toSchoolDetail(data);
}

export async function updateClassSchedule(
  id: string,
  schedule: Array<{ slot: TimeSlot; days: Weekday[] }>
): Promise<SchoolClassDetail> {
  const res = await api.put(`/classes/${id}/schedule`, { schedule }, { validateStatus: () => true } as any);
  const data = resolveData<any>(res, 'Erro ao atualizar horários da turma');
  return toSchoolDetail(data);
}

export async function listClassStudents(classId: string): Promise<StudentLite[]> {
  const res = await api.get(`/classes/${classId}/students`, { validateStatus: () => true } as any);
  ensureResponseOk(res, 'Erro ao carregar alunos da turma');
  const data = extractData<any[]>(res) ?? [];
  return data.map(normalizeStudentLite);
}

export async function addClassStudent(classId: string, payload: FormData): Promise<StudentLite> {
  const res = await api.post(`/classes/${classId}/students`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: () => true,
  } as any);
  const data = resolveData<any>(res, 'Erro ao adicionar aluno na turma');
  return normalizeStudentLite(data);
}

export async function updateClassStudent(
  classId: string,
  studentId: string,
  payload: FormData | Record<string, unknown>
): Promise<StudentLite> {
  const config: Record<string, unknown> = { validateStatus: () => true };
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }
  const res = await api.patch(`/classes/${classId}/students/${studentId}`, payload as any, config as any);
  const data = resolveData<any>(res, 'Erro ao atualizar aluno da turma');
  return normalizeStudentLite(data);
}

export async function removeClassStudent(classId: string, studentId: string): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${classId}/students/${studentId}`, { validateStatus: () => true } as any);
  ensureResponseOk(res, 'Erro ao remover aluno da turma');
  return { success: true };
}

export async function searchTeachers(query: string, limit = 6): Promise<TeacherLite[]> {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) {
    return [];
  }

  const params: Record<string, unknown> = { q: trimmed };
  if (limit && Number.isFinite(limit)) {
    params.limit = limit;
  }

  const res = await api.get('/teachers/search', {
    params,
    validateStatus: () => true,
  } as any);

  ensureResponseOk(res, 'Erro ao buscar professores');
  const data = extractData<any[]>(res) ?? [];
  return Array.isArray(data) ? data.map(normalizeTeacherLite) : [];
}

export async function listClassTeachers(classId: string): Promise<ClassTeacherList> {
  if (!classId) {
    throw new Error('Turma inválida');
  }

  const res = await api.get(`/classes/${classId}/teachers`, {
    validateStatus: () => true,
  } as any);

  ensureResponseOk(res, 'Erro ao carregar professores da turma');
  return parseTeacherListFromResponse(res);
}

export async function setResponsibleTeacher(classId: string, teacherId: string): Promise<ClassTeacherList> {
  if (!classId || !teacherId) {
    throw new Error('Turma ou professor inválido');
  }

  const res = await api.patch(
    `/classes/${classId}/responsible`,
    { teacherId },
    { validateStatus: () => true } as any
  );

  ensureResponseOk(res, 'Erro ao atualizar professor responsável');
  return parseTeacherListFromResponse(res);
}

export async function addClassActivity(
  classId: string,
  payload: { title: string; dateISO?: string | null }
): Promise<ClassActivity> {
  const body: Record<string, unknown> = { title: payload.title };
  if (payload.dateISO) {
    body.dateISO = payload.dateISO;
  }
  const res = await api.post(`/classes/${classId}/activities`, body, {
    validateStatus: () => true,
  } as any);
  return resolveData<ClassActivity>(res, 'Erro ao cadastrar atividade');
}

export async function removeClassActivity(classId: string, activityId: string): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${classId}/activities/${activityId}`, {
    validateStatus: () => true,
  } as any);
  ensureResponseOk(res, 'Erro ao remover atividade');
  return { success: true };
}

export async function addClassMilestone(
  classId: string,
  payload: { label: string; dateISO?: string | null }
): Promise<ClassMilestone> {
  const body: Record<string, unknown> = { label: payload.label };
  if (payload.dateISO) {
    body.dateISO = payload.dateISO;
  }
  const res = await api.post(`/classes/${classId}/milestones`, body, {
    validateStatus: () => true,
  } as any);
  return resolveData<ClassMilestone>(res, 'Erro ao cadastrar data importante');
}

export async function removeClassMilestone(classId: string, milestoneId: string): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${classId}/milestones/${milestoneId}`, {
    validateStatus: () => true,
  } as any);
  ensureResponseOk(res, 'Erro ao remover data importante');
  return { success: true };
}

export async function addClassNotice(
  classId: string,
  payload: { message: string; audience: ClassNoticeAudience }
): Promise<ClassNotice> {
  const body: Record<string, unknown> = {
    message: payload.message,
    audience: payload.audience,
  };

  const res = await api.post(`/classes/${classId}/notices`, body, {
    validateStatus: () => true,
  } as any);
  return resolveData<ClassNotice>(res, 'Erro ao registrar aviso');
}

export async function removeClassNotice(classId: string, noticeId: string): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${classId}/notices/${noticeId}`, {
    validateStatus: () => true,
  } as any);
  ensureResponseOk(res, 'Erro ao remover aviso');
  return { success: true };
}

export async function listStudentNotes(studentId: string, classId: string): Promise<StudentNote[]> {
  const res = await api.get(`/classes/${classId}/students/${studentId}/notes`, { validateStatus: () => true } as any);
  ensureResponseOk(res, 'Erro ao listar anotações do aluno');
  return extractData<StudentNote[]>(res) ?? [];
}

export async function addStudentNote(
  studentId: string,
  classId: string,
  payload: { body: string; visibleToStudent: boolean }
): Promise<StudentNote> {
  const res = await api.post(`/classes/${classId}/students/${studentId}/notes`, payload, {
    validateStatus: () => true,
  } as any);
  return resolveData<StudentNote>(res, 'Erro ao criar anotação');
}

export async function updateStudentNote(
  studentId: string,
  classId: string,
  noteId: string,
  payload: Partial<{ body: string; visibleToStudent: boolean }>
): Promise<StudentNote> {
  const res = await api.patch(`/classes/${classId}/students/${studentId}/notes/${noteId}`, payload, {
    validateStatus: () => true,
  } as any);
  return resolveData<StudentNote>(res, 'Erro ao atualizar anotação');
}

export async function deleteStudentNote(
  studentId: string,
  classId: string,
  noteId: string
): Promise<{ success: true }> {
  const res = await api.delete(`/classes/${classId}/students/${studentId}/notes/${noteId}`, {
    validateStatus: () => true,
  } as any);
  ensureResponseOk(res, 'Erro ao remover anotação');
  return { success: true };
}

export async function sendStudentEmail(
  classId: string,
  studentId: string,
  payload: { subject: string; html?: string; text?: string; scheduleAt?: string }
) {
  const res = await api.post(`/classes/${classId}/students/${studentId}/email`, payload, {
    validateStatus: () => true,
  } as any);
  ensureResponseOk(res, 'Erro ao enviar o e-mail');
  return extractData(res) ?? res?.data ?? { success: true };
}
