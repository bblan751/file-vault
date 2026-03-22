import { getDB } from './db';
import { encrypt, decrypt, encryptString, decryptString, ivToBase64, base64ToIv } from '../crypto/vault';

export interface FileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dateAdded: string;
  folderId: string | null;
  iv: string;
  isNote?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  dateCreated: string;
}

type VaultType = 'real' | 'decoy';

function indexStore(type: VaultType) {
  return type === 'real' ? 'real-index' : 'decoy-index';
}

function fileStore(type: VaultType) {
  return type === 'real' ? 'real-files' : 'decoy-files';
}

function folderStore(type: VaultType) {
  return type === 'real' ? 'real-folders' : 'decoy-folders';
}

// File Index Operations
export async function getFileIndex(key: CryptoKey, type: VaultType): Promise<FileMeta[]> {
  const db = await getDB();
  const record = await db.get(indexStore(type), 'index');
  if (!record) return [];
  try {
    const json = await decryptString(key, record.encrypted, base64ToIv(record.iv));
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function saveFileIndex(key: CryptoKey, type: VaultType, index: FileMeta[]): Promise<void> {
  const db = await getDB();
  const { encrypted, iv } = await encryptString(key, JSON.stringify(index));
  await db.put(indexStore(type), { encrypted, iv: ivToBase64(iv) }, 'index');
}

// File Operations
export async function storeFile(
  key: CryptoKey,
  type: VaultType,
  fileId: string,
  data: ArrayBuffer
): Promise<string> {
  const db = await getDB();
  const { encrypted, iv } = await encrypt(key, data);
  const ivStr = ivToBase64(iv);
  await db.put(fileStore(type), { encrypted, iv: ivStr }, fileId);
  return ivStr;
}

export async function getFile(
  key: CryptoKey,
  type: VaultType,
  fileId: string,
  iv: string
): Promise<ArrayBuffer> {
  const db = await getDB();
  const record = await db.get(fileStore(type), fileId);
  if (!record) throw new Error('File not found');
  return decrypt(key, record.encrypted, base64ToIv(iv));
}

export async function deleteFile(type: VaultType, fileId: string): Promise<void> {
  const db = await getDB();
  await db.delete(fileStore(type), fileId);
}

// Folder Operations
export async function getFolders(key: CryptoKey, type: VaultType): Promise<Folder[]> {
  const db = await getDB();
  const record = await db.get(folderStore(type), 'folders');
  if (!record) return [];
  try {
    const json = await decryptString(key, record.encrypted, base64ToIv(record.iv));
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function saveFolders(key: CryptoKey, type: VaultType, folders: Folder[]): Promise<void> {
  const db = await getDB();
  const { encrypted, iv } = await encryptString(key, JSON.stringify(folders));
  await db.put(folderStore(type), { encrypted, iv: ivToBase64(iv) }, 'folders');
}

// Canary Operations
export async function setCanary(key: CryptoKey, canaryKey: string): Promise<void> {
  const db = await getDB();
  const canaryText = 'file-vault-canary-valid';
  const { encrypted, iv } = await encryptString(key, canaryText);
  await db.put('meta', { encrypted, iv: ivToBase64(iv) }, canaryKey);
}

export async function checkCanary(key: CryptoKey, canaryKey: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get('meta', canaryKey);
  if (!record) return false;
  try {
    const text = await decryptString(key, record.encrypted, base64ToIv(record.iv));
    return text === 'file-vault-canary-valid';
  } catch {
    return false;
  }
}

// Clear a specific vault type
export async function clearVault(type: VaultType): Promise<void> {
  const db = await getDB();
  await db.clear(indexStore(type));
  await db.clear(fileStore(type));
  await db.clear(folderStore(type));
}

// Get storage size estimate for a vault type
export async function getVaultSize(type: VaultType): Promise<number> {
  const db = await getDB();
  let total = 0;
  const tx = db.transaction(fileStore(type), 'readonly');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const val = cursor.value as { encrypted: ArrayBuffer };
    total += val.encrypted.byteLength;
    cursor = await cursor.continue();
  }
  return total;
}
