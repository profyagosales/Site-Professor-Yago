/**
 * Componente de debug para informações da sessão
 * 
 * Mostra informações detalhadas sobre o estado da sessão
 * Apenas visível em desenvolvimento ou com localStorage.debug='1'
 */

import React, { useState, useEffect } from 'react';
import { getSessionInfo } from '@/services/session';
import { useSession } from '@/hooks/useSession';

interface SessionDebugProps {
  className?: string;
}

export default function SessionDebug({ className = '' }: SessionDebugProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const { updateActivity, logout, sync } = useSession();

  // Só mostra em desenvolvimento ou com debug ativado
  const shouldShow = typeof window !== 'undefined' && (
    import.meta.env.DEV || 
    localStorage.getItem('debug') === '1'
  );

  useEffect(() => {
    if (!shouldShow) return;

    const interval = setInterval(() => {
      setSessionInfo(getSessionInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const formatTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors"
      >
        Session Debug
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs font-mono">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Has Session:</span>
              <span className={sessionInfo.hasSession ? 'text-green-400' : 'text-red-400'}>
                {sessionInfo.hasSession ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Valid:</span>
              <span className={sessionInfo.isValid ? 'text-green-400' : 'text-red-400'}>
                {sessionInfo.isValid ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Role:</span>
              <span className="text-blue-400">{sessionInfo.role || 'None'}</span>
            </div>

            <div className="flex justify-between">
              <span>Issued:</span>
              <span className="text-gray-300">
                {sessionInfo.issuedAt ? new Date(sessionInfo.issuedAt).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Last Activity:</span>
              <span className="text-gray-300">
                {sessionInfo.lastActivity ? new Date(sessionInfo.lastActivity).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Time Until Expiry:</span>
              <span className="text-yellow-400">
                {formatTime(sessionInfo.timeUntilExpiry)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Time Until Idle:</span>
              <span className="text-orange-400">
                {formatTime(sessionInfo.timeUntilIdle)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-700 space-y-1">
              <button
                onClick={updateActivity}
                className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
              >
                Update Activity
              </button>
              <button
                onClick={sync}
                className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
              >
                Sync
              </button>
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


 * Componente de debug para informações da sessão
 * 
 * Mostra informações detalhadas sobre o estado da sessão
 * Apenas visível em desenvolvimento ou com localStorage.debug='1'
 */

import React, { useState, useEffect } from 'react';
import { getSessionInfo } from '@/services/session';
import { useSession } from '@/hooks/useSession';

interface SessionDebugProps {
  className?: string;
}

export default function SessionDebug({ className = '' }: SessionDebugProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const { updateActivity, logout, sync } = useSession();

  // Só mostra em desenvolvimento ou com debug ativado
  const shouldShow = typeof window !== 'undefined' && (
    import.meta.env.DEV || 
    localStorage.getItem('debug') === '1'
  );

  useEffect(() => {
    if (!shouldShow) return;

    const interval = setInterval(() => {
      setSessionInfo(getSessionInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const formatTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors"
      >
        Session Debug
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs font-mono">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Has Session:</span>
              <span className={sessionInfo.hasSession ? 'text-green-400' : 'text-red-400'}>
                {sessionInfo.hasSession ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Valid:</span>
              <span className={sessionInfo.isValid ? 'text-green-400' : 'text-red-400'}>
                {sessionInfo.isValid ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Role:</span>
              <span className="text-blue-400">{sessionInfo.role || 'None'}</span>
            </div>

            <div className="flex justify-between">
              <span>Issued:</span>
              <span className="text-gray-300">
                {sessionInfo.issuedAt ? new Date(sessionInfo.issuedAt).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Last Activity:</span>
              <span className="text-gray-300">
                {sessionInfo.lastActivity ? new Date(sessionInfo.lastActivity).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Time Until Expiry:</span>
              <span className="text-yellow-400">
                {formatTime(sessionInfo.timeUntilExpiry)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Time Until Idle:</span>
              <span className="text-orange-400">
                {formatTime(sessionInfo.timeUntilIdle)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-700 space-y-1">
              <button
                onClick={updateActivity}
                className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
              >
                Update Activity
              </button>
              <button
                onClick={sync}
                className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
              >
                Sync
              </button>
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


