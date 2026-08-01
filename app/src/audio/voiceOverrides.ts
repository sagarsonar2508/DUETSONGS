/**
 * Recorded voice overrides — real animal sounds for the built-in roster.
 *
 * The admin studio can attach a short recorded sample (a real meow, woof,
 * quack…) to any character. The sample ships as a small mono WAV in
 * public/characters/ and is listed in manifest.json together with its
 * detected base pitch. At play time the sample is pitch-shifted via
 * playback rate to sing the melody — the same technique the premium
 * "star your own pet" feature uses, so overridden characters sound just
 * as alive.
 *
 * WAVs are parsed by hand (they are our own admin-sanitized files) so the
 * PCM is available synchronously and notes can be scheduled sample-
 * accurately without waiting on decodeAudioData.
 */

import { audio } from './engine';
import { midiToFreq } from '../data/songs';
import type { VoiceHandle } from './instruments';

interface OverrideEntry {
  baseFreq: number;
  pcm: Float32Array | null;
  sampleRate: number;
  buffer: AudioBuffer | null;
}

const overrides = new Map<string, OverrideEntry>();

/** Parse a RIFF/WAVE file into mono Float32 PCM. Returns null if malformed. */
export function decodeWav(
  bytes: ArrayBuffer,
): { pcm: Float32Array; sampleRate: number } | null {
  const v = new DataView(bytes);
  if (bytes.byteLength < 44) return null;
  if (v.getUint32(0, false) !== 0x52494646 /* RIFF */) return null;
  if (v.getUint32(8, false) !== 0x57415645 /* WAVE */) return null;

  let fmt: { format: number; channels: number; sampleRate: number; bits: number } | null = null;
  let dataOff = -1;
  let dataLen = 0;
  let off = 12;
  while (off + 8 <= bytes.byteLength) {
    const id = v.getUint32(off, false);
    const size = v.getUint32(off + 4, true);
    if (id === 0x666d7420 /* fmt  */) {
      fmt = {
        format: v.getUint16(off + 8, true),
        channels: v.getUint16(off + 10, true),
        sampleRate: v.getUint32(off + 12, true),
        bits: v.getUint16(off + 22, true),
      };
    } else if (id === 0x64617461 /* data */) {
      dataOff = off + 8;
      dataLen = Math.min(size, bytes.byteLength - dataOff);
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || dataOff < 0 || fmt.channels < 1 || fmt.sampleRate < 8000) return null;

  const ch = fmt.channels;
  let frames: number;
  let read: (frame: number, channel: number) => number;
  if (fmt.format === 1 && fmt.bits === 16) {
    frames = Math.floor(dataLen / (2 * ch));
    read = (f, c) => v.getInt16(dataOff + (f * ch + c) * 2, true) / 32768;
  } else if (fmt.format === 3 && fmt.bits === 32) {
    frames = Math.floor(dataLen / (4 * ch));
    read = (f, c) => v.getFloat32(dataOff + (f * ch + c) * 4, true);
  } else if (fmt.format === 1 && fmt.bits === 8) {
    frames = Math.floor(dataLen / ch);
    read = (f, c) => (v.getUint8(dataOff + f * ch + c) - 128) / 128;
  } else {
    return null;
  }
  if (frames < 64) return null;

  const pcm = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let c = 0; c < ch; c++) s += read(f, c);
    pcm[f] = s / ch;
  }
  return { pcm, sampleRate: fmt.sampleRate };
}

/**
 * Register a voice override and start fetching its sample in the
 * background. Safe to call before the AudioContext exists.
 */
export function registerVoiceOverride(id: string, url: string, baseFreq: number): void {
  const entry: OverrideEntry = {
    baseFreq: baseFreq > 20 ? baseFreq : 220,
    pcm: null,
    sampleRate: 44100,
    buffer: null,
  };
  overrides.set(id, entry);
  void fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((buf) => {
      const wav = decodeWav(buf);
      if (!wav) throw new Error('bad wav');
      entry.pcm = wav.pcm;
      entry.sampleRate = wav.sampleRate;
    })
    .catch(() => {
      // unreadable file — drop the override so the synth patch sings instead
      if (overrides.get(id) === entry) overrides.delete(id);
    });
}

export function unregisterVoiceOverride(id: string): void {
  overrides.delete(id);
}

/** True when the character sings with a recorded sample (and it loaded). */
export function hasVoiceOverride(id: string): boolean {
  const e = overrides.get(id);
  return !!e && e.pcm !== null;
}

function bufferFor(entry: OverrideEntry): AudioBuffer | null {
  if (!entry.pcm) return null;
  if (!entry.buffer) {
    const buf = audio.ctx.createBuffer(1, entry.pcm.length, entry.sampleRate);
    buf.getChannelData(0).set(entry.pcm);
    entry.buffer = buf;
  }
  return entry.buffer;
}

/**
 * Sing a melody note with the recorded sample, pitch-shifted via playback
 * rate. Mirrors customChars.playCustomVoice: the shift is octave-folded so
 * the voice never strays more than ~an octave from the real recording, and
 * long notes loop the sustain portion of the sample.
 */
export function playVoiceOverride(
  id: string,
  midi: number,
  opts: { when?: number; dur?: number; vel?: number } = {},
): VoiceHandle {
  const entry = overrides.get(id);
  const ctx = audio.ctx;
  const buffer = entry ? bufferFor(entry) : null;
  if (!entry || !buffer) return { stop: () => {} };
  const t = opts.when && opts.when > 0 ? Math.max(opts.when, ctx.currentTime) : ctx.currentTime;
  const dur = Math.max(0.12, opts.dur ?? 0.3);
  const vel = opts.vel ?? 1;

  let rate = midiToFreq(midi) / entry.baseFreq;
  while (rate > 1.75) rate /= 2;
  while (rate < 0.55) rate *= 2;
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

/** The register an overridden voice naturally sings in, around its sample. */
export function voiceOverrideRange(id: string): [number, number] {
  const entry = overrides.get(id);
  const baseMidi = entry
    ? Math.round(69 + 12 * Math.log2(entry.baseFreq / 440))
    : 60;
  return [baseMidi - 5, baseMidi + 8];
}

/** Little arpeggio in the overridden voice — previews / sound test. */
export function playOverrideRiff(id: string): void {
  const t = audio.ctx.currentTime;
  [64, 67, 72].forEach((m, i) => {
    playVoiceOverride(id, m, { when: t + i * 0.24, dur: i === 2 ? 0.5 : 0.18, vel: 0.9 });
  });
}
