import { api } from './api';

export type ClassSummary = {
  id: string;
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
    series: item.series,
    letter: item.letter,
    discipline: item.discipline,
    schedule: item.schedule,
    studentsCount: Number(item.studentsCount || 0),
    teachersCount: Number(item.teachersCount || 0),
  }));
}

export async function getClass(id: string): Promise<ClassDetails | null> {
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
    series: cast.series as number | undefined,
    letter: cast.letter as string | undefined,
    discipline: cast.discipline as string | undefined,
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
