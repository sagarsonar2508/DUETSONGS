/**
 * File System Access layer for the admin studio.
 *
 * The studio writes real files across the app folder: character art and
 * voices in public/characters/, song posters in public/posters/, the app
 * content config at public/content.json, and icon/splash sources in
 * assets/. The user picks the `app` folder once (picking the repo root
 * works too); the handle is persisted in IndexedDB so reconnecting after a
 * reload is one click (browsers require a fresh permission gesture, not a
 * fresh picker).
 *
 * Chromium-only, which is fine: this is a local dev tool, never shipped.
 */

/* Minimal typings — the FS Access API isn't in this tsconfig's DOM lib. */
export interface DirHandle {
  readonly name: string;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  removeEntry(name: string): Promise<void>;
  queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
}

interface FileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob | string): Promise<void>;
    close(): Promise<void>;
  }>;
}

export function fsAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/* ------------------------- handle persistence (IDB) ---------------------- */

const DB_NAME = 'animal-duet-admin';
const STORE = 'kv';
const KEY = 'appDir';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function kv<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function loadSavedDir(): Promise<DirHandle | null> {
  // IndexedDB can wedge in exotic environments (private mode, headless);
  // never let a stuck open block the studio from booting
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), 1500));
  try {
    const read = kv('readonly', (s) => s.get(KEY)).then(
      (v) => (v as DirHandle | undefined) ?? null,
    );
    const dir = await Promise.race([read, timeout]);
    // pre-app-folder versions of the studio saved the characters dir; the
    // FS API can't ascend to a parent, so ask for a fresh (one-time) pick
    if (dir && dir.name === 'characters') {
      await forgetDir();
      return null;
    }
    return dir;
  } catch {
    return null;
  }
}

export async function saveDir(handle: DirHandle): Promise<void> {
  try {
    await kv('readwrite', (s) => s.put(handle, KEY));
  } catch {
    /* non-fatal: reconnect will need the picker again */
  }
}

export async function forgetDir(): Promise<void> {
  try {
    await kv('readwrite', (s) => s.delete(KEY));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ picking ---------------------------------- */

/**
 * Accept a pick of the app folder or the repo root and normalize to the
 * app folder (the one containing public/ and src/).
 */
async function resolveAppDir(picked: DirHandle): Promise<DirHandle | null> {
  try {
    await picked.getDirectoryHandle('public');
    return picked; // it's the app folder itself
  } catch {
    /* keep looking */
  }
  try {
    const app = await picked.getDirectoryHandle('app');
    await app.getDirectoryHandle('public');
    return app; // repo root was picked
  } catch {
    return null;
  }
}

export async function pickAppDir(): Promise<DirHandle | null> {
  const picker = (
    window as unknown as { showDirectoryPicker?: (o?: unknown) => Promise<DirHandle> }
  ).showDirectoryPicker;
  if (!picker) return null;
  const picked = await picker.call(window, { id: 'animal-duet-app', mode: 'readwrite' });
  const dir = await resolveAppDir(picked);
  if (dir) await saveDir(dir);
  return dir;
}

/** Descend into (and optionally create) a nested directory path. */
export async function subdir(
  dir: DirHandle,
  parts: string[],
  create = false,
): Promise<DirHandle> {
  let d = dir;
  for (const p of parts) d = await d.getDirectoryHandle(p, { create });
  return d;
}

export async function permissionState(dir: DirHandle): Promise<PermissionState> {
  try {
    return await dir.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

/** Must be called from a user gesture. */
export async function requestPermission(dir: DirHandle): Promise<boolean> {
  try {
    return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/* ------------------------------ file ops --------------------------------- */

export async function writeFile(dir: DirHandle, name: string, data: Blob | string): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

export async function deleteFile(dir: DirHandle, name: string): Promise<boolean> {
  try {
    await dir.removeEntry(name);
    return true;
  } catch {
    return false; // didn't exist
  }
}

export async function readText(dir: DirHandle, name: string): Promise<string | null> {
  try {
    const fh = await dir.getFileHandle(name);
    return await (await fh.getFile()).text();
  } catch {
    return null;
  }
}

export async function readFileBlob(dir: DirHandle, name: string): Promise<File | null> {
  try {
    const fh = await dir.getFileHandle(name);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export async function fileExists(dir: DirHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}
