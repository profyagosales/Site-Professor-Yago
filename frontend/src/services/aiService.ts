import api from './api';

export interface CorrectionSuggestionRequest {
  essayId: string;
  type?: string;
  themeText?: string;
  rawText?: string;
  currentScores?: Record<string, number>;
}

export interface CorrectionSuggestionResponse {
  mode: string;
  disclaimer: string;
  type: string;
  sections: {
    generalFeedback: string;
    competencies: Array<{
      id: string; label: string; strength: string; improvement: string; suggestedScore: number;
    }>;
    improvements: string[];
  };
  metadata: { generationMs: number; hash: string; rawTextChars: number };
}

export async function requestCorrectionSuggestion(payload: CorrectionSuggestionRequest): Promise<CorrectionSuggestionResponse> {
  const { data } = await api.post('/ai/correction-suggestion', payload);
  return data;
}

export async function applySuggestion(id: string, options: { applyFeedback?: boolean; applyScores?: boolean }): Promise<{ ok: boolean; updated: any }> {
  const { data } = await api.post(`/ai/suggestion/${id}/apply`, options);
  return data;
}
