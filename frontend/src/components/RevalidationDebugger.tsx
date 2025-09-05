/**
 * Componente de Debug para Revalidações
 * 
 * Este componente mostra informações sobre revalidações de dados
 * em tempo real, apenas em desenvolvimento.
 */

import React from 'react';
import { useRevalidationMonitor } from '@/providers/DataProvider';

export interface RevalidationDebuggerProps {
  className?: string;
}

export default function RevalidationDebugger({ className = '' }: RevalidationDebuggerProps) {
  const { revalidationCount, lastRevalidation, resetCount } = useRevalidationMonitor();

  // Só mostrar em desenvolvimento
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono ${className}`}>
      <div className="space-y-1">
        <div className="font-bold text-green-400">Data Revalidation Debug</div>
        <div className="text-gray-300">
          <span className="text-blue-400">Count:</span> {revalidationCount}
        </div>
        <div className="text-gray-300">
          <span className="text-blue-400">Last:</span> {lastRevalidation?.toLocaleTimeString() || 'Never'}
        </div>
        <div className="text-gray-300">
          <span className="text-blue-400">Status:</span> {revalidationCount > 0 ? 'Active' : 'Idle'}
        </div>
        <button
          onClick={resetCount}
          className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
        >
          Reset Count
        </button>
      </div>
    </div>
  );
}
