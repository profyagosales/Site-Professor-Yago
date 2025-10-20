import { api } from '@/services/api';
import { listClasses } from '@/services/classes.service';
import { getGradesSummary } from '@/services/gradesSummary';
import { listGradeActivities } from '@/services/gradeActivities';
import { getGradesTable } from '@/services/gradesTable';
import type { GradesTableResponse } from '@/services/gradesTable';
import type { RadarDataset, RadarFilters, RadarStudent, RadarClass, RadarActivity, RadarGrade, RadarApprovalSlice, RadarTimeseriesPoint, RadarDistributionPoint } from '@/types/radar';

function createInitialApprovals(): { bim: RadarApprovalSlice; year: RadarApprovalSlice } {
  const slice: RadarApprovalSlice = { pass: 0, risk: 0, none: 0 };
  return {
    bim: { ...slice },
    year: { ...slice },
  };
}

function buildFallbackStudents(classes: RadarClass[]): RadarStudent[] {
  const samples: RadarStudent[] = [];
  classes.forEach((cls, idx) => {
    const baseName = cls.name || `Turma ${idx + 1}`;
    for (let i = 0; i < 5; i += 1) {
      const name = `${baseName} Aluno ${i + 1}`;
      samples.push({
        id: `${cls.id || 'class'}-${i}`,
        name,
        initials: name
          .split(' ')
          .map((part) => part.charAt(0))
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        classId: cls.id,
        metrics: {
          avg: 6 + Math.random() * 4,
          delta: (Math.random() - 0.5) * 1.2,
          sparkline: Array.from({ length: 8 }, () => 5 + Math.random() * 5),
          consistency: Math.random(),
        },
      });
    }
  });
  return samples;
}

function buildFallbackActivities(classes: RadarClass[]): RadarActivity[] {
  return classes.flatMap((cls, idx) =>
    ['Prova', 'Trabalho', 'Projeto', 'Atividade'].map((label, order) => ({
      id: `${cls.id || 'class'}-act-${order}`,
      title: `${label} ${idx + 1}`,
      dateISO: new Date(Date.now() - order * 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: label,
      classId: cls.id,
    }))
  );
}

function buildFallbackGrades(students: RadarStudent[], activities: RadarActivity[]): RadarGrade[] {
  return students.flatMap((student) =>
    activities
      .filter((activity) => !activity.classId || activity.classId === student.classId)
      .map((activity) => ({
        id: `${student.id}-${activity.id}`,
        studentId: student.id,
        activityId: activity.id,
        classId: activity.classId,
        value: Math.round(60 + Math.random() * 40) / 10,
        weight: 1,
        impact: Math.random(),
      }))
  );
}

function buildFallbackTimeseries(): RadarTimeseriesPoint[] {
  const now = new Date();
  const points: RadarTimeseriesPoint[] = [];
  for (let i = 0; i < 16; i += 1) {
    const date = new Date(now.getTime() - (15 - i) * 7 * 24 * 60 * 60 * 1000);
    const value = 5 + Math.random() * 5;
    const comparative = value + (Math.random() - 0.5);
    points.push({
      id: `ts-${i}`,
      dateISO: date.toISOString(),
      value,
      comparative,
      type: i % 4 === 0 ? 'Prova' : 'Atividade',
    });
  }
  return points;
}

function buildFallbackDistributions(classes: RadarClass[], students: RadarStudent[]): RadarDistributionPoint[] {
  return students.map((student) => ({
    id: `dist-${student.id}`,
    groupId: student.classId || classes[0]?.id || 'default',
    value: Math.round((student.metrics?.avg ?? 6) * 10) / 10,
    studentId: student.id,
  }));
}

function ensureAvatarInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'A';
}

function normalizeClass(raw: any): RadarClass | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: raw.name || raw.title || raw.label || `Turma ${id}`,
    color: raw.color ?? raw.hexColor ?? null,
    subject: raw.subject ?? raw.discipline ?? null,
    year: typeof raw.year === 'number' ? raw.year : null,
  };
}

function normalizeStudent(raw: any, classId?: string | null): RadarStudent | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? '').trim();
  if (!id) return null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Aluno';
  const avatarUrl = raw.photoUrl ?? raw.photo ?? null;
  return {
    id,
    name,
    avatarUrl,
    classId: classId ?? raw.classId ?? null,
    initials: ensureAvatarInitials(name),
    metrics: {
      avg: typeof raw.avg === 'number' ? raw.avg : undefined,
      delta: typeof raw.delta === 'number' ? raw.delta : undefined,
      sparkline: Array.isArray(raw.sparkline) ? raw.sparkline : undefined,
      consistency: typeof raw.consistency === 'number' ? raw.consistency : undefined,
    },
  };
}

function normalizeActivity(raw: any): RadarActivity | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? '').trim();
  if (!id) return null;
  return {
    id,
    title: raw.title ?? raw.label ?? `Atividade ${id}`,
    dateISO: raw.dateISO ?? raw.date ?? raw.createdAt ?? null,
    type: raw.type ?? raw.category ?? null,
    classId: raw.classId ?? raw.turmaId ?? null,
  };
}

function normalizeGradesTable(response: GradesTableResponse | null | undefined, classId: string): RadarGrade[] {
  if (!response?.rows?.length) return [];
  const grades: RadarGrade[] = [];
  response.rows.forEach((row) => {
    const studentId = row.studentId || row.studentName;
    Object.entries(row.values ?? {}).forEach(([activityId, value]) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      grades.push({
        id: `${studentId}-${activityId}`,
        studentId,
        activityId,
        classId,
        value: numeric,
        weight: 1,
        impact: undefined,
      });
    });
  });
  return grades;
}

function computeKpis(students: RadarStudent[], fallback: RadarDataset['kpis']): RadarDataset['kpis'] {
  if (!students.length) return fallback;
  const avgList = students.map((student) => student.metrics?.avg ?? 0).filter((value) => Number.isFinite(value));
  if (!avgList.length) return fallback;
  const avg = avgList.reduce((sum, value) => sum + value, 0) / avgList.length;
  const passBim = avgList.filter((value) => value >= 6).length / avgList.length;
  const passYear = avgList.filter((value) => value >= 7).length / avgList.length;
  return {
    avg,
    passBim: passBim * 100,
    passYear: passYear * 100,
    avgSparkline: fallback.avgSparkline,
    passBimDelta: fallback.passBimDelta,
    passYearDelta: fallback.passYearDelta,
  };
}

function buildFallbackDataset(classes: RadarClass[]): RadarDataset {
  const students = buildFallbackStudents(classes.length ? classes : [{ id: 'default', name: 'Turma' }]);
  const activities = buildFallbackActivities(classes.length ? classes : [{ id: 'default', name: 'Turma' }]);
  const grades = buildFallbackGrades(students, activities);
  const approvals = createInitialApprovals();
  approvals.bim = { pass: 60, risk: 25, none: 15 };
  approvals.year = { pass: 72, risk: 18, none: 10 };
  const timeseries = buildFallbackTimeseries();
  const distributions = buildFallbackDistributions(classes, students);
  return {
    students,
    classes,
    activities,
    grades,
    approvals,
    kpis: {
      avg: 7.2,
      passBim: 68,
      passYear: 74,
      avgSparkline: timeseries.slice(-8).map((point) => point.value),
      passBimDelta: 2.3,
      passYearDelta: 1.1,
    },
    timeseries,
    distributions,
  };
}

export async function fetchRadarData(filters: RadarFilters): Promise<RadarDataset> {
  try {
    const classesResponse = await listClasses().catch(async () => {
      const response = await api.get('/classes', { meta: { noCache: true } }).catch(() => null);
      const payload = response?.data?.data ?? response?.data ?? [];
      return Array.isArray(payload) ? payload : [];
    });

    const classes: RadarClass[] = (Array.isArray(classesResponse) ? classesResponse : [])
      .map((entry) => normalizeClass(entry))
      .filter((entry): entry is RadarClass => Boolean(entry));

    const selectedClassIds = filters.classes.length ? filters.classes : classes.map((cls) => cls.id);
    const primaryClassId = selectedClassIds[0];

    const summary = primaryClassId
      ? await getGradesSummary({ year: filters.year, bimesters: filters.bimesters, classId: primaryClassId }).catch(() => null)
      : null;

    const activities = primaryClassId
      ? await listGradeActivities({ classId: primaryClassId, year: filters.year }).catch(() => [])
      : [];

    let gradesTable: GradesTableResponse | null = null;
    if (primaryClassId) {
      gradesTable = await getGradesTable({ classId: primaryClassId, year: filters.year, bimesters: filters.bimesters }).catch(() => null);
    }

    const normalizedActivities = activities
      .map((entry) => normalizeActivity(entry))
      .filter((entry): entry is RadarActivity => Boolean(entry));

    const fallbackDataset = buildFallbackDataset(classes.length ? classes : [{ id: 'default', name: 'Turma' }]);

    const students: RadarStudent[] = (gradesTable?.rows ?? [])
      .map((row) =>
        normalizeStudent(
          {
            id: row.studentId,
            name: row.studentName,
            avg:
              summary?.avgByBimester && filters.bimesters.length
                ? summary.avgByBimester[filters.bimesters[0]]
                : undefined,
          },
          primaryClassId
        )
      )
      .filter((entry): entry is RadarStudent => Boolean(entry));

    const grades = primaryClassId ? normalizeGradesTable(gradesTable, primaryClassId) : [];

    if (!students.length) {
      return fallbackDataset;
    }

    const dataset: RadarDataset = {
      students,
      classes,
      activities: normalizedActivities.length ? normalizedActivities : fallbackDataset.activities,
      grades: grades.length ? grades : fallbackDataset.grades,
      approvals: fallbackDataset.approvals,
      kpis: computeKpis(students, fallbackDataset.kpis),
      timeseries: fallbackDataset.timeseries,
      distributions: fallbackDataset.distributions,
    };

    return dataset;
  } catch (error) {
    console.error('[radar] falling back to mock dataset', error);
    const fallback = buildFallbackDataset([{ id: 'default', name: 'Turma' }]);
    return fallback;
  }
}

export default {
  fetchRadarData,
};
