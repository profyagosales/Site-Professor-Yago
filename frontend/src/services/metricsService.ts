import api from './api';

export interface MetricsSummary {
  generatedAt: string;
  totals: { students: number; classes: number; themes: number };
  essays: {
    byStatus: { PENDING: number; GRADING: number; GRADED: number; SENT: number };
    total: number;
    last7d: { created: { day: string; count: number }[]; graded: { day: string; count: number }[] };
  };
  ai: {
    suggestionsTotal: number;
    suggestions7d: { day: string; count: number }[];
    appliedTotal: number;
    applied7d: { day: string; count: number }[];
    adoptionRate: number | null;
  };
  performance: { 
    avgCorrectionTimeHours: number | null; 
    medianCorrectionTimeHours: number | null;
    aiGenerationMs: { avg: number | null; p50: number | null; p95: number | null }
  };
  queue: { pendingAgingHours: number | null; gradingInProgress: number };
  ratios: { correctionRate7d: number | null; pendingToGraded: number | null };
  login?: {
    teacher: { success: number; unauthorized: number; unavailable: number; total: number; successRate: number | null; unauthorizedRate: number | null; unavailableRate: number | null };
    student: { success: number; unauthorized: number; unavailable: number; total: number; successRate: number | null; unauthorizedRate: number | null; unavailableRate: number | null };
  }
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const { data } = await api.get('/metrics/summary');
  return data;
}
