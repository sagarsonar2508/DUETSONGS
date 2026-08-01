/**
 * "Play your own song" — user-imported charts.
 *
 * The user picks an audio file from their device; it is transcribed to a
 * note chart entirely on-device (see core/transcribe.ts) and the ORIGINAL
 * AUDIO IS DISCARDED — only the chart (a SongDef like any built-in song)
 * is kept, in IndexedDB. Nothing is uploaded anywhere and no copyrighted
 * audio is stored or played back: gameplay output is 100% the game's own
 * character voices and backing synth.
 *
 * This module is deliberately light (IndexedDB + registry glue) so it can
 * load at boot; the transcription stack (TensorFlow.js + basic-pitch) is
 * dynamically imported only when the user actually imports a song.
 */

import { registerSongs, unregisterSong, type SongDef } from '../data/songs';

export const MAX_USER_SONGS = 20;
/** imports longer than this are truncated (memory + attention span) */
export const MAX_SONG_MINUTES = 5;

export interface UserSongRecord extends SongDef {
  createdAt: number;
}

const DB_NAME = 'duet-stars-user-songs';
const STORE = 'songs';

const registry = new Map<string, UserSongRecord>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
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

/** Load saved user songs into the song library at boot. */
export async function initUserSongs(): Promise<void> {
  try {
    const all = await tx<UserSongRecord[]>('readonly', (s) => s.getAll());
    all.sort((a, b) => a.createdAt - b.createdAt);
    for (const rec of all) registry.set(rec.id, rec);
    registerSongs(all);
  } catch {
    /* IndexedDB unavailable (private mode) — feature simply hidden */
  }
}

export function listUserSongs(): UserSongRecord[] {
  return [...registry.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function isUserSong(id: string): boolean {
  return registry.has(id);
}

export async function addUserSong(rec: UserSongRecord): Promise<void> {
  await tx('readwrite', (s) => s.put(rec));
  registry.set(rec.id, rec);
  registerSongs([rec]);
}

export async function deleteUserSong(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  registry.delete(id);
  unregisterSong(id);
}
