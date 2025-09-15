import api from './api';

export interface MetricsSummary {
  generatedAt: string;
  totals: { students: number; classes: number; themes: number };
  essays: {
    byStatus: { PENDING: number; GRADING: number; GRADED: number; SENT: number };
    total: number;
    last7d: { created: { day: string; count: number }[]; graded: { day: string; count: number }[] };
  };
  performance: { avgCorrectionTimeHours: number | null; medianCorrectionTimeHours: number | null };
  queue: { pendingAgingHours: number | null; gradingInProgress: number };
  ratios: { correctionRate7d: number | null; pendingToGraded: number | null };
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const { data } = await api.get('/metrics/summary');
  return data;
}
