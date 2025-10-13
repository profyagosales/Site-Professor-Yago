import { api } from './api';
import type {
  ClassDetail as SchoolClassDetail,
  ClassSummary as SchoolClassSummary,
  StudentLite,
  StudentGrade,
  StudentNote,
  Weekday,
  TimeSlot,
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
  subjects: string[];
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
  students: ClassStudent[];
  teachers: ClassTeacher[];
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
    subjects,
  };
}

const gradeStatusValues = ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'] as const;

type GradeStatusValue = (typeof gradeStatusValues)[number];

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
    const dayRaw = entry.weekday ?? entry.day ?? entry.weekDay;
    let weekday: Weekday | undefined;
    if (typeof dayRaw === 'number' && dayRaw >= 1 && dayRaw <= 5) {
      weekday = dayRaw as Weekday;
    } else if (typeof dayRaw === 'string') {
      const mapped = dayNameToWeekday[dayRaw.trim().toUpperCase()];
      if (mapped) weekday = mapped;
    }
    if (!weekday) return;
    entries.push({ weekday, slot: slotNumber as TimeSlot });
  });
  return entries;
}

function normalizeTeacherLite(raw: any): { _id: string; name: string; email: string } {
  return {
    _id: normalizeId(raw),
    name: typeof raw?.name === 'string' ? raw.name : '',
    email: typeof raw?.email === 'string' ? raw.email : '',
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
  return {
    _id: normalizeId(raw),
    name: typeof raw?.name === 'string' ? raw.name : '',
    subject,
    year: typeof raw?.year === 'number' ? raw.year : undefined,
    studentsCount: Number(raw?.studentsCount ?? 0),
    teachersCount: Number(raw?.teachersCount ?? (Array.isArray(raw?.teachers) ? raw.teachers.length : 0)),
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
  return data.map((item) => ({
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
  }));
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
    teachersCount: Number(cast.teachersCount || teachers.length || 0),
    students: students.map((rawStudent) => formatStudentRecord(rawStudent)),
    teachers: teachers.map((rawTeacher) => formatTeacherRecord(rawTeacher)),
  };
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
}): Promise<SchoolClassDetail> {
  const res = await api.post('/classes', payload, { validateStatus: () => true } as any);
  const data = resolveData<any>(res, 'Erro ao criar turma');
  return toSchoolDetail(data);
}

export async function updateClass(
  id: string,
  payload: Partial<{ name: string; subject: string; year: number }>
): Promise<SchoolClassDetail> {
  const res = await api.patch(`/classes/${id}`, payload, { validateStatus: () => true } as any);
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
  schedule: SchoolClassDetail['schedule']
): Promise<SchoolClassDetail> {
  const res = await api.patch(`/classes/${id}/schedule`, { schedule }, { validateStatus: () => true } as any);
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
