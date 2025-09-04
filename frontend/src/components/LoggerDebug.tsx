import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Componente para debug de logging (apenas em DEV)
 */
export function LoggerDebug() {
  const [isEnabled, setIsEnabled] = useState(logger.isLoggingEnabled());
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // Interceptar console para capturar logs
    const originalConsole = {
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    const captureLog = (level: string) => (message: string, ...args: any[]) => {
      originalConsole[level as keyof typeof originalConsole](message, ...args);
      
      if (isEnabled) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        setLogs(prev => [...prev.slice(-49), logEntry]); // Manter apenas os últimos 50 logs
      }
    };

    console.info = captureLog('info');
    console.warn = captureLog('warn');
    console.error = captureLog('error');

    return () => {
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [isEnabled]);

  const toggleLogging = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    logger.setEnabled(newEnabled);
    
    if (newEnabled) {
      localStorage.setItem('debug', '1');
    } else {
      localStorage.removeItem('debug');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testLogs = () => {
    logger.info('Test info log', { component: 'LoggerDebug', action: 'test' });
    logger.warn('Test warn log', { component: 'LoggerDebug', action: 'test' });
    logger.error('Test error log', { component: 'LoggerDebug', action: 'test' });
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Logger Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleLogging}
            className={`px-2 py-1 text-xs rounded ${
              isEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={testLogs}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
          >
            Test
          </button>
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        Status: {isEnabled ? 'Enabled' : 'Disabled'} | 
        Logs: {logs.length}
      </div>
      
      <div className="bg-gray-50 rounded p-2 max-h-48 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-400">No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1 text-gray-700">
              {log}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Toggle with localStorage.debug='1'
      </div>
    </div>
  );
}
