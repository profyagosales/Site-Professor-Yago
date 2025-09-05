/**
 * Componente de debug para o cache
 *
 * Funcionalidades:
 * - Estatísticas do cache em tempo real
 * - Controles para limpeza
 * - Logs de operações
 * - Toggle de modo debug
 */

import { useState } from 'react';
import { useCacheManager, useCacheDebug } from '@/hooks/useCacheManager';

interface CacheDebugProps {
  className?: string;
}

export default function CacheDebug({ className = '' }: CacheDebugProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    stats,
    refreshStats,
    clearAllCache,
    clearExpiredCache,
    clearStaleCache,
    isDebugMode,
    setDebugMode,
  } = useCacheManager();

  const {
    isEnabled: isLogEnabled,
    logs,
    clearLogs,
    toggleDebug: toggleLogs,
  } = useCacheDebug();

  if (!isDebugMode) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setDebugMode(true)}
          className='bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700'
        >
          Debug Cache
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className='bg-white border border-gray-300 rounded-lg shadow-lg w-80 max-h-96 overflow-hidden'>
        {/* Header */}
        <div className='bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between'>
          <h3 className='font-semibold text-sm'>Cache Debug</h3>
          <div className='flex gap-2'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='text-xs text-gray-600 hover:text-gray-800'
            >
              {isOpen ? '▼' : '▲'}
            </button>
            <button
              onClick={() => setDebugMode(false)}
              className='text-xs text-gray-600 hover:text-gray-800'
            >
              ✕
            </button>
          </div>
        </div>

        {isOpen && (
          <div className='p-4 space-y-4'>
            {/* Stats */}
            <div>
              <h4 className='font-medium text-sm mb-2'>Estatísticas</h4>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                <div className='flex justify-between'>
                  <span>Total:</span>
                  <span className='font-mono'>{stats.total}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Fresco:</span>
                  <span className='font-mono text-green-600'>
                    {stats.fresh}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Stale:</span>
                  <span className='font-mono text-yellow-600'>
                    {stats.stale}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Expirado:</span>
                  <span className='font-mono text-red-600'>
                    {stats.expired}
                  </span>
                </div>
              </div>
              <button
                onClick={refreshStats}
                className='mt-2 text-xs text-blue-600 hover:text-blue-800'
              >
                Atualizar
              </button>
            </div>

            {/* Controls */}
            <div>
              <h4 className='font-medium text-sm mb-2'>Controles</h4>
              <div className='space-y-1'>
                <button
                  onClick={clearExpiredCache}
                  className='w-full text-left text-xs text-red-600 hover:text-red-800 py-1'
                >
                  Limpar Expirados
                </button>
                <button
                  onClick={clearStaleCache}
                  className='w-full text-left text-xs text-yellow-600 hover:text-yellow-800 py-1'
                >
                  Limpar Stale
                </button>
                <button
                  onClick={clearAllCache}
                  className='w-full text-left text-xs text-red-600 hover:text-red-800 py-1'
                >
                  Limpar Tudo
                </button>
              </div>
            </div>

            {/* Logs */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <h4 className='font-medium text-sm'>Logs</h4>
                <div className='flex gap-2'>
                  <button
                    onClick={toggleLogs}
                    className={`text-xs px-2 py-1 rounded ${
                      isLogEnabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isLogEnabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={clearLogs}
                    className='text-xs text-gray-600 hover:text-gray-800'
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className='bg-gray-50 rounded p-2 max-h-32 overflow-y-auto'>
                {logs.length === 0 ? (
                  <p className='text-xs text-gray-500'>Nenhum log</p>
                ) : (
                  <div className='space-y-1'>
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className='text-xs font-mono text-gray-700'
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
