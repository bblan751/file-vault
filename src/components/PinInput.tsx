import { useState, useEffect, useCallback, useRef } from 'react';
import { Delete } from 'lucide-react';

interface PinInputProps {
  onComplete: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
  label?: string;
}

export function PinInput({ onComplete, error, disabled, label }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => {
        setShake(false);
        setDigits([]);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  const addDigit = useCallback((d: string) => {
    if (disabled) return;
    setDigits((prev) => {
      if (prev.length >= 6) return prev;
      const next = [...prev, d];
      if (next.length === 6) {
        setTimeout(() => onComplete(next.join('')), 100);
      }
      return next;
    });
  }, [onComplete, disabled]);

  const removeDigit = useCallback(() => {
    if (disabled) return;
    setDigits((prev) => prev.slice(0, -1));
  }, [disabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        removeDigit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addDigit, removeDigit, disabled]);

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-8">
      {label && (
        <p className="text-[#a0a0a5] text-sm font-[Instrument_Sans]">{label}</p>
      )}

      {/* PIN Dots */}
      <div
        className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < digits.length
                ? 'bg-[#f5a623] shadow-[0_0_8px_#f5a623]'
                : 'bg-[#333] border border-[#555]'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-4 w-[280px]">
        {numpadKeys.map((key, i) => {
          if (key === '') {
            return <div key={i} />;
          }
          if (key === 'del') {
            return (
              <button
                key={i}
                onClick={removeDigit}
                disabled={disabled}
                className="h-[60px] flex items-center justify-center text-[#a0a0a5] active:text-white transition-colors"
                aria-label="Delete"
              >
                <Delete size={24} />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => addDigit(key)}
              disabled={disabled}
              className="h-[60px] rounded-full text-white text-2xl font-[DM_Mono] font-medium
                bg-[#1a1a1c] active:bg-[#333] transition-colors select-none"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
