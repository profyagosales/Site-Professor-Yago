import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  lastOnline: Date | null;
  retryCount: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: (navigator as any).connection?.effectiveType || null,
    lastOnline: navigator.onLine ? new Date() : null,
    retryCount: 0,
  }));

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Tentar fazer uma requisição HEAD para verificar conectividade
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    const isConnected = await checkConnection();

    setStatus(prev => ({
      ...prev,
      isOnline: isConnected,
      retryCount: prev.retryCount + 1,
      lastOnline: isConnected ? new Date() : prev.lastOnline,
    }));

    return isConnected;
  }, [checkConnection]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        retryCount: 0,
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
      }));
    };

    const handleConnectionChange = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setStatus(prev => ({
          ...prev,
          connectionType: connection.effectiveType,
          isSlowConnection:
            connection.effectiveType === 'slow-2g' ||
            connection.effectiveType === '2g',
        }));
      }
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener(
        'change',
        handleConnectionChange
      );
    }

    // Verificação inicial
    checkConnection().then(isConnected => {
      setStatus(prev => ({
        ...prev,
        isOnline: isConnected,
        lastOnline: isConnected ? new Date() : prev.lastOnline,
      }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener(
          'change',
          handleConnectionChange
        );
      }
    };
  }, [checkConnection]);

  return {
    ...status,
    retryConnection,
    checkConnection,
  };
}
