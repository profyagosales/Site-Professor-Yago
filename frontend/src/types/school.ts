export type Weekday = 1 | 2 | 3 | 4 | 5;
export type TimeSlot = 1 | 2 | 3;

export interface ClassSummary {
  _id: string;
  name: string;
  subject: string;
  year?: number;
  studentsCount: number;
  teachersCount: number;
  teacherIds?: string[];
  responsibleTeacherId?: string | null;
}

export interface TeacherLite {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  subjects?: string[];
  responsible?: boolean;
}

export interface ClassDetail extends ClassSummary {
  schedule: Array<{ weekday: Weekday; slot: TimeSlot }>;
  teachers: TeacherLite[];
}

export interface StudentLite {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  rollNumber?: number;
}

export interface StudentGrade {
  _id: string;
  studentId: string;
  classId: string;
  year: number;
  term: 1 | 2 | 3 | 4;
  score: number;
  status: 'FREQUENTE' | 'INFREQUENTE' | 'TRANSFERIDO' | 'ABANDONO';
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  _id?: string;
  classId: string;
  className: string;
  bimester: 1 | 2 | 3 | 4;
  title: string;
  description?: string;
  date: string;
  done: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentNote {
  _id: string;
  studentId: string;
  classId: string;
  body: string;
  visibleToStudent: boolean;
  createdAt: string;
  updatedAt: string;
}
