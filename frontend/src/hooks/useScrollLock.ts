import { useCallback, useRef } from 'react';

export function useScrollLock(defaultMs = 1500) {
  const lockRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLocked = useCallback(() => lockRef.current > 0, []);

  const lock = useCallback(
    (ms = defaultMs) => {
      lockRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lockRef.current = Math.max(0, lockRef.current - 1);
        timerRef.current = null;
      }, ms);
    },
    [defaultMs]
  );

  const forceUnlock = useCallback(() => {
    lockRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { isLocked, lock, forceUnlock };
}

export type ScrollLockControls = ReturnType<typeof useScrollLock>;
