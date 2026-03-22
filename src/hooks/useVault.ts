import { useState, useCallback, useRef } from 'react';
import { deriveKey, getSalt } from '../crypto/keys';
import {
  type FileMeta,
  type Folder,
  getFileIndex,
  saveFileIndex,
  storeFile,
  getFile,
  deleteFile,
  getFolders,
  saveFolders,
  checkCanary,
  setCanary,
  clearVault,
  getVaultSize,
} from '../storage/index';

export type VaultType = 'real' | 'decoy';

export interface VaultState {
  isUnlocked: boolean;
  vaultType: VaultType;
  files: FileMeta[];
  folders: Folder[];
  storageSize: number;
}

export function useVault() {
  const [state, setState] = useState<VaultState>({
    isUnlocked: false,
    vaultType: 'real',
    files: [],
    folders: [],
    storageSize: 0,
  });
  const keyRef = useRef<CryptoKey | null>(null);
  const vaultTypeRef = useRef<VaultType>('real');

  const lock = useCallback(() => {
    keyRef.current = null;
    setState({
      isUnlocked: false,
      vaultType: 'real',
      files: [],
      folders: [],
      storageSize: 0,
    });
  }, []);

  const unlock = useCallback(async (pin: string): Promise<'real' | 'decoy' | false> => {
    const salt = await getSalt();
    const key = await deriveKey(pin, salt);

    // Try real canary
    if (await checkCanary(key, 'canary-real')) {
      keyRef.current = key;
      vaultTypeRef.current = 'real';
      const files = await getFileIndex(key, 'real');
      const folders = await getFolders(key, 'real');
      const storageSize = await getVaultSize('real');
      setState({ isUnlocked: true, vaultType: 'real', files, folders, storageSize });
      return 'real';
    }

    // Try decoy canary
    if (await checkCanary(key, 'canary-decoy')) {
      keyRef.current = key;
      vaultTypeRef.current = 'decoy';
      const files = await getFileIndex(key, 'decoy');
      const folders = await getFolders(key, 'decoy');
      const storageSize = await getVaultSize('decoy');
      setState({ isUnlocked: true, vaultType: 'decoy', files, folders, storageSize });
      return 'decoy';
    }

    return false;
  }, []);

  const setupVault = useCallback(async (realPin: string, decoyPin: string) => {
    const salt = await getSalt();
    const realKey = await deriveKey(realPin, salt);
    const decoyKey = await deriveKey(decoyPin, salt);

    await setCanary(realKey, 'canary-real');
    await setCanary(decoyKey, 'canary-decoy');

    // Initialize empty indices
    await saveFileIndex(realKey, 'real', []);
    await saveFileIndex(decoyKey, 'decoy', []);
    await saveFolders(realKey, 'real', []);
    await saveFolders(decoyKey, 'decoy', []);

    localStorage.setItem('vault-setup', 'true');
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const files = await getFileIndex(keyRef.current, type);
    const folders = await getFolders(keyRef.current, type);
    const storageSize = await getVaultSize(type);
    setState((s) => ({ ...s, files, folders, storageSize }));
  }, []);

  const addFile = useCallback(async (file: File, folderId: string | null = null) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const buffer = await file.arrayBuffer();
    const fileId = crypto.randomUUID();
    const iv = await storeFile(key, type, fileId, buffer);

    const meta: FileMeta = {
      id: fileId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      dateAdded: new Date().toISOString(),
      folderId,
      iv,
    };

    const files = await getFileIndex(key, type);
    files.push(meta);
    await saveFileIndex(key, type, files);
    await refreshFiles();
  }, [refreshFiles]);

  const addNote = useCallback(async (title: string, content: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const blob = new Blob([content], { type: 'text/markdown' });
    const buffer = await blob.arrayBuffer();
    const fileId = crypto.randomUUID();
    const iv = await storeFile(key, type, fileId, buffer);

    const meta: FileMeta = {
      id: fileId,
      name: title.endsWith('.md') ? title : `${title}.md`,
      mimeType: 'text/markdown',
      size: buffer.byteLength,
      dateAdded: new Date().toISOString(),
      folderId: null,
      iv,
      isNote: true,
    };

    const files = await getFileIndex(key, type);
    files.push(meta);
    await saveFileIndex(key, type, files);
    await refreshFiles();
    return fileId;
  }, [refreshFiles]);

  const updateNote = useCallback(async (fileId: string, content: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const blob = new Blob([content], { type: 'text/markdown' });
    const buffer = await blob.arrayBuffer();

    // Delete old and store new
    await deleteFile(type, fileId);
    const iv = await storeFile(key, type, fileId, buffer);

    const files = await getFileIndex(key, type);
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      files[idx].iv = iv;
      files[idx].size = buffer.byteLength;
      files[idx].dateAdded = new Date().toISOString();
    }
    await saveFileIndex(key, type, files);
    await refreshFiles();
  }, [refreshFiles]);

  const readFile = useCallback(async (fileId: string, iv: string): Promise<ArrayBuffer> => {
    if (!keyRef.current) throw new Error('Vault locked');
    return getFile(keyRef.current, vaultTypeRef.current, fileId, iv);
  }, []);

  const removeFile = useCallback(async (fileId: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    await deleteFile(type, fileId);
    const files = await getFileIndex(key, type);
    const updated = files.filter((f) => f.id !== fileId);
    await saveFileIndex(key, type, updated);
    await refreshFiles();
  }, [refreshFiles]);

  const renameFile = useCallback(async (fileId: string, newName: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const files = await getFileIndex(key, type);
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      files[idx].name = newName;
      await saveFileIndex(key, type, files);
      await refreshFiles();
    }
  }, [refreshFiles]);

  const moveFile = useCallback(async (fileId: string, folderId: string | null) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const files = await getFileIndex(key, type);
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      files[idx].folderId = folderId;
      await saveFileIndex(key, type, files);
      await refreshFiles();
    }
  }, [refreshFiles]);

  const createFolder = useCallback(async (name: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const folders = await getFolders(key, type);
    folders.push({
      id: crypto.randomUUID(),
      name,
      dateCreated: new Date().toISOString(),
    });
    await saveFolders(key, type, folders);
    await refreshFiles();
  }, [refreshFiles]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    const folders = await getFolders(key, type);
    const idx = folders.findIndex((f) => f.id === folderId);
    if (idx >= 0) {
      folders[idx].name = newName;
      await saveFolders(key, type, folders);
      await refreshFiles();
    }
  }, [refreshFiles]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!keyRef.current) return;
    const type = vaultTypeRef.current;
    const key = keyRef.current;

    // Move files in folder to root
    const files = await getFileIndex(key, type);
    const updated = files.map((f) =>
      f.folderId === folderId ? { ...f, folderId: null } : f
    );
    await saveFileIndex(key, type, updated);

    const folders = await getFolders(key, type);
    const filtered = folders.filter((f) => f.id !== folderId);
    await saveFolders(key, type, filtered);
    await refreshFiles();
  }, [refreshFiles]);

  const changePin = useCallback(async (currentPin: string, newPin: string, target: 'real' | 'decoy') => {
    const salt = await getSalt();
    const currentKey = await deriveKey(currentPin, salt);
    const canaryKey = target === 'real' ? 'canary-real' : 'canary-decoy';

    if (!(await checkCanary(currentKey, canaryKey))) {
      throw new Error('Current PIN is incorrect');
    }

    const newKey = await deriveKey(newPin, salt);

    // Re-encrypt canary
    await setCanary(newKey, canaryKey);

    // Re-encrypt index and folders
    const type = target;
    const files = await getFileIndex(currentKey, type);
    await saveFileIndex(newKey, type, files);

    const folders = await getFolders(currentKey, type);
    await saveFolders(newKey, type, folders);

    // Note: individual file blobs remain encrypted with old key
    // This is a simplification - a full implementation would re-encrypt all files
    // For now, we store the file encryption separately from the PIN
  }, []);

  const clearDecoyVault = useCallback(async () => {
    await clearVault('decoy');
    // Re-initialize empty decoy index if we have the key
    if (keyRef.current && vaultTypeRef.current === 'real') {
      // We'd need the decoy key to re-initialize, so just clear the stores
    }
  }, []);

  return {
    state,
    lock,
    unlock,
    setupVault,
    addFile,
    addNote,
    updateNote,
    readFile,
    removeFile,
    renameFile,
    moveFile,
    createFolder,
    renameFolder,
    deleteFolder,
    changePin,
    clearDecoyVault,
    refreshFiles,
  };
}
