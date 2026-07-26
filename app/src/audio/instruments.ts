/**
 * Animal voices v2 — the voices ARE the melody.
 *
 * Every patch now supports sustained notes (the voice holds, with vibrato,
 * for the full length of the chart note — long meows for long treats), a
 * brightness parameter that separates female (bright, sparkly, fast vibrato)
 * from male (dark, round, slow vibrato) singers, and a stop handle so a
 * released hold-note cuts off naturally.
 */

import { audio } from './engine';
import { midiToFreq } from '../data/songs';
import type { PatchId } from '../data/animals';

export interface VoiceHandle {
  /** release the note early (ramps out over ~80ms) */
  stop: () => void;
}

export interface VoiceOpts {
  when?: number;
  dur?: number; // seconds the note should sustain
  vel?: number;
  bright?: number; // 1 neutral; >1 feminine sparkle; <1 masculine roundness
}

type Voice = (
  ctx: AudioContext,
  out: AudioNode,
  f: number,
  t: number,
  dur: number,
  vel: number,
  br: number,
) => void;

function osc(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  t: number,
  stop: number,
): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(stop);
  return o;
}

/** ADSR-ish: attack to peak, hold with slight decay, release. */
function env(
  ctx: AudioContext,
  t: number,
  a: number,
  hold: number,
  r: number,
  peak: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak * 0.92, t + a + Math.max(0.01, hold));
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0.01, hold) + r);
  return g;
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function noiseBurst(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  dur: number,
  filterFreq: number,
  peak: number,
  type: BiquadFilterType = 'bandpass',
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = 1.2;
  const g = env(ctx, t, 0.005, dur * 0.3, dur * 0.7, peak);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.1);
}

function vibrato(
  ctx: AudioContext,
  target: AudioParam,
  t: number,
  stop: number,
  rate: number,
  depth: number,
  delay = 0.1,
): void {
  const lfo = osc(ctx, 'sine', rate, t, stop);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(depth, t + delay + 0.08);
  lfo.connect(g).connect(target);
}

/* ------------------------------ the voices ------------------------------ */
// Each voice sings freq f from t for `dur` seconds (sustain included).

const meow: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.28;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.045, dur, rel, 0.5 * vel);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2.2;
  // "me-oow": formant opens then settles
  filter.frequency.setValueAtTime(f * 2.2 * br, t);
  filter.frequency.exponentialRampToValueAtTime(f * 5.5 * br, t + 0.09);
  filter.frequency.exponentialRampToValueAtTime(f * 2.4 * br, t + Math.max(0.3, dur * 0.7));

  const o1 = osc(ctx, 'sawtooth', f * 1.01, t, stop);
  o1.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  o1.frequency.setValueAtTime(f, t + Math.max(0.15, dur * 0.75));
  o1.frequency.exponentialRampToValueAtTime(f * 0.94, t + dur + rel * 0.5);
  const o2 = osc(ctx, 'triangle', f * 2, t, stop);
  const g2 = ctx.createGain();
  g2.gain.value = 0.22 * br;
  vibrato(ctx, o1.frequency, t, stop, br > 1 ? 6.5 : 4.8, f * 0.016, 0.16);
  o1.connect(filter);
  o2.connect(g2).connect(filter);
  filter.connect(g).connect(out);
};

const chirp: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.12;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.012, dur, rel, 0.42 * vel);
  const o = osc(ctx, 'sine', f * 0.8, t, stop);
  o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.045);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
  // sustained chirps become a little trill
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 11 : 8, f * 0.05, 0.12);
  const h = osc(ctx, 'sine', f * 3, t, stop);
  const hg = ctx.createGain();
  hg.gain.value = 0.14 * br;
  o.connect(g);
  h.connect(hg).connect(g);
  g.connect(out);
};

const bark: Voice = (ctx, out, f, t, dur, vel, br) => {
  if (dur < 0.45) {
    // short: crisp "wof!"
    const stop = t + 0.3;
    const g = env(ctx, t, 0.008, 0.06, 0.16, 0.5 * vel);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(2600, f * 5 * br);
    filter.Q.value = 1.5;
    const o = osc(ctx, 'sawtooth', f * 1.3, t, stop);
    o.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.1);
    const sub = osc(ctx, 'sine', f * 0.5, t, stop);
    const sg = ctx.createGain();
    sg.gain.value = 0.5;
    o.connect(filter);
    sub.connect(sg).connect(filter);
    filter.connect(g).connect(out);
    noiseBurst(ctx, out, t, 0.06, 900 * br, 0.12 * vel);
  } else {
    // long: a little howl — awooo
    const rel = 0.3;
    const stop = t + dur + rel + 0.1;
    const g = env(ctx, t, 0.09, dur, rel, 0.44 * vel);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(2400, f * 4 * br);
    const o = osc(ctx, 'sawtooth', f * 0.85, t, stop);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.18);
    vibrato(ctx, o.frequency, t, stop, br > 1 ? 5.5 : 4.2, f * 0.014, 0.25);
    const sub = osc(ctx, 'sine', f * 0.5, t, stop);
    const sg = ctx.createGain();
    sg.gain.value = 0.45;
    o.connect(filter);
    sub.connect(sg).connect(filter);
    filter.connect(g).connect(out);
  }
};

const croak: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.18;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.03, dur, rel, 0.5 * vel);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(1400, f * 3.2 * br);
  const o = osc(ctx, 'square', f * 0.5, t, stop);
  const o2 = osc(ctx, 'sawtooth', f, t, stop);
  const g2 = ctx.createGain();
  g2.gain.value = 0.4;
  const am = osc(ctx, 'sine', br > 1 ? 34 : 26, t, stop);
  const amDepth = ctx.createGain();
  amDepth.gain.value = 0.42;
  const amBase = ctx.createGain();
  amBase.gain.value = 0.62;
  am.connect(amDepth).connect(amBase.gain);
  o.connect(filter);
  o2.connect(g2).connect(filter);
  filter.connect(amBase).connect(g).connect(out);
};

const hoot: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.3;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.08, dur, rel, 0.48 * vel);
  const o = osc(ctx, 'sine', f * 1.05, t, stop);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.13);
  const h = osc(ctx, 'triangle', f * 2, t, stop);
  const hg = ctx.createGain();
  hg.gain.value = 0.1 * br;
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 6 : 4.5, f * 0.022, 0.18);
  o.connect(g);
  h.connect(hg).connect(g);
  g.connect(out);
};

const quack: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.12;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.012, dur, rel, 0.42 * vel);
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.value = Math.min(2600, f * 4 * br);
  formant.Q.value = 1.6;
  const o = osc(ctx, 'sawtooth', f, t, stop);
  o.frequency.exponentialRampToValueAtTime(f * 0.93, t + Math.max(0.13, dur));
  const am = osc(ctx, 'sine', br > 1 ? 52 : 40, t, stop);
  const amDepth = ctx.createGain();
  amDepth.gain.value = 0.38;
  const amBase = ctx.createGain();
  amBase.gain.value = 0.72;
  am.connect(amDepth).connect(amBase.gain);
  const direct = ctx.createGain();
  direct.gain.value = 0.42;
  o.connect(formant).connect(amBase).connect(g);
  o.connect(direct).connect(g);
  g.connect(out);
};

const yip: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.14;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.01, dur, rel, 0.4 * vel);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 260;
  const o = osc(ctx, 'sawtooth', f * 0.9, t, stop);
  o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.05);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 7 : 5.5, f * 0.02, 0.15);
  o.connect(filter).connect(g).connect(out);
};

const grunt: Voice = (ctx, out, f, t, dur, vel, br) => {
  const rel = 0.28;
  const stop = t + dur + rel + 0.1;
  const g = env(ctx, t, 0.055, dur, rel, 0.52 * vel);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(1100, f * 2.8 * br);
  const o = osc(ctx, 'triangle', f * 0.5, t, stop);
  const sub = osc(ctx, 'sine', f * 0.25, t, stop);
  const sg = ctx.createGain();
  sg.gain.value = 0.55;
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 6.5 : 5, f * 0.012, 0.14);
  o.connect(filter);
  sub.connect(sg).connect(filter);
  filter.connect(g).connect(out);
};

const VOICES: Record<PatchId, Voice> = {
  meow, chirp, bark, croak, hoot, quack, yip, grunt,
};

/**
 * Sing a melody note in an animal's voice. Returns a handle that can cut
 * the note short (used when a hold-note is released early).
 */
export function playPatch(patch: PatchId, midi: number, opts: VoiceOpts = {}): VoiceHandle {
  const ctx = audio.ctx;
  const t = opts.when && opts.when > 0 ? opts.when : ctx.currentTime;
  const dur = Math.max(0.12, opts.dur ?? 0.3);
  const vel = opts.vel ?? 1;
  const br = opts.bright ?? 1;

  // per-note master gain so the note can be released early
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(audio.sfxBus);
  VOICES[patch](ctx, master, midiToFreq(midi), t, dur, vel, br);
  return {
    stop: () => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.09);
    },
  };
}

/* ------------------------------ UI sounds ------------------------------- */

function blip(f1: number, f2: number, dur: number, peak: number, when = 0): void {
  const ctx = audio.ctx;
  const t = when > 0 ? when : ctx.currentTime;
  const g = env(ctx, t, 0.005, dur * 0.3, dur * 0.7, peak);
  const o = osc(ctx, 'sine', f1, t, t + dur + 0.05);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.7);
  o.connect(g).connect(audio.sfxBus);
}

export type UiSound =
  | 'tap'
  | 'buy'
  | 'star'
  | 'fail'
  | 'miss'
  | 'countdown'
  | 'go'
  | 'heartLost';

export function uiSound(kind: UiSound): void {
  const ctx = audio.ctx;
  const t = ctx.currentTime;
  switch (kind) {
    case 'tap':
      blip(660, 880, 0.09, 0.15);
      break;
    case 'buy':
      blip(523, 659, 0.1, 0.18);
      blip(659, 880, 0.12, 0.18, t + 0.09);
      break;
    case 'star':
      blip(523, 523, 0.12, 0.16);
      blip(659, 659, 0.12, 0.16, t + 0.1);
      blip(784, 784, 0.2, 0.18, t + 0.2);
      break;
    case 'fail':
      blip(440, 220, 0.35, 0.2);
      blip(330, 165, 0.4, 0.16, t + 0.15);
      break;
    case 'miss':
      noiseBurst(ctx, audio.sfxBus, t, 0.12, 300, 0.14, 'lowpass');
      blip(180, 120, 0.15, 0.12);
      break;
    case 'heartLost':
      blip(392, 262, 0.2, 0.16);
      break;
    case 'countdown':
      blip(660, 660, 0.08, 0.14);
      break;
    case 'go':
      blip(880, 1100, 0.18, 0.18);
      break;
  }
}

/** Little arpeggio in a character's voice — used for previews / sound test. */
export function animalRiff(patch: PatchId, bright = 1, pitchOffset = 0): void {
  const ctx = audio.ctx;
  const t = ctx.currentTime;
  const notes = [64, 67, 72];
  notes.forEach((m, i) => {
    playPatch(patch, m + pitchOffset, {
      when: t + i * 0.22,
      dur: i === notes.length - 1 ? 0.5 : 0.16,
      vel: 0.9,
      bright,
    });
  });
}
