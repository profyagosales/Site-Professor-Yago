/**
 * Componente de debug para Web Vitals
 *
 * Funcionalidades:
 * - Exibe métricas de performance em tempo real
 * - Controles para alternar debug mode
 * - Relatórios de performance
 * - Marcadores de performance
 */

import { useState, useEffect } from 'react';
import { useVitalsDebug } from '@/hooks/useVitals';

interface VitalsDebugProps {
  className?: string;
}

export default function VitalsDebug({ className = '' }: VitalsDebugProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const {
    getMetrics,
    showMetricsTable,
    showPerformanceReport,
    getMarks,
    clearMarks,
    getBrowserInfo,
    toggleDebug,
  } = useVitalsDebug();

  // Verifica se debug está habilitado
  useEffect(() => {
    try {
      const debug = localStorage.getItem('debug') === '1';
      setIsDebugEnabled(debug);
    } catch {
      setIsDebugEnabled(false);
    }
  }, []);

  // Só mostra o componente se debug estiver habilitado
  if (!isDebugEnabled) {
    return (
      <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
        <button
          onClick={() => {
            toggleDebug();
            setIsDebugEnabled(true);
          }}
          className='bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700'
        >
          Debug Vitals
        </button>
      </div>
    );
  }

  const metrics = getMetrics();
  const marks = getMarks();
  const browserInfo = getBrowserInfo();

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <div className='bg-white border border-gray-300 rounded-lg shadow-lg w-80 max-h-96 overflow-hidden'>
        {/* Header */}
        <div className='bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between'>
          <h3 className='font-semibold text-sm'>Web Vitals Debug</h3>
          <div className='flex gap-2'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='text-xs text-gray-600 hover:text-gray-800'
            >
              {isOpen ? '▼' : '▲'}
            </button>
            <button
              onClick={() => {
                toggleDebug();
                setIsDebugEnabled(false);
              }}
              className='text-xs text-gray-600 hover:text-gray-800'
            >
              ✕
            </button>
          </div>
        </div>

        {isOpen && (
          <div className='p-4 space-y-4'>
            {/* Core Web Vitals */}
            <div>
              <h4 className='font-medium text-sm mb-2'>Core Web Vitals</h4>
              <div className='grid grid-cols-1 gap-2 text-xs'>
                {metrics.lcp !== undefined && (
                  <div className='flex justify-between'>
                    <span>LCP:</span>
                    <span className='font-mono'>{metrics.lcp}ms</span>
                  </div>
                )}
                {metrics.fid !== undefined && (
                  <div className='flex justify-between'>
                    <span>FID:</span>
                    <span className='font-mono'>{metrics.fid}ms</span>
                  </div>
                )}
                {metrics.cls !== undefined && (
                  <div className='flex justify-between'>
                    <span>CLS:</span>
                    <span className='font-mono'>{metrics.cls.toFixed(4)}</span>
                  </div>
                )}
                {metrics.fcp !== undefined && (
                  <div className='flex justify-between'>
                    <span>FCP:</span>
                    <span className='font-mono'>{metrics.fcp}ms</span>
                  </div>
                )}
                {metrics.ttfb !== undefined && (
                  <div className='flex justify-between'>
                    <span>TTFB:</span>
                    <span className='font-mono'>{metrics.ttfb}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Marks */}
            {marks.length > 0 && (
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-medium text-sm'>Performance Marks</h4>
                  <button
                    onClick={clearMarks}
                    className='text-xs text-gray-600 hover:text-gray-800'
                  >
                    Limpar
                  </button>
                </div>
                <div className='max-h-32 overflow-y-auto'>
                  <div className='space-y-1'>
                    {marks.slice(-10).map((mark, index) => (
                      <div
                        key={index}
                        className='text-xs font-mono text-gray-700'
                      >
                        <div className='font-semibold'>{mark.name}</div>
                        {mark.duration && (
                          <div className='text-gray-500'>
                            {mark.duration.toFixed(2)}ms
                          </div>
                        )}
                        {mark.detail && (
                          <div className='text-gray-500 text-xs'>
                            {JSON.stringify(mark.detail)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Browser Info */}
            {browserInfo && (
              <div>
                <h4 className='font-medium text-sm mb-2'>
                  Browser Performance
                </h4>
                <div className='text-xs space-y-1'>
                  {browserInfo.navigation && (
                    <div>
                      <div className='font-semibold'>Navigation:</div>
                      <div className='ml-2 text-gray-600'>
                        DOM Content Loaded:{' '}
                        {browserInfo.navigation.domContentLoaded?.toFixed(2)}ms
                      </div>
                      <div className='ml-2 text-gray-600'>
                        Load Complete:{' '}
                        {browserInfo.navigation.loadComplete?.toFixed(2)}ms
                      </div>
                    </div>
                  )}
                  {browserInfo.paint && (
                    <div>
                      <div className='font-semibold'>Paint:</div>
                      <div className='ml-2 text-gray-600'>
                        First Paint: {browserInfo.paint.firstPaint?.toFixed(2)}
                        ms
                      </div>
                      <div className='ml-2 text-gray-600'>
                        First Contentful Paint:{' '}
                        {browserInfo.paint.firstContentfulPaint?.toFixed(2)}ms
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className='space-y-2'>
              <button
                onClick={showMetricsTable}
                className='w-full text-left text-xs text-blue-600 hover:text-blue-800 py-1'
              >
                Exibir Tabela no Console
              </button>
              <button
                onClick={showPerformanceReport}
                className='w-full text-left text-xs text-blue-600 hover:text-blue-800 py-1'
              >
                Relatório Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
