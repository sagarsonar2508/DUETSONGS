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

/**
 * Each species' natural singing register (midi). Songs are transposed into
 * this range so a frog always croaks low and a chick always trills high —
 * the melody adapts to the animal, not the animal to the melody.
 */
export const PATCH_RANGE: Record<PatchId, [number, number]> = {
  // deliberately narrow (~14 semitones, like Duet Cats): a song can bend a
  // voice by an octave at most, never drag it across registers
  meow: [58, 72],
  chirp: [70, 84],
  bark: [46, 60],
  croak: [40, 54],
  hoot: [52, 66],
  quack: [58, 72],
  yip: [64, 78],
  grunt: [38, 52],
  beep: [62, 76],
  boo: [50, 64],
  roar: [40, 54],
  twinkle: [72, 86],
};

/** Octave-fold a midi note into [lo, hi]. */
export function fitToRange(midi: number, lo: number, hi: number): number {
  let m = midi;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return Math.max(lo, m);
}

/**
 * Partial key-tracking: filters follow the note's pitch only gently
 * (amt≈0.3) instead of linearly, so timbre stays put while pitch moves.
 * Referenced to middle C.
 */
function keytrack(f: number, base: number, amt = 0.3): number {
  return base * Math.pow(f / 261.63, amt);
}

/**
 * Fixed vocal-tract resonances — the core of species identity. Two constant
 * bandpass formants (they do NOT follow the melody note), optionally
 * sweeping between vowel positions like "m-ee-ow".
 */
function formants(
  ctx: AudioContext,
  src: AudioNode,
  out: AudioNode,
  t: number,
  stop: number,
  spec: { from: [number, number]; to?: [number, number]; q?: number; gain?: number; sweep?: number },
): void {
  const q = spec.q ?? 5;
  const gain = spec.gain ?? 1;
  spec.from.forEach((freq, i) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(freq, t);
    if (spec.to) {
      bp.frequency.exponentialRampToValueAtTime(
        Math.max(50, spec.to[i]),
        t + (spec.sweep ?? 0.3),
      );
    }
    const g = ctx.createGain();
    g.gain.value = gain * (i === 0 ? 1 : 0.6);
    src.connect(bp).connect(g).connect(out);
  });
  void stop;
}

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
  // Fixed temporal signature, like a sample: every meow has the same
  // attack, the same contour speed, the same minimum length. Hold notes
  // stretch ONLY the sustained vowel in the middle — never the shape.
  const base = 0.42;
  const sus = Math.max(0, dur - base);
  const hold = base + sus;
  const rel = 0.28;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.045, hold, rel, 0.5 * vel);

  const src = ctx.createGain();
  const o1 = osc(ctx, 'sawtooth', f * 1.01, t, stop);
  o1.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  o1.frequency.setValueAtTime(f, t + 0.3 + sus);
  o1.frequency.exponentialRampToValueAtTime(f * 0.94, t + hold + rel * 0.5);
  const o2 = osc(ctx, 'triangle', f * 2, t, stop);
  const g2 = ctx.createGain();
  g2.gain.value = 0.2;
  vibrato(ctx, o1.frequency, t, stop, br > 1 ? 6.5 : 4.8, f * 0.016, 0.16);
  o1.connect(src);
  o2.connect(g2).connect(src);

  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.Q.value = 1.4;
  body.frequency.value = keytrack(f, 1500 * Math.sqrt(br));
  const bg = ctx.createGain();
  bg.gain.value = 0.55;
  src.connect(body).connect(bg).connect(g);
  formants(ctx, src, g, t, stop, {
    from: [1000 * Math.sqrt(br), 2400],
    to: [560, 950],
    sweep: 0.3,
    q: 5,
    gain: 1.1,
  });
  g.connect(out);
};

const chirp: Voice = (ctx, out, f, t, dur, vel, br) => {
  const hold = Math.max(0.16, dur);
  const rel = 0.12;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.012, hold, rel, 0.42 * vel);
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
    // short: crisp "wof!" — snout resonance is FIXED, only pitch moves
    const stop = t + 0.3;
    const g = env(ctx, t, 0.008, 0.06, 0.16, 0.5 * vel);
    const src = ctx.createGain();
    const o = osc(ctx, 'sawtooth', f * 1.3, t, stop);
    o.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.1);
    const sub = osc(ctx, 'sine', f * 0.5, t, stop);
    const sg = ctx.createGain();
    sg.gain.value = 0.5;
    o.connect(src);
    sub.connect(sg).connect(src);
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.Q.value = 1.5;
    body.frequency.value = keytrack(f, 1500 * Math.sqrt(br));
    const bg = ctx.createGain();
    bg.gain.value = 0.6;
    src.connect(body).connect(bg).connect(g);
    formants(ctx, src, g, t, stop, { from: [620, 1250], q: 4, gain: 1 });
    g.connect(out);
    noiseBurst(ctx, out, t, 0.06, 900, 0.12 * vel);
  } else {
    // long: a little howl — awooo
    const rel = 0.3;
    const stop = t + dur + rel + 0.1;
    const g = env(ctx, t, 0.09, dur, rel, 0.44 * vel);
    const src = ctx.createGain();
    const o = osc(ctx, 'sawtooth', f * 0.85, t, stop);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.18);
    vibrato(ctx, o.frequency, t, stop, br > 1 ? 5.5 : 4.2, f * 0.014, 0.25);
    const sub = osc(ctx, 'sine', f * 0.5, t, stop);
    const sg = ctx.createGain();
    sg.gain.value = 0.45;
    o.connect(src);
    sub.connect(sg).connect(src);
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.Q.value = 1.2;
    body.frequency.value = keytrack(f, 1300 * Math.sqrt(br));
    const bg = ctx.createGain();
    bg.gain.value = 0.6;
    src.connect(body).connect(bg).connect(g);
    formants(ctx, src, g, t, stop, { from: [520, 1100], to: [700, 1250], sweep: 0.4, q: 4, gain: 0.9 });
    g.connect(out);
  }
};

const croak: Voice = (ctx, out, f, t, dur, vel, br) => {
  const hold = Math.max(0.4, dur);
  const rel = 0.18;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.03, hold, rel, 0.52 * vel);
  // throat sac resonance is FIXED and low; flutter rate never changes
  const src = ctx.createGain();
  const o = osc(ctx, 'square', f * 0.5, t, stop);
  const o2 = osc(ctx, 'sawtooth', f, t, stop);
  const g2 = ctx.createGain();
  g2.gain.value = 0.4;
  o.connect(src);
  o2.connect(g2).connect(src);
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = keytrack(f, 700 * Math.sqrt(br), 0.2);
  const bg = ctx.createGain();
  bg.gain.value = 0.7;
  src.connect(body).connect(bg);
  const fmix = ctx.createGain();
  formants(ctx, src, fmix, t, stop, { from: [380, 900], q: 4, gain: 0.9 });
  const am = osc(ctx, 'sine', br > 1 ? 34 : 26, t, stop);
  const amDepth = ctx.createGain();
  amDepth.gain.value = 0.42;
  const amBase = ctx.createGain();
  amBase.gain.value = 0.62;
  am.connect(amDepth).connect(amBase.gain);
  bg.connect(amBase);
  fmix.connect(amBase);
  amBase.connect(g).connect(out);
};

const hoot: Voice = (ctx, out, f, t, dur, vel, br) => {
  const hold = Math.max(0.5, dur);
  const rel = 0.3;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.08, hold, rel, 0.48 * vel);
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
  const hold = Math.max(0.18, dur);
  const rel = 0.12;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.012, hold, rel, 0.44 * vel);
  // the nasal bill honk lives at a FIXED formant pair; buzz rate fixed
  const o = osc(ctx, 'sawtooth', f, t, stop);
  o.frequency.exponentialRampToValueAtTime(f * 0.93, t + 0.18);
  const src = ctx.createGain();
  o.connect(src);
  const amBase = ctx.createGain();
  amBase.gain.value = 0.72;
  const am = osc(ctx, 'sine', br > 1 ? 52 : 40, t, stop);
  const amDepth = ctx.createGain();
  amDepth.gain.value = 0.38;
  am.connect(amDepth).connect(amBase.gain);
  formants(ctx, src, amBase, t, stop, { from: [1500 * Math.sqrt(br), 2700], q: 3, gain: 1.1 });
  const direct = ctx.createGain();
  direct.gain.value = 0.35;
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = keytrack(f, 1200);
  src.connect(body).connect(direct).connect(g);
  amBase.connect(g);
  g.connect(out);
};

const yip: Voice = (ctx, out, f, t, dur, vel, br) => {
  const hold = Math.max(0.18, dur);
  const rel = 0.14;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.01, hold, rel, 0.42 * vel);
  const src = ctx.createGain();
  const o = osc(ctx, 'sawtooth', f * 0.9, t, stop);
  o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.05);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 7 : 5.5, f * 0.02, 0.15);
  o.connect(src);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 260;
  const bg = ctx.createGain();
  bg.gain.value = 0.5;
  src.connect(hp).connect(bg).connect(g);
  // sharp foxy snout — fixed bright resonances
  formants(ctx, src, g, t, stop, { from: [1150, 2500 * Math.sqrt(br)], q: 4, gain: 0.9 });
  g.connect(out);
};

const grunt: Voice = (ctx, out, f, t, dur, vel, br) => {
  const hold = Math.max(0.45, dur);
  const rel = 0.28;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.055, hold, rel, 0.55 * vel);
  const src = ctx.createGain();
  const o = osc(ctx, 'triangle', f * 0.5, t, stop);
  const sub = osc(ctx, 'sine', f * 0.25, t, stop);
  const sg = ctx.createGain();
  sg.gain.value = 0.55;
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 6.5 : 5, f * 0.012, 0.14);
  o.connect(src);
  sub.connect(sg).connect(src);
  // big round chest — low FIXED resonance, barely tracks pitch
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = keytrack(f, 480 * Math.sqrt(br), 0.15);
  const bg = ctx.createGain();
  bg.gain.value = 0.8;
  src.connect(body).connect(bg).connect(g);
  formants(ctx, src, g, t, stop, { from: [300, 620], q: 3.5, gain: 0.7 });
  g.connect(out);
};

const beep: Voice = (ctx, out, f, t, dur, vel, br) => {
  // chiptune robot: pure square with a quick pitch-slide attack, a touch of
  // PWM-ish shimmer from a detuned partner, and a fixed "speaker" formant
  const hold = Math.max(0.14, dur);
  const rel = 0.08;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.006, hold, rel, 0.34 * vel);
  const o = osc(ctx, 'square', f * 0.5, t, stop);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  const o2 = osc(ctx, 'square', f * 1.008, t, stop);
  const g2 = ctx.createGain();
  g2.gain.value = 0.35;
  // robotic vibrato: stepped and fast rather than smooth
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 9 : 7, f * 0.008, 0.1);
  const src = ctx.createGain();
  o.connect(src);
  o2.connect(g2).connect(src);
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.Q.value = 2;
  body.frequency.value = keytrack(f, 2200 * Math.sqrt(br));
  const bg = ctx.createGain();
  bg.gain.value = 0.7;
  src.connect(body).connect(bg).connect(g);
  formants(ctx, src, g, t, stop, { from: [1200, 2600 * Math.sqrt(br)], q: 6, gain: 0.5 });
  g.connect(out);
  // tiny attack click — servo tick
  noiseBurst(ctx, out, t, 0.02, 3200, 0.05 * vel, 'highpass');
};

const boo: Voice = (ctx, out, f, t, dur, vel, br) => {
  // airy phantom: soft sine swell with breathy noise riding along, wide
  // slow vibrato — a theremin with a bedsheet
  const hold = Math.max(0.4, dur);
  const rel = 0.35;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.12, hold, rel, 0.5 * vel);
  const o = osc(ctx, 'sine', f * 0.94, t, stop);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.2);
  const h = osc(ctx, 'sine', f * 2, t, stop);
  const hg = ctx.createGain();
  hg.gain.value = 0.12 * br;
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 5.5 : 4, f * 0.03, 0.3);
  o.connect(g);
  h.connect(hg).connect(g);
  // breath: band-limited noise following the same envelope, quiet
  const breath = ctx.createBufferSource();
  breath.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = keytrack(f, 900 * Math.sqrt(br));
  bp.Q.value = 1.4;
  const bgain = env(ctx, t, 0.15, hold, rel, 0.06 * vel);
  breath.connect(bp).connect(bgain).connect(out);
  breath.start(t);
  breath.stop(stop);
  g.connect(out);
};

const roar: Voice = (ctx, out, f, t, dur, vel, br) => {
  // small dragon, big chest: growly saw + deep sub with slow AM rumble and
  // a smoky noise layer; fixed low cave resonances
  const hold = Math.max(0.4, dur);
  const rel = 0.3;
  const stop = t + hold + rel + 0.1;
  const g = env(ctx, t, 0.05, hold, rel, 0.55 * vel);
  const src = ctx.createGain();
  const o = osc(ctx, 'sawtooth', f * 0.9, t, stop);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.14);
  const sub = osc(ctx, 'sine', f * 0.5, t, stop);
  const sg = ctx.createGain();
  sg.gain.value = 0.6;
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 5.5 : 4.2, f * 0.014, 0.2);
  o.connect(src);
  sub.connect(sg).connect(src);
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.Q.value = 1.3;
  body.frequency.value = keytrack(f, 900 * Math.sqrt(br), 0.2);
  const bg = ctx.createGain();
  bg.gain.value = 0.65;
  // throat rumble
  const am = osc(ctx, 'sine', br > 1 ? 22 : 16, t, stop);
  const amDepth = ctx.createGain();
  amDepth.gain.value = 0.3;
  const amBase = ctx.createGain();
  amBase.gain.value = 0.75;
  am.connect(amDepth).connect(amBase.gain);
  src.connect(body).connect(bg).connect(amBase).connect(g);
  formants(ctx, src, g, t, stop, { from: [340, 760], to: [420, 900], sweep: 0.35, q: 4, gain: 0.8 });
  g.connect(out);
  // smoky exhale on the attack
  noiseBurst(ctx, out, t, 0.12, 500, 0.08 * vel, 'lowpass');
};

const twinkle: Voice = (ctx, out, f, t, dur, vel, br) => {
  // celestial chime: bell partials (1×, 2.76×) with sparkly shimmer that
  // blooms after the strike — long notes keep gently glittering
  const hold = Math.max(0.18, dur);
  const rel = 0.5;
  const stop = t + hold + rel + 0.15;
  const g = env(ctx, t, 0.004, hold, rel, 0.4 * vel);
  const o = osc(ctx, 'triangle', f, t, stop);
  const p2 = osc(ctx, 'sine', f * 2.76, t, stop);
  const p2g = ctx.createGain();
  p2g.gain.setValueAtTime(0.35 * br, t);
  p2g.gain.exponentialRampToValueAtTime(0.06, t + 0.5);
  const p3 = osc(ctx, 'sine', f * 4.07, t, stop);
  const p3g = ctx.createGain();
  p3g.gain.setValueAtTime(0.15 * br, t);
  p3g.gain.exponentialRampToValueAtTime(0.02, t + 0.35);
  vibrato(ctx, o.frequency, t, stop, br > 1 ? 6.5 : 5, f * 0.006, 0.25);
  o.connect(g);
  p2.connect(p2g).connect(g);
  p3.connect(p3g).connect(g);
  g.connect(out);
};

const VOICES: Record<PatchId, Voice> = {
  meow, chirp, bark, croak, hoot, quack, yip, grunt, beep, boo, roar, twinkle,
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
  // sing the riff inside the animal's own register so previews sound true
  let [lo, hi] = PATCH_RANGE[patch];
  if (bright > 1) {
    lo += 3;
    hi += 3;
  }
  const center = Math.round((lo + hi) / 2);
  const base = Math.round((center - 67) / 12) * 12;
  const notes = [64, 67, 72].map((m) => fitToRange(m + base, lo, hi));
  notes.forEach((m, i) => {
    playPatch(patch, m, {
      when: t + i * 0.22,
      dur: i === notes.length - 1 ? 0.5 : 0.16,
      vel: 0.9,
      bright,
    });
  });
  void pitchOffset;
}
