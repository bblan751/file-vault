import { openDB, type IDBPDatabase } from 'idb';

export interface VaultDB {
  meta: {
    key: string;
    value: unknown;
  };
  'real-index': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
  'decoy-index': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
  'real-files': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
  'decoy-files': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
  'real-folders': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
  'decoy-folders': {
    key: string;
    value: { encrypted: ArrayBuffer; iv: string };
  };
}

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB('file-vault-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
      if (!db.objectStoreNames.contains('real-index')) {
        db.createObjectStore('real-index');
      }
      if (!db.objectStoreNames.contains('decoy-index')) {
        db.createObjectStore('decoy-index');
      }
      if (!db.objectStoreNames.contains('real-files')) {
        db.createObjectStore('real-files');
      }
      if (!db.objectStoreNames.contains('decoy-files')) {
        db.createObjectStore('decoy-files');
      }
      if (!db.objectStoreNames.contains('real-folders')) {
        db.createObjectStore('real-folders');
      }
      if (!db.objectStoreNames.contains('decoy-folders')) {
        db.createObjectStore('decoy-folders');
      }
    },
  });

  return dbInstance;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const stores = [
    'meta', 'real-index', 'decoy-index',
    'real-files', 'decoy-files', 'real-folders', 'decoy-folders'
  ] as const;
  for (const store of stores) {
    await db.clear(store);
  }
  localStorage.removeItem('vault-salt');
  localStorage.removeItem('vault-setup');
  localStorage.removeItem('vault-lockout');
}
