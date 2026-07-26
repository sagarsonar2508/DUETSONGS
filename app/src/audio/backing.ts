/**
 * The backing band: soft chord pads, a round bass, light kick/hat groove.
 * Scheduled with a lookahead timer against AudioContext time so it stays
 * locked to the chart even if the frame rate hiccups. The melody itself is
 * played by the *player* catching notes — just like Duet Cats.
 */

import { audio } from './engine';
import { midiToFreq, type SongDef } from '../data/songs';

const ROOT_MIDI: Record<string, number> = {
  C: 60,
  D: 62,
  E: 64,
  F: 65,
  G: 55,
  A: 57,
  B: 59,
};

function chordToMidis(chord: string): { triad: number[]; bass: number } {
  const m = /^([A-G])(#|b)?(m)?/.exec(chord.trim());
  let root = m ? ROOT_MIDI[m[1]] : 60;
  if (m && m[2] === '#') root += 1;
  if (m && m[2] === 'b') root -= 1;
  const minor = !!(m && m[3]);
  return {
    triad: [root, root + (minor ? 3 : 4), root + 7],
    bass: root - 24,
  };
}

export class Backing {
  private timer: number | null = null;
  private scheduledUntilBeat = 0;
  private startTime = 0;
  private song: SongDef | null = null;
  private endBeat = 0;

  start(song: SongDef, startTime: number, endBeat: number): void {
    this.song = song;
    this.startTime = startTime;
    this.endBeat = endBeat + song.beatsPerBar * 2;
    this.scheduledUntilBeat = 0;
    this.timer = window.setInterval(() => this.tick(), 90);
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.song = null;
  }

  private beatToTime(beat: number): number {
    return this.startTime + (beat * 60) / (this.song?.bpm ?? 120);
  }

  private tick(): void {
    const song = this.song;
    if (!song) return;
    const ctx = audio.ctx;
    if (ctx.state !== 'running') return;

    const spb = 60 / song.bpm;
    const nowBeat = (ctx.currentTime - this.startTime) / spb;
    const horizon = nowBeat + 1.2 / spb; // schedule ~1.2s ahead

    while (this.scheduledUntilBeat < horizon) {
      const beat = this.scheduledUntilBeat;
      if (beat > this.endBeat) {
        this.stop();
        return;
      }
      const t = this.beatToTime(beat);
      if (t >= ctx.currentTime - 0.05) {
        this.scheduleBeat(song, beat, t, spb);
      }
      this.scheduledUntilBeat += 0.5;
    }
  }

  private scheduleBeat(song: SongDef, beat: number, t: number, spb: number): void {
    const bpb = song.beatsPerBar;
    const isDownbeat = beat % 1 === 0;
    const beatInBar = ((beat % bpb) + bpb) % bpb;
    const bar = Math.floor(beat / bpb);

    if (isDownbeat && beatInBar === 0) {
      const chord = song.chords[bar % song.chords.length] ?? 'C';
      this.pad(chordToMidis(chord).triad, t, bpb * spb);
      this.bassNote(chordToMidis(chord).bass, t, spb * 1.6);
    }
    if (isDownbeat && bpb === 4 && beatInBar === 2) {
      const chord = song.chords[bar % song.chords.length] ?? 'C';
      this.bassNote(chordToMidis(chord).bass + 7, t, spb * 1.2, 0.5);
    }
    if (isDownbeat && (beatInBar === 0 || (bpb === 4 && beatInBar === 2))) {
      this.kick(t);
    }
    if (!isDownbeat) {
      this.hat(t);
    }
  }

  private pad(midis: number[], t: number, dur: number): void {
    const ctx = audio.ctx;
    const out = audio.musicBus;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03, t + dur * 0.25);
    g.gain.setValueAtTime(0.03, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    filter.connect(g).connect(out);
    for (const m of midis) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midiToFreq(m);
      o.detune.value = (m % 2 === 0 ? 1 : -1) * 4;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private bassNote(midi: number, t: number, dur: number, vel = 1): void {
    const ctx = audio.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midiToFreq(midi);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = midiToFreq(midi);
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(audio.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
    o2.start(t);
    o2.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const ctx = audio.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.13, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    o.connect(g).connect(audio.musicBus);
    o.start(t);
    o.stop(t + 0.16);
  }

  private hat(t: number): void {
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = Backing.noise(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.026, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f).connect(g).connect(audio.musicBus);
    src.start(t);
    src.stop(t + 0.06);
  }

  private static _noise: AudioBuffer | null = null;
  private static noise(ctx: AudioContext): AudioBuffer {
    if (!Backing._noise) {
      Backing._noise = ctx.createBuffer(1, ctx.sampleRate / 4, ctx.sampleRate);
      const d = Backing._noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return Backing._noise;
  }
}

/**
 * Gentle ambient loop for the menu screens — slow pentatonic plinks over a
 * warm pad, so the app feels alive the moment it opens.
 */
export class MenuMusic {
  private timer: number | null = null;
  private step = 0;

  start(): void {
    if (this.timer !== null) return;
    const PENTA = [72, 76, 79, 81, 84, 79, 76, 74];
    this.timer = window.setInterval(() => {
      const ctx = audio.ctx;
      if (ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.05;
      const midi = PENTA[this.step % PENTA.length];
      this.step++;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiToFreq(midi);
      const h = ctx.createOscillator();
      h.type = 'sine';
      h.frequency.value = midiToFreq(midi) * 2;
      const hg = ctx.createGain();
      hg.gain.value = 0.15;
      o.connect(g);
      h.connect(hg).connect(g);
      g.connect(audio.musicBus);
      o.start(t);
      o.stop(t + 1.5);
      h.start(t);
      h.stop(t + 1.5);
    }, 1400);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
