/**
 * Componente de drawer para histórico do diário
 * 
 * Funcionalidades:
 * - Exibe últimos 7 dias
 * - Resumo de presenças e atividades
 * - Navegação por datas
 */

import { useState, useEffect } from 'react';
import { type DiaryHistoryItem } from '@/services/diary';
import { formatDiaryDate } from '@/services/diary';

export interface DiaryHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DiaryHistoryItem[];
  isLoading: boolean;
  onDateSelect?: (date: string) => void;
  className?: string;
}

export default function DiaryHistoryDrawer({
  isOpen,
  onClose,
  history,
  isLoading,
  onDateSelect,
  className = '',
}: DiaryHistoryDrawerProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Ordenar histórico por data (mais recente primeiro)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-hidden ${className}`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Histórico do Diário
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Carregando histórico...</span>
              </div>
            ) : sortedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {sortedHistory.map((item) => (
                  <div
                    key={item.date}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDate === item.date
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleDateClick(item.date)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {formatDiaryDate(item.date)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {item.entriesCount} alunos
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">
                          {item.presentCount} presentes
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-700">
                          {item.absentCount} ausentes
                        </span>
                      </div>
                    </div>
                    
                    {item.hasActivities && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Com atividades</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Últimos 7 dias • Clique em uma data para navegar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
