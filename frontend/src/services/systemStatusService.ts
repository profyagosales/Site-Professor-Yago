import api from './api';

export interface SystemStatus {
  ok: boolean;
  timestamp: string;
  dbConnected: boolean;
  ai: { breaker: { open: boolean; failures: number; nextTry: number; retryInMs: number } | null; adoption: { total: number; applied: number; rate: number | null } };
  login?: {
    teacher: { success: number; unauthorized: number; unavailable: number; successRate?: number };
    student: { success: number; unauthorized: number; unavailable: number; successRate?: number };
  }
  cached?: boolean;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data } = await api.get('/health/system/status');
  return data;
}
