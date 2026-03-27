import { useState, useEffect, useCallback } from 'react';
import { Onboarding } from './screens/Onboarding';
import { LockScreen } from './screens/LockScreen';
import { VaultScreen } from './screens/VaultScreen';
import { useVault } from './hooks/useVault';
import { useLock } from './hooks/useLock';

type AppState = 'loading' | 'onboarding' | 'locked' | 'unlocked';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const vault = useVault();

  useEffect(() => {
    const isSetup = localStorage.getItem('vault-setup') === 'true';
    setAppState(isSetup ? 'locked' : 'onboarding');
  }, []);

  const handleLock = useCallback(() => {
    vault.lock();
    setAppState('locked');
  }, [vault]);

  const autoLockSetting = (localStorage.getItem('vault-autolock') || 'background') as
    'background' | '1min' | '5min' | '15min' | '30min';

  useLock(appState === 'unlocked', handleLock, autoLockSetting);

  const handleOnboardingComplete = async (realPin: string, decoyPin: string) => {
    await vault.setupVault(realPin, decoyPin);
    setTimeout(() => setAppState('locked'), 1500);
  };

  const handleUnlock = async (pin: string): Promise<'real' | 'decoy' | false> => {
    const result = await vault.unlock(pin);
    if (result) {
      setAppState('unlocked');
    }
    return result;
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-[#0e0e0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#f5a623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (appState === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (appState === 'locked') {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <VaultScreen
      state={vault.state}
      onLock={handleLock}
      addFile={vault.addFile}
      addNote={vault.addNote}
      updateNote={vault.updateNote}
      readFile={vault.readFile}
      removeFile={vault.removeFile}
      renameFile={vault.renameFile}
      moveFile={vault.moveFile}
      createFolder={vault.createFolder}
      renameFolder={vault.renameFolder}
      deleteFolder={vault.deleteFolder}
      exportBackup={vault.exportBackup}
      importBackup={vault.importBackup}
      refreshFiles={vault.refreshFiles}
    />
  );
}
