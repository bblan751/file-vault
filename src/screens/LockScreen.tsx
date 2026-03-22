import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { PinInput } from '../components/PinInput';

interface LockScreenProps {
  onUnlock: (pin: string) => Promise<'real' | 'decoy' | false>;
}

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

const LOCKOUT_DURATIONS = [60_000, 300_000, 900_000, 3_600_000]; // 1m, 5m, 15m, 1h

function getLockoutState(): LockoutState {
  try {
    const stored = localStorage.getItem('vault-lockout');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { attempts: 0, lockedUntil: null };
}

function saveLockoutState(state: LockoutState) {
  localStorage.setItem('vault-lockout', JSON.stringify(state));
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState(getLockoutState);
  const [countdown, setCountdown] = useState('');

  const isLockedOut = lockout.lockedUntil !== null && Date.now() < lockout.lockedUntil;

  useEffect(() => {
    if (!lockout.lockedUntil) return;

    const update = () => {
      const remaining = lockout.lockedUntil! - Date.now();
      if (remaining <= 0) {
        setCountdown('');
        setLockout((prev) => ({ ...prev, lockedUntil: null }));
        return;
      }
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.floor((remaining % 60_000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockout.lockedUntil]);

  const handlePin = useCallback(async (pin: string) => {
    if (isLockedOut || loading) return;

    setLoading(true);
    try {
      const result = await onUnlock(pin);
      if (result) {
        // Reset lockout on success
        saveLockoutState({ attempts: 0, lockedUntil: null });
      } else {
        const newAttempts = lockout.attempts + 1;
        let lockedUntil: number | null = null;

        if (newAttempts >= 5) {
          const lockoutIndex = Math.min(
            Math.floor((newAttempts - 5) / 1),
            LOCKOUT_DURATIONS.length - 1
          );
          lockedUntil = Date.now() + LOCKOUT_DURATIONS[lockoutIndex];
        }

        const newState = { attempts: newAttempts, lockedUntil };
        saveLockoutState(newState);
        setLockout(newState);
        setError(true);
        setTimeout(() => setError(false), 700);
      }
    } finally {
      setLoading(false);
    }
  }, [onUnlock, isLockedOut, loading, lockout.attempts]);

  return (
    <div
      className="min-h-[100dvh] bg-[#0e0e0f] flex flex-col items-center justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overscrollBehavior: 'none',
      }}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1a1c] flex items-center justify-center mb-2">
          <Shield size={32} className="text-[#f5a623]" />
        </div>

        {isLockedOut ? (
          <div className="text-center">
            <p className="text-red-400 font-[Instrument_Sans] text-sm mb-2">
              Too many attempts
            </p>
            <p className="text-white font-[DM_Mono] text-2xl">{countdown}</p>
          </div>
        ) : (
          <>
            <PinInput
              onComplete={handlePin}
              error={error}
              disabled={loading}
              label="Enter PIN to unlock"
            />
            {lockout.attempts > 0 && lockout.attempts < 5 && (
              <p className="text-[#666] text-xs font-[Instrument_Sans]">
                {5 - lockout.attempts} attempt{5 - lockout.attempts !== 1 ? 's' : ''} remaining
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
