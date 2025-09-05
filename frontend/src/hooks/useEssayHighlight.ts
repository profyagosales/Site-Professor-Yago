/**
 * Hook para gerenciar highlight de redações recém-criadas
 */

import { useState, useEffect, useCallback } from 'react';

export interface EssayHighlight {
  essayId: string;
  studentName: string;
  topic: string;
  timestamp: number;
}

const HIGHLIGHT_DURATION = 3000; // 3 segundos
const STORAGE_KEY = 'essay_highlights';

export function useEssayHighlight() {
  const [highlights, setHighlights] = useState<EssayHighlight[]>([]);

  // Carrega highlights do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as EssayHighlight[];
        setHighlights(parsed);
      }
    } catch (error) {
      console.warn('Failed to load essay highlights from localStorage', error);
    }
  }, []);

  // Salva highlights no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
    } catch (error) {
      console.warn('Failed to save essay highlights to localStorage', error);
    }
  }, [highlights]);

  // Adiciona um novo highlight
  const addHighlight = useCallback(
    (essayId: string, studentName: string, topic: string) => {
      const highlight: EssayHighlight = {
        essayId,
        studentName,
        topic,
        timestamp: Date.now(),
      };

      setHighlights(prev => [...prev, highlight]);

      // Remove o highlight após a duração especificada
      setTimeout(() => {
        setHighlights(prev => prev.filter(h => h.essayId !== essayId));
      }, HIGHLIGHT_DURATION);
    },
    []
  );

  // Remove um highlight específico
  const removeHighlight = useCallback((essayId: string) => {
    setHighlights(prev => prev.filter(h => h.essayId !== essayId));
  }, []);

  // Limpa todos os highlights
  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // Verifica se uma redação está destacada
  const isHighlighted = useCallback(
    (essayId: string) => {
      return highlights.some(h => h.essayId === essayId);
    },
    [highlights]
  );

  // Obtém informações do highlight de uma redação
  const getHighlight = useCallback(
    (essayId: string) => {
      return highlights.find(h => h.essayId === essayId);
    },
    [highlights]
  );

  // Limpa highlights expirados
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHighlights(prev =>
        prev.filter(h => now - h.timestamp < HIGHLIGHT_DURATION)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    highlights,
    addHighlight,
    removeHighlight,
    clearHighlights,
    isHighlighted,
    getHighlight,
  };
}
