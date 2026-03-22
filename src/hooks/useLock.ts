import { useEffect, useRef, useCallback } from 'react';

type AutoLockSetting = 'background' | '1min' | '5min' | '15min' | '30min';

export function useLock(
  isUnlocked: boolean,
  onLock: () => void,
  autoLockSetting: AutoLockSetting = 'background'
) {
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (autoLockSetting === 'background') {
          onLock();
        } else {
          const delays: Record<string, number> = {
            '1min': 60_000,
            '5min': 300_000,
            '15min': 900_000,
            '30min': 1_800_000,
          };
          const delay = delays[autoLockSetting];
          if (delay) {
            clearTimer();
            timerRef.current = window.setTimeout(onLock, delay);
          }
        }
      } else {
        // Came back to foreground - clear any pending lock timer
        if (autoLockSetting !== 'background') {
          clearTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', onLock);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', onLock);
      clearTimer();
    };
  }, [isUnlocked, onLock, autoLockSetting, clearTimer]);
}
