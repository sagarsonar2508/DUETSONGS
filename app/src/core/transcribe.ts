/**
 * On-device song transcription — audio file in, playable chart out.
 *
 * Powered by Spotify's open-source basic-pitch neural model (Apache-2.0)
 * running fully locally via TensorFlow.js; the model ships with the app
 * (public/basic-pitch/, ~900 KB) so no network is ever touched. Pipeline:
 *
 *   decode → resample to 22 kHz mono → basic-pitch note events →
 *   monophonic melody selection (topline by salience) → tempo estimate →
 *   quantize to a beat grid → SongDef melody tokens → key detection
 *   (Krumhansl profiles) → backing chord loop in that key
 *
 * The decoded audio is thrown away afterwards — only the chart survives,
 * so the game never stores or replays the original recording.
 *
 * This module is heavy (TF.js) — always load it via dynamic import.
 */

import { BasicPitch, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { audio } from '../audio/engine';
import { MAX_SONG_MINUTES, type UserSongRecord } from './userSongs';

const MODEL_URL = '/basic-pitch/model.json';
const TARGET_RATE = 22050;
const GRID = 0.25; // beat quantization grid
const MAX_FILE_MB = 60;

export type ProgressFn = (stage: 'decode' | 'analyze' | 'chart', percent: number) => void;

export interface TranscribeResult {
  record: UserSongRecord;
  noteCount: number;
  seconds: number;
  truncated: boolean;
  /** thinned variant for an easier chart of the same song */
  easy: { melody: string; noteCount: number };
}

interface MelNote {
  start: number; // seconds
  dur: number;
  midi: number;
  amp: number;
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToToken(midi: number, dur: number): string {
  const name = `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  return dur === 1 ? name : `${name}/${round2(dur)}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ------------------------- melody line selection -------------------------- */

/**
 * basic-pitch is polyphonic; the game wants one singable line. Sweep the
 * note events in time order, collapse near-simultaneous clusters to their
 * most salient member (louder wins, slight bias to the topline), and trim
 * overlaps so the result is strictly monophonic.
 */
function selectMelody(notes: MelNote[]): MelNote[] {
  const clean = notes
    .filter((n) => n.amp > 0.12 && n.midi >= 36 && n.midi <= 96 && n.dur >= 0.06)
    .sort((a, b) => a.start - b.start);

  const salience = (n: MelNote) => n.amp + n.midi * 0.004;
  const out: MelNote[] = [];
  for (const n of clean) {
    const prev = out[out.length - 1];
    if (prev && n.start < prev.start + 0.09) {
      if (salience(n) > salience(prev)) out[out.length - 1] = { ...n };
      continue;
    }
    if (prev && n.start < prev.start + prev.dur) {
      prev.dur = Math.max(0.08, n.start - prev.start);
    }
    out.push({ ...n });
  }

  // density cap: keep the strongest ~6 notes per second so charts stay human
  const MAX_PER_SEC = 6;
  const thinned: MelNote[] = [];
  let windowStart = 0;
  let bucket: MelNote[] = [];
  const flush = () => {
    bucket.sort((a, b) => salience(b) - salience(a));
    thinned.push(...bucket.slice(0, MAX_PER_SEC));
    bucket = [];
  };
  for (const n of out) {
    if (n.start >= windowStart + 1) {
      flush();
      windowStart = Math.floor(n.start);
    }
    bucket.push(n);
  }
  flush();
  return thinned.sort((a, b) => a.start - b.start);
}

/**
 * Easy variant: keep only the stronger notes and enforce breathing room, so
 * younger players get a sparser chart of the same melody.
 */
function thinForEasy(notes: MelNote[]): MelNote[] {
  const amps = notes.map((n) => n.amp).sort((a, b) => a - b);
  const cut = amps[Math.floor(amps.length * 0.3)] ?? 0;
  const out: MelNote[] = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (prev && n.start - prev.start < 0.42) {
      if (n.amp > prev.amp) out[out.length - 1] = { ...n };
      continue;
    }
    if (n.amp < cut && prev) continue;
    out.push({ ...n });
  }
  return out;
}

/* ------------------------------ tempo / key ------------------------------- */

function estimateBpm(notes: MelNote[]): number {
  if (notes.length < 8) return 100;
  const iois: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    const d = notes[i].start - notes[i - 1].start;
    if (d > 0.12 && d < 2) iois.push(d);
  }
  if (iois.length === 0) return 100;
  iois.sort((a, b) => a - b);
  let bpm = 60 / iois[Math.floor(iois.length / 2)];
  while (bpm < 70) bpm *= 2;
  while (bpm > 150) bpm /= 2;
  return Math.round(bpm);
}

const KRUMHANSL_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlate(hist: number[], profile: number[], shift: number): number {
  const n = 12;
  let mh = 0;
  let mp = 0;
  for (let i = 0; i < n; i++) {
    mh += hist[i];
    mp += profile[i];
  }
  mh /= n;
  mp /= n;
  let num = 0;
  let dh = 0;
  let dp = 0;
  for (let i = 0; i < n; i++) {
    const h = hist[(i + shift) % n] - mh;
    const p = profile[i] - mp;
    num += h * p;
    dh += h * h;
    dp += p * p;
  }
  return dh > 0 && dp > 0 ? num / Math.sqrt(dh * dp) : 0;
}

function detectKey(notes: MelNote[]): { root: number; minor: boolean } {
  const hist = new Array<number>(12).fill(0);
  for (const n of notes) hist[((n.midi % 12) + 12) % 12] += n.dur;
  let best = { root: 0, minor: false, score: -2 };
  for (let root = 0; root < 12; root++) {
    const maj = correlate(hist, KRUMHANSL_MAJ, root);
    const min = correlate(hist, KRUMHANSL_MIN, root);
    if (maj > best.score) best = { root, minor: false, score: maj };
    if (min > best.score) best = { root, minor: true, score: min };
  }
  return { root: best.root, minor: best.minor };
}

function chordLoop(root: number, minor: boolean): string[] {
  const name = (pc: number) => NAMES[((pc % 12) + 12) % 12];
  return minor
    ? [`${name(root)}m`, name(root + 8), name(root + 3), name(root + 10)] // i VI III VII
    : [name(root), name(root + 7), `${name(root + 9)}m`, name(root + 5)]; // I V vi IV
}

/* ------------------------------- chart build ------------------------------ */

function buildMelodyString(notes: MelNote[], bpm: number): { melody: string; beats: number } {
  const spb = 60 / bpm;
  const t0 = notes[0].start;

  interface QNote {
    beat: number;
    dur: number;
    midi: number;
    amp: number;
  }
  const q: QNote[] = [];
  for (const n of notes) {
    const beat = Math.round((n.start - t0) / spb / GRID) * GRID;
    const dur = Math.min(4, Math.max(GRID, Math.round(n.dur / spb / GRID) * GRID));
    const prev = q[q.length - 1];
    if (prev && beat <= prev.beat + 1e-6) {
      if (n.amp > prev.amp) {
        prev.midi = n.midi;
        prev.dur = Math.max(prev.dur, dur);
      }
      continue;
    }
    if (prev && prev.beat + prev.dur > beat) prev.dur = round2(beat - prev.beat);
    q.push({ beat, dur, midi: n.midi, amp: n.amp });
  }

  const tokens: string[] = [];
  let cursor = 0;
  for (const n of q) {
    let gap = round2(n.beat - cursor);
    while (gap > 1e-6) {
      const r = Math.min(4, gap);
      tokens.push(`R/${round2(r)}`);
      gap = round2(gap - r);
    }
    tokens.push(midiToToken(n.midi, n.dur));
    cursor = round2(n.beat + n.dur);
  }
  return { melody: tokens.join(' '), beats: cursor };
}

/* --------------------------------- theme ---------------------------------- */

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * Math.max(0, Math.min(1, c)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function themeFor(title: string): { top: string; bottom: string; accent: string } {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const h = ((hash % 360) + 360) % 360;
  return {
    top: hslToHex(h, 70, 88),
    bottom: hslToHex((h + 45) % 360, 65, 86),
    accent: hslToHex(h, 55, 58),
  };
}

/* --------------------------------- main ----------------------------------- */

export async function transcribeFile(
  file: File,
  onProgress: ProgressFn,
): Promise<TranscribeResult | { error: string }> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return { error: `File is over ${MAX_FILE_MB} MB.` };
  }

  // 1. decode (any format the device can play: mp3, m4a, ogg, wav, flac…)
  onProgress('decode', 0);
  let decoded: AudioBuffer;
  try {
    decoded = await audio.ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    return { error: 'Could not decode that file — is it an audio file?' };
  }
  const truncated = decoded.duration > MAX_SONG_MINUTES * 60;
  const seconds = Math.min(decoded.duration, MAX_SONG_MINUTES * 60);
  if (seconds < 5) return { error: 'That clip is too short — 5 seconds minimum.' };

  // 2. resample to the model's 22.05 kHz mono
  onProgress('decode', 0.6);
  const off = new OfflineAudioContext(1, Math.ceil(seconds * TARGET_RATE), TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const mono = (await off.startRendering()).getChannelData(0);

  // 3. neural transcription (the slow part — progress is real)
  const frames: number[][] = [];
  const onsets: number[][] = [];
  try {
    const bp = new BasicPitch(MODEL_URL);
    await bp.evaluateModel(
      mono,
      (f, o) => {
        frames.push(...f);
        onsets.push(...o);
      },
      (pct) => onProgress('analyze', pct / 100),
    );
  } catch (e) {
    return { error: `Transcription failed: ${(e as Error).message || 'model unavailable'}` };
  }

  // 4. note events → melody → chart
  onProgress('chart', 0.2);
  const events = noteFramesToTime(outputToNotesPoly(frames, onsets, 0.5, 0.3, 9));
  const melodyNotes = selectMelody(
    events.map((e) => ({
      start: e.startTimeSeconds,
      dur: e.durationSeconds,
      midi: e.pitchMidi,
      amp: e.amplitude,
    })),
  );
  if (melodyNotes.length < 12) {
    return { error: "Couldn't hear a clear melody in that recording — try a song with a stronger lead line." };
  }

  const bpm = estimateBpm(melodyNotes);
  const { melody, beats } = buildMelodyString(melodyNotes, bpm);
  const key = detectKey(melodyNotes);
  const notesPerSec = melodyNotes.length / seconds;
  const title =
    file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 28) || 'My Song';

  const easyNotes = thinForEasy(melodyNotes);
  const easyMelody = buildMelodyString(easyNotes, bpm);

  onProgress('chart', 1);
  const record: UserSongRecord = {
    id: `user-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    title,
    composer: 'Your library',
    bpm,
    beatsPerBar: 4,
    difficulty: notesPerSec < 1.6 ? 1 : notesPerSec < 2.8 ? 2 : 3,
    cost: 0,
    theme: themeFor(title),
    chords: chordLoop(key.root, key.minor),
    melody,
    createdAt: Date.now(),
  };
  return {
    record,
    noteCount: melodyNotes.length,
    seconds: (beats * 60) / bpm,
    truncated,
    easy: { melody: easyMelody.melody, noteCount: easyNotes.length },
  };
}
