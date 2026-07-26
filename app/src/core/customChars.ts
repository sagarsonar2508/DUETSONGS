/**
 * Custom characters — the premium "star your own pet" feature.
 *
 * Users add a photo + a short voice recording; the game pitch-shifts their
 * real sound to sing the melody. Everything lives on-device in IndexedDB
 * (image blob + raw PCM), nothing ever leaves the phone.
 *
 * Restrictions enforced at creation time (see creator UI):
 *   voice — ≤ 1.5 s used, silence-trimmed, peak-normalized, pitch-detected
 *   image — raster only (no SVG), ≤ 10 MB in, normalized 512px sprite out
 */

import { audio } from '../audio/engine';
import { midiToFreq } from '../data/songs';
import { setAnimalResolver, type AnimalDef } from '../data/animals';
import type { VoiceHandle } from '../audio/instruments';
import { registerLocalSprite, unregisterLocalSprite } from '../game/sprites';
import { save, persist } from './storage';

export const CUSTOM_CHAR_COST = 1500;
export const MAX_VOICE_SECONDS = 1.5;
export const MAX_AUDIO_FILE_MB = 5;
export const MAX_IMAGE_FILE_MB = 10;
export const MAX_CUSTOM_CHARS = 8;

export interface CustomCharMeta {
  id: string;
  name: string;
  createdAt: number;
  baseFreq: number;
  sampleRate: number;
}

interface CustomCharRecord extends CustomCharMeta {
  pcm: ArrayBuffer;
  image: Blob;
}

const DB_NAME = 'animal-duet-custom';
const STORE = 'chars';

const registry = new Map<string, CustomCharMeta>();
const pcmCache = new Map<string, { pcm: Float32Array; sampleRate: number }>();
const bufferCache = new Map<string, AudioBuffer>();

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

function defaultDef(meta: CustomCharMeta): AnimalDef {
  return {
    id: meta.id,
    species: 'cat',
    sex: 'm',
    name: meta.name,
    speciesName: 'Star',
    blurb: 'Your very own singing star!',
    patch: 'meow',
    pitchOffset: 0,
    bright: 1,
    treat: 'fish',
    colors: {
      body: '#f3e8f6',
      belly: '#ffffff',
      accent: '#c9a8e0',
      cheek: '#ff9ec0',
      detail: '#544651',
    },
  };
}

/** Load all custom characters into memory and hook the id resolver. */
export async function initCustomChars(): Promise<void> {
  setAnimalResolver((id) => {
    const meta = registry.get(id);
    return meta ? defaultDef(meta) : undefined;
  });
  try {
    const all = await tx<CustomCharRecord[]>('readonly', (s) => s.getAll());
    for (const rec of all) {
      registry.set(rec.id, {
        id: rec.id,
        name: rec.name,
        createdAt: rec.createdAt,
        baseFreq: rec.baseFreq,
        sampleRate: rec.sampleRate,
      });
      pcmCache.set(rec.id, { pcm: new Float32Array(rec.pcm), sampleRate: rec.sampleRate });
      registerLocalSprite(rec.id, rec.image);
    }
  } catch {
    /* IndexedDB unavailable (private mode) — feature simply hidden */
  }
}

export function listCustomChars(): CustomCharMeta[] {
  return [...registry.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function isCustomChar(id: string): boolean {
  return registry.has(id);
}

export async function createCustomChar(
  name: string,
  image: Blob,
  pcm: Float32Array,
  sampleRate: number,
  baseFreq: number,
): Promise<CustomCharMeta> {
  const id = `custom-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const meta: CustomCharMeta = { id, name, createdAt: Date.now(), baseFreq, sampleRate };
  const rec: CustomCharRecord = {
    ...meta,
    pcm: pcm.buffer.slice(0) as ArrayBuffer,
    image,
  };
  await tx('readwrite', (s) => s.put(rec));
  registry.set(id, meta);
  pcmCache.set(id, { pcm, sampleRate });
  registerLocalSprite(id, image);
  return meta;
}

export async function deleteCustomChar(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  registry.delete(id);
  pcmCache.delete(id);
  bufferCache.delete(id);
  unregisterLocalSprite(id);
  if (save.left === id) save.left = 'cat-m';
  if (save.right === id) save.right = 'cat-f';
  persist();
}

/* ------------------------------ voice playback --------------------------- */

function bufferFor(id: string): AudioBuffer | null {
  let buf = bufferCache.get(id) ?? null;
  if (!buf) {
    const raw = pcmCache.get(id);
    if (!raw) return null;
    const ctx = audio.ctx;
    buf = ctx.createBuffer(1, raw.pcm.length, raw.sampleRate);
    buf.getChannelData(0).set(raw.pcm);
    bufferCache.set(id, buf);
  }
  return buf;
}

/**
 * Sing a melody note using the user's recorded sound, pitch-shifted via
 * playback rate. Long notes loop the sustain portion of the sample.
 */
export function playCustomVoice(
  id: string,
  midi: number,
  opts: { when?: number; dur?: number; vel?: number } = {},
): VoiceHandle {
  const buffer = bufferFor(id);
  const meta = registry.get(id);
  const ctx = audio.ctx;
  if (!buffer || !meta) return { stop: () => {} };
  const t = opts.when && opts.when > 0 ? Math.max(opts.when, ctx.currentTime) : ctx.currentTime;
  const dur = Math.max(0.12, opts.dur ?? 0.3);
  const vel = opts.vel ?? 1;

  const rate = Math.min(4, Math.max(0.25, midiToFreq(midi) / meta.baseFreq));
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;

  const effDur = buffer.duration / rate;
  const rel = 0.1;
  if (dur > effDur * 0.9) {
    src.loop = true;
    src.loopStart = buffer.duration * 0.35;
    src.loopEnd = buffer.duration * 0.85;
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.75 * vel, t + 0.008);
  g.gain.setValueAtTime(0.7 * vel, t + Math.max(0.01, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);

  const master = ctx.createGain();
  src.connect(g).connect(master).connect(audio.sfxBus);
  src.start(t);
  src.stop(t + dur + rel + 0.05);
  return {
    stop: () => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.09);
    },
  };
}

/** Little arpeggio in the custom voice — previews / sound test. */
export function playCustomRiff(id: string): void {
  const t = audio.ctx.currentTime;
  [64, 67, 72].forEach((m, i) => {
    playCustomVoice(id, m, { when: t + i * 0.24, dur: i === 2 ? 0.5 : 0.18, vel: 0.9 });
  });
}

/* ------------------------------ voice analysis --------------------------- */

/** Autocorrelation pitch detection over the loudest window. 60–900 Hz. */
export function detectPitch(pcm: Float32Array, sampleRate: number): number | null {
  const win = Math.min(pcm.length, 4096);
  if (win < 1024) return null;
  // loudest window start
  let bestStart = 0;
  let bestE = -1;
  const hop = 512;
  for (let s = 0; s + win <= pcm.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + win; i += 8) e += pcm[i] * pcm[i];
    if (e > bestE) {
      bestE = e;
      bestStart = s;
    }
  }
  const slice = pcm.subarray(bestStart, bestStart + win);
  const minLag = Math.floor(sampleRate / 900);
  const maxLag = Math.min(win - 2, Math.ceil(sampleRate / 60));
  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < win - lag; i++) {
      corr += slice[i] * slice[i + lag];
      norm += slice[i] * slice[i] + slice[i + lag] * slice[i + lag];
    }
    const score = norm > 0 ? (2 * corr) / norm : 0;
    if (score > bestCorr) {
      bestCorr = score;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestCorr < 0.35) return null;
  return sampleRate / bestLag;
}

/** Trim leading/trailing silence, cap length, peak-normalize. */
export function conditionVoice(
  pcm: Float32Array,
  sampleRate: number,
): Float32Array | null {
  const thresh = 0.02;
  let start = 0;
  let end = pcm.length - 1;
  while (start < pcm.length && Math.abs(pcm[start]) < thresh) start++;
  while (end > start && Math.abs(pcm[end]) < thresh) end--;
  if (end - start < sampleRate * 0.05) return null; // under 50 ms of sound
  const maxLen = Math.floor(sampleRate * MAX_VOICE_SECONDS);
  const len = Math.min(end - start + 1, maxLen);
  const out = new Float32Array(len);
  out.set(pcm.subarray(start, start + len));
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.001) {
    const k = 0.9 / peak;
    for (let i = 0; i < len; i++) out[i] *= k;
  }
  // short fade-out to avoid clicks
  const fade = Math.min(len, Math.floor(sampleRate * 0.04));
  for (let i = 0; i < fade; i++) {
    out[len - 1 - i] *= i / fade;
  }
  return out;
}
