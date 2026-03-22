import { useState } from 'react';
import { Shield, ArrowRight, Check } from 'lucide-react';
import { PinInput } from '../components/PinInput';

interface OnboardingProps {
  onComplete: (realPin: string, decoyPin: string) => Promise<void>;
}

type Step = 'welcome' | 'real-pin' | 'real-confirm' | 'decoy-pin' | 'decoy-confirm' | 'ready';

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [realPin, setRealPin] = useState('');
  const [decoyPin, setDecoyPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRealPin = (pin: string) => {
    setRealPin(pin);
    setStep('real-confirm');
  };

  const handleRealConfirm = (pin: string) => {
    if (pin === realPin) {
      setError(false);
      setStep('decoy-pin');
    } else {
      setError(true);
      setTimeout(() => setError(false), 700);
    }
  };

  const handleDecoyPin = (pin: string) => {
    if (pin === realPin) {
      setError(true);
      setTimeout(() => setError(false), 700);
      return;
    }
    setDecoyPin(pin);
    setStep('decoy-confirm');
  };

  const handleDecoyConfirm = async (pin: string) => {
    if (pin === decoyPin) {
      setError(false);
      setLoading(true);
      setStep('ready');
      await onComplete(realPin, decoyPin);
      setLoading(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 700);
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#0e0e0f] flex flex-col items-center justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {step === 'welcome' && (
        <div className="flex flex-col items-center text-center gap-8 animate-fadeIn">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a1c] flex items-center justify-center">
            <Shield size={40} className="text-[#f5a623]" />
          </div>
          <div>
            <h1 className="text-white text-3xl font-[Instrument_Sans] font-bold mb-3">
              File Vault
            </h1>
            <p className="text-[#888] font-[Instrument_Sans] text-sm leading-relaxed max-w-[280px]">
              Your files. Encrypted. Only on this device.
            </p>
          </div>
          <button
            onClick={() => setStep('real-pin')}
            className="flex items-center gap-2 bg-[#f5a623] text-black px-8 py-4 rounded-2xl
              font-[Instrument_Sans] font-semibold text-base min-h-[52px] active:opacity-80"
          >
            Get Started
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 'real-pin' && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <div className="text-center mb-4">
            <h2 className="text-white text-xl font-[Instrument_Sans] font-semibold mb-2">
              Set Your PIN
            </h2>
            <p className="text-[#888] text-sm font-[Instrument_Sans]">
              Choose a 6-digit PIN to protect your vault
            </p>
          </div>
          <PinInput onComplete={handleRealPin} />
        </div>
      )}

      {step === 'real-confirm' && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <div className="text-center mb-4">
            <h2 className="text-white text-xl font-[Instrument_Sans] font-semibold mb-2">
              Confirm PIN
            </h2>
            <p className="text-[#888] text-sm font-[Instrument_Sans]">
              Enter your PIN again to confirm
            </p>
          </div>
          <PinInput onComplete={handleRealConfirm} error={error} />
        </div>
      )}

      {step === 'decoy-pin' && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <div className="text-center mb-4 max-w-[300px]">
            <h2 className="text-white text-xl font-[Instrument_Sans] font-semibold mb-2">
              Set Decoy PIN
            </h2>
            <p className="text-[#888] text-sm font-[Instrument_Sans] leading-relaxed">
              If someone forces you to open your vault, enter this PIN instead.
              They'll see an empty vault with no trace of your real files.
            </p>
          </div>
          <PinInput onComplete={handleDecoyPin} error={error} />
          {error && (
            <p className="text-red-400 text-xs font-[Instrument_Sans]">
              Decoy PIN must be different from your real PIN
            </p>
          )}
        </div>
      )}

      {step === 'decoy-confirm' && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <div className="text-center mb-4">
            <h2 className="text-white text-xl font-[Instrument_Sans] font-semibold mb-2">
              Confirm Decoy PIN
            </h2>
            <p className="text-[#888] text-sm font-[Instrument_Sans]">
              Enter your decoy PIN again to confirm
            </p>
          </div>
          <PinInput onComplete={handleDecoyConfirm} error={error} />
        </div>
      )}

      {step === 'ready' && (
        <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-[#1a2a1a] flex items-center justify-center animate-scaleIn">
            <Check size={40} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-[Instrument_Sans] font-semibold mb-2">
              Vault Ready
            </h2>
            <p className="text-[#888] text-sm font-[Instrument_Sans]">
              {loading ? 'Setting up encryption...' : 'Your vault is ready to use'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
