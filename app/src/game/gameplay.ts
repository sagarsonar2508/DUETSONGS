/**
 * Gameplay scene v2.
 *
 * The two characters sit on wooden benches; treats fall along each lane and
 * land exactly on the beat at the dashed catch line. Catching a treat sings
 * that melody note in the character's own voice — sustained notes fall as
 * elongated treats that must be *held*. The voices carry the song; the
 * backing band stays underneath. Audio-clock driven throughout.
 */

import { audio } from '../audio/engine';
import { Backing } from '../audio/backing';
import {
  playPatch,
  uiSound,
  PATCH_RANGE,
  fitToRange,
  type VoiceHandle,
} from '../audio/instruments';
import { animalById, type AnimalDef } from '../data/animals';
import {
  buildChart,
  songById,
  FALL_DURATION,
  type ChartNote,
  type SongDef,
} from '../data/songs';
import {
  save,
  addCoins,
  recordResult,
  songProgress,
} from '../core/storage';
import { completeDaily } from '../core/daily';
import { checkAchievements } from '../core/achievements';
import type { PlayOpts } from '../core/router';
import { isCustomChar, playCustomVoice, customRange } from '../core/customChars';
import {
  hasVoiceOverride,
  playVoiceOverride,
  voiceOverrideRange,
} from '../audio/voiceOverrides';
import { setBackHandler, setPauseHandler, keepAwake, haptic } from '../core/platform';
import { drawAnimal, drawTreat, drawHoldTreat } from './art';
import { Particles } from './particles';
import { showResults } from '../ui/results';

/** Notes at least this many beats long become hold notes. */
const HOLD_BEATS = 1.5;
const COUNT_IN = 3.4;
/** Sudden death: one miss ends the run (a revive is the only second chance). */
const MAX_HEARTS = 1;

interface LiveNote extends ChartNote {
  time: number;
  durSec: number;
  isHold: boolean;
  x: number;
  status: 'pending' | 'active' | 'holding' | 'caught' | 'missed' | 'skipped';
  handle?: VoiceHandle;
  /** the voice was scheduled early (predictively) so it is heard on the beat */
  voiceScheduled?: boolean;
  presung?: boolean;
}

export interface GameResult {
  songId: string;
  score: number;
  maxCombo: number;
  caught: number;
  perfect: number;
  total: number;
  accuracy: number;
  stars: number;
  coins: number;
  cleared: boolean;
  newBest: boolean;
  /** endless mode: completed loops */
  loops?: number;
  /** 2-player: per-lane caught/perfect */
  twoP?: { caught: [number, number]; perfect: [number, number] };
  /** daily challenge bonus paid on this clear */
  dailyBonus?: number;
  /** achievements earned by this run (name + reward), for the results toastline */
  awards?: { name: string; reward: number }[];
}

export interface GameHandlers {
  onQuit: () => void;
  onRestart: () => void;
}

export class Game {
  private root: HTMLElement;
  private song: SongDef;
  private handlers: GameHandlers;

  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private hud: HTMLElement;
  private overlayHost: HTMLElement;

  private notes: LiveNote[] = [];
  private startTime = 0;
  private endTime = 0;
  private fallDur: number;
  private spb: number;
  private backing = new Backing();
  private particles = new Particles();

  private animals: [AnimalDef, AnimalDef];
  private animX: [number, number] = [0, 0];
  private targetX: [number, number] = [0, 0];
  private squash: [number, number] = [0, 0];
  private sing: [number, number] = [0, 0];

  private pointers = new Map<number, 0 | 1>();
  private keys = new Set<string>();

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private caught = 0;
  private perfect = 0;
  private missed = 0;
  private skipped = 0;
  private hearts = MAX_HEARTS;
  private revived = false;
  private milestonesLit = 0;

  private opts: PlayOpts;
  private twoP: boolean;
  private laneCaught: [number, number] = [0, 0];
  private lanePerfect: [number, number] = [0, 0];
  /** endless mode: completed loops and current speed multiplier */
  private endless: boolean;
  private loop = 0;
  private speed = 1;

  private paused = false;
  private finished = false;
  private destroyed = false;
  private missFlash = 0;
  private lastCount = 4;
  private raf = 0;
  private lastFrame = 0;

  private W = 0;
  private H = 0;
  private midiMin = 60;
  private midiMax = 72;
  /** per-lane transposition into the singer's natural register */
  private laneShift: [number, number] = [0, 0];
  private laneRange: [[number, number], [number, number]] = [[48, 72], [48, 72]];
  private wasFirstClear: boolean;

  constructor(root: HTMLElement, songId: string, handlers: GameHandlers, opts: PlayOpts = {}) {
    this.root = root;
    this.song = songById(songId);
    this.handlers = handlers;
    this.opts = opts;
    this.twoP = save.settings.twoPlayer;
    this.endless = opts.mode === 'endless';
    this.fallDur = FALL_DURATION[this.song.difficulty] / (save.settings.noteSpeed || 1);
    this.spb = 60 / this.song.bpm;
    this.animals = [
      animalById(opts.chars?.[0] ?? save.left),
      animalById(opts.chars?.[1] ?? save.right),
    ];
    this.wasFirstClear = songProgress(songId).plays === 0;

    root.innerHTML = '';
    root.className = 'game-root';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    root.appendChild(this.canvas);
    const g = this.canvas.getContext('2d');
    if (!g) throw new Error('no canvas 2d context');
    this.g = g;

    this.hud = document.createElement('div');
    this.hud.className = 'game-hud';
    this.hud.innerHTML = `
      <div class="hud-top">
        <button class="hud-pause" aria-label="Pause">II</button>
        <div class="hud-progress">
          <div class="hud-progress-fill"></div>
          <span class="hud-mile" style="left:35%">★</span>
          <span class="hud-mile" style="left:70%">★</span>
          <span class="hud-mile" style="left:99%">★</span>
        </div>
        <div class="hud-hearts">${'<span class="hud-heart">♥</span>'.repeat(MAX_HEARTS)}</div>
      </div>
      <div class="hud-score">0</div>
      <div class="hud-combo"></div>
      <div class="hud-countdown"></div>
    `;
    root.appendChild(this.hud);
    this.overlayHost = document.createElement('div');
    root.appendChild(this.overlayHost);

    this.hud.querySelector('.hud-pause')!.addEventListener('click', () => this.pause());

    this.resize = this.resize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // native integration: back button pauses, backgrounding pauses, screen stays on
    setBackHandler(() => {
      this.pause();
      return true;
    });
    setPauseHandler(() => this.pause());
    keepAwake(true);

    this.resize();
    this.buildNotes();
    this.startAudio();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  /* ------------------------------- setup -------------------------------- */

  private buildNotes(): void {
    const chart = buildChart(this.song);
    this.midiMin = Math.min(...chart.map((n) => n.midi));
    this.midiMax = Math.max(...chart.map((n) => n.midi));
    this.notes = chart.map((n) => ({
      ...n,
      time: n.beat * this.spb,
      durSec: n.dur * this.spb,
      isHold: n.dur >= HOLD_BEATS,
      x: 0,
      status: 'pending' as const,
    }));

    // Transpose each lane's part into its singer's natural register, so a
    // frog always croaks low and a chick trills high — the animal keeps its
    // voice and the song comes to it, not the other way around.
    for (const lane of [0, 1] as const) {
      const def = this.animals[lane];
      const sampled = isCustomChar(def.id) || hasVoiceOverride(def.id);
      let [lo, hi] = isCustomChar(def.id)
        ? customRange(def.id)
        : hasVoiceOverride(def.id)
          ? voiceOverrideRange(def.id)
          : PATCH_RANGE[def.patch];
      if (!sampled && def.bright > 1) {
        lo += 3;
        hi += 3;
      }
      const laneNotes = chart.filter((n) => n.lane === lane);
      const avg = laneNotes.length
        ? laneNotes.reduce((s, n) => s + n.midi, 0) / laneNotes.length
        : 62;
      this.laneShift[lane] = Math.round(((lo + hi) / 2 - avg) / 12) * 12;
      this.laneRange[lane] = [lo, hi];
    }
  }

  private startAudio(): void {
    const ctx = audio.ctx;
    this.startTime = ctx.currentTime + COUNT_IN;
    const last = this.notes[this.notes.length - 1];
    this.endTime = this.startTime + last.time + last.durSec + 1.6;
    this.backing.start(this.song, this.startTime, last.beat + last.dur);
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.root.clientWidth;
    this.H = this.root.clientHeight;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.animX = [this.W * 0.25, this.W * 0.75];
    this.targetX = [this.W * 0.25, this.W * 0.75];
  }

  /* ------------------------------ geometry ------------------------------- */

  private animalSize(): number {
    return Math.min(120, this.W * 0.26);
  }

  private benchY(): number {
    return this.H - this.animalSize() * 0.66;
  }

  private animCY(): number {
    return this.benchY() - this.animalSize() * 0.5;
  }

  private landY(): number {
    return this.animCY() - this.animalSize() * 0.24;
  }

  private noteX(n: ChartNote): number {
    const span = Math.max(1, this.midiMax - this.midiMin);
    const k = (n.midi - this.midiMin) / span;
    const half = this.W / 2;
    const x = half * (0.16 + 0.68 * k);
    return n.lane === 0 ? x : half + x;
  }

  private laneClamp(side: 0 | 1, x: number): number {
    const pad = this.animalSize() * 0.42;
    return side === 0
      ? Math.max(pad, Math.min(this.W / 2 - pad * 0.4, x))
      : Math.max(this.W / 2 + pad * 0.4, Math.min(this.W - pad, x));
  }

  /* ------------------------------- input -------------------------------- */

  private onPointerDown(e: PointerEvent): void {
    if (this.paused || this.finished) return;
    let side: 0 | 1 = e.clientX < this.W / 2 ? 0 : 1;
    if (save.settings.swapSides) side = side === 0 ? 1 : 0;
    this.pointers.set(e.pointerId, side);
    this.targetX[side] = this.laneClamp(side, e.clientX);
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    const side = this.pointers.get(e.pointerId);
    if (side === undefined) return;
    this.targetX[side] = this.laneClamp(side, e.clientX);
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.pause();
      return;
    }
    this.keys.add(e.key.toLowerCase());
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  /* ------------------------------ game loop ------------------------------ */

  private now(): number {
    return audio.ctx.currentTime;
  }

  private frame(): void {
    if (this.destroyed) return;
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;
    if (!this.paused) {
      this.update(dt);
    }
    this.draw();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  private update(dt: number): void {
    const t = this.now() - this.startTime;

    // countdown
    if (t < 0) {
      const count = Math.ceil(-t);
      if (count !== this.lastCount && count <= 3) {
        this.lastCount = count;
        uiSound('countdown');
        this.popText('.hud-countdown', String(count));
      }
    } else if (this.lastCount !== 0) {
      this.lastCount = 0;
      uiSound('go');
      this.popText('.hud-countdown', 'GO!');
      setTimeout(() => {
        if (!this.destroyed) {
          const el = this.hud.querySelector('.hud-countdown');
          if (el) el.textContent = '';
        }
      }, 700);
    }

    // keyboard movement
    const kb = this.W * 2 * dt;
    if (this.keys.has('a')) this.targetX[0] = this.laneClamp(0, this.animX[0] - kb);
    if (this.keys.has('d')) this.targetX[0] = this.laneClamp(0, this.animX[0] + kb);
    if (this.keys.has('arrowleft')) this.targetX[1] = this.laneClamp(1, this.animX[1] - kb);
    if (this.keys.has('arrowright')) this.targetX[1] = this.laneClamp(1, this.animX[1] + kb);

    // characters
    for (const s of [0, 1] as const) {
      this.animX[s] += (this.targetX[s] - this.animX[s]) * Math.min(1, dt * 16);
      this.squash[s] = Math.max(0, this.squash[s] - dt * 4);
      this.sing[s] = Math.max(0, this.sing[s] - dt * 2.6);
    }

    // notes
    const radius = this.animalSize() * 0.8;
    const lead = audio.lead;
    for (const n of this.notes) {
      if (n.status === 'pending' && t >= n.time - this.fallDur) {
        n.status = 'active';
        n.x = this.noteX(n);
      }
      // Predictive sing: schedule the voice `lead` early so it is HEARD at the
      // exact moment the treat lands, in time with the backing band.
      if (n.status === 'active' && !n.voiceScheduled && t >= n.time - lead) {
        n.voiceScheduled = true;
        if (Math.abs(this.animX[n.lane] - n.x) <= radius) {
          n.handle = this.singNote(n, this.startTime + n.time - lead, true);
          n.presung = true;
        }
      }
      if (n.status === 'active' && t >= n.time) {
        const dist = Math.abs(this.animX[n.lane] - n.x);
        if (dist <= radius) {
          this.onCatch(n, dist / radius, t);
        } else {
          // moved away after the voice was already queued — fade it out
          if (n.presung) n.handle?.stop();
          n.status = 'missed';
          this.onMiss(n);
        }
      }
      if (n.status === 'holding') {
        this.sing[n.lane] = 1;
        const dist = Math.abs(this.animX[n.lane] - n.x);
        const tailT = n.time + n.durSec;
        if (t >= tailT) {
          // held to the end — bonus!
          n.status = 'caught';
          const mult = 1 + Math.min(this.combo, 50) / 25;
          const bonus = Math.round(30 * n.dur * mult);
          this.score += bonus;
          this.particles.burst(n.x, this.landY(), '#ffd98a', 16);
          this.particles.scoreText(n.x, this.landY() - 70, `+${bonus} hold!`, '#f5a623');
          this.updateScore();
        } else if (dist > radius * 1.15) {
          // slipped out — voice cuts, keep what you earned
          n.handle?.stop();
          n.status = 'caught';
        } else {
          // sparkle drip while holding
          if (Math.random() < dt * 22) {
            this.particles.musicNote(n.x, this.landY() - 30, this.song.theme.accent);
          }
        }
      }
    }

    this.particles.update(dt);
    this.missFlash = Math.max(0, this.missFlash - dt * 2.5);

    // progress + star milestones
    const total = this.endTime - this.startTime;
    const frac = Math.max(0, Math.min(1, t / total));
    (this.hud.querySelector('.hud-progress-fill') as HTMLElement).style.width =
      `${frac * 100}%`;
    const miles = this.hud.querySelectorAll('.hud-mile');
    const thresholds = [0.35, 0.7, 0.99];
    thresholds.forEach((th, i) => {
      if (frac >= th && this.milestonesLit <= i) {
        miles[i].classList.add('lit');
        this.milestonesLit = i + 1;
      }
    });

    if (!this.finished && this.now() >= this.endTime) {
      if (this.endless) this.nextLoop();
      else this.finish(true);
    }
  }

  /** Endless: queue the chart again, a notch faster, and keep going. */
  private nextLoop(): void {
    this.loop += 1;
    this.speed = Math.min(1.6, Math.pow(1.07, this.loop));
    const loopSpb = this.spb / this.speed;
    const chart = buildChart(this.song);
    const offset = this.endTime - this.startTime + 1.2;
    this.notes = chart.map((n) => ({
      ...n,
      time: offset + n.beat * loopSpb,
      durSec: n.dur * loopSpb,
      isHold: n.dur >= HOLD_BEATS,
      x: 0,
      status: 'pending' as const,
    }));
    const last = this.notes[this.notes.length - 1];
    this.endTime = this.startTime + last.time + last.durSec + 1.6;
    this.milestonesLit = 0;
    this.hud.querySelectorAll('.hud-mile').forEach((m) => m.classList.remove('lit'));
    this.backing.stop();
    this.backing.start(
      { ...this.song, bpm: this.song.bpm * this.speed },
      this.startTime + offset,
      last.beat + last.dur,
    );
    this.popText('.hud-countdown', `Loop ${this.loop + 1} · ×${this.speed.toFixed(2)}`);
    uiSound('go');
  }

  private popText(sel: string, text: string): void {
    const el = this.hud.querySelector(sel) as HTMLElement;
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  /** Sing one chart note in the lane character's voice. `when` 0 = now. */
  private singNote(n: LiveNote, when: number, strong: boolean): VoiceHandle {
    const def = this.animals[n.lane];
    const vel = strong ? 1 : 0.85;
    const [lo, hi] = this.laneRange[n.lane];
    const midi = fitToRange(n.midi + this.laneShift[n.lane], lo, hi);
    if (isCustomChar(def.id)) {
      return playCustomVoice(def.id, midi, { when, dur: n.durSec, vel });
    }
    if (hasVoiceOverride(def.id)) {
      return playVoiceOverride(def.id, midi, { when, dur: n.durSec, vel });
    }
    return playPatch(def.patch, midi, {
      when,
      dur: n.durSec,
      vel,
      bright: def.bright,
    });
  }

  private onCatch(n: LiveNote, distRatio: number, t: number): void {
    const isPerfect = distRatio < 0.45;
    const def = this.animals[n.lane];
    // already queued predictively? keep it — otherwise sing now (arrived late)
    const handle = n.presung
      ? n.handle!
      : this.singNote(n, 0, isPerfect);

    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.caught += 1;
    this.laneCaught[n.lane] += 1;
    if (isPerfect) {
      this.perfect += 1;
      this.lanePerfect[n.lane] += 1;
    }
    const mult = 1 + Math.min(this.combo, 50) / 25;
    const points = Math.round((isPerfect ? 100 : 60) * mult);
    this.score += points;

    this.squash[n.lane] = 1;
    this.sing[n.lane] = 1;

    if (n.isHold) {
      n.status = 'holding';
      n.handle = handle;
    } else {
      n.status = 'caught';
    }

    const y = this.landY();
    const accent = def.colors.accent;
    this.particles.burst(n.x, y, accent, isPerfect ? 14 : 9);
    this.particles.musicNote(n.x, y - 30, this.song.theme.accent);
    this.particles.scoreText(
      n.x, y - 60,
      isPerfect ? `+${points} ✦` : `+${points}`,
      isPerfect ? '#f5a623' : '#8a7ab8',
    );

    this.updateScore();
    const comboEl = this.hud.querySelector('.hud-combo') as HTMLElement;
    if (this.combo >= 4) {
      comboEl.textContent = `${this.combo} combo`;
      comboEl.classList.remove('pop');
      void comboEl.offsetWidth;
      comboEl.classList.add('pop');
    }
    haptic('catch');
    void t;
  }

  private updateScore(): void {
    (this.hud.querySelector('.hud-score') as HTMLElement).textContent =
      this.score.toLocaleString();
  }

  private onMiss(n: LiveNote): void {
    this.missed += 1;
    this.combo = 0;
    this.hearts -= 1;
    this.missFlash = 1;
    uiSound(this.hearts > 0 ? 'heartLost' : 'miss');
    this.hud.querySelectorAll('.hud-heart').forEach((h, i) => {
      h.classList.toggle('lost', i >= this.hearts);
    });
    (this.hud.querySelector('.hud-combo') as HTMLElement).textContent = '';
    haptic('miss');
    void n;
    if (this.hearts <= 0) {
      this.failScreen();
    }
  }

  /* ------------------------------ overlays ------------------------------- */

  private pause(): void {
    if (this.paused || this.finished || this.now() < this.startTime - 3) return;
    this.paused = true;
    void audio.pause();
    this.overlayHost.innerHTML = `
      <div class="overlay">
        <div class="panel">
          <h2>Paused</h2>
          <div class="panel-song">${this.song.title}</div>
          <button class="btn btn-primary" data-act="resume">Resume</button>
          <button class="btn" data-act="restart">Restart</button>
          <button class="btn btn-ghost" data-act="quit">Quit</button>
        </div>
      </div>`;
    this.overlayHost.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        const act = (b as HTMLElement).dataset.act;
        if (act === 'resume') this.resume();
        else if (act === 'restart') this.restart();
        else this.quit();
      }),
    );
  }

  private resume(): void {
    this.overlayHost.innerHTML = '';
    void audio.resume().then(() => {
      this.paused = false;
      this.lastFrame = performance.now();
    });
  }

  private restart(): void {
    this.destroy();
    this.handlers.onRestart();
  }

  private quit(): void {
    this.destroy();
    this.handlers.onQuit();
  }

  private failScreen(): void {
    this.paused = true;
    void audio.pause();
    uiSound('fail');
    const canRevive = !this.revived && save.coins >= 100;
    this.overlayHost.innerHTML = `
      <div class="overlay">
        <div class="panel">
          <div class="panel-emoji">💔</div>
          <h2>Oh no!</h2>
          <div class="panel-song">The duet fell silent…</div>
          ${
            canRevive
              ? `<button class="btn btn-primary" data-act="revive">Revive · <span class="coin-ico">●</span> 100</button>`
              : ''
          }
          <button class="btn" data-act="restart">Restart</button>
          <button class="btn btn-ghost" data-act="giveup">End song</button>
        </div>
      </div>`;
    this.overlayHost.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        const act = (b as HTMLElement).dataset.act;
        if (act === 'revive') this.revive();
        else if (act === 'restart') this.restart();
        else this.finish(false);
      }),
    );
  }

  private revive(): void {
    this.revived = true;
    addCoins(-100);
    uiSound('buy');
    this.hearts = MAX_HEARTS;
    this.hud.querySelectorAll('.hud-heart').forEach((h) => h.classList.remove('lost'));
    this.overlayHost.innerHTML = '';
    void audio.resume().then(() => {
      const t = this.now() - this.startTime;
      for (const n of this.notes) {
        if ((n.status === 'active' || n.status === 'pending') && n.time < t + 1.0) {
          n.status = 'skipped';
          this.skipped += 1;
        }
      }
      this.paused = false;
      this.lastFrame = performance.now();
    });
  }

  private finish(cleared: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.paused = true;
    this.backing.stop();
    for (const n of this.notes) n.handle?.stop();
    void audio.resume();

    const denom = Math.max(1, this.notes.length - this.skipped);
    const accuracy = this.caught / denom;
    let stars = 0;
    if (cleared && !this.endless) {
      stars = accuracy >= 0.98 ? 3 : accuracy >= 0.88 ? 2 : 1;
    }
    let coins: number;
    let newBest = false;
    if (this.endless) {
      coins = Math.round(this.score / 150) + this.loop * 25;
      save.stats.endlessBestLoops = Math.max(save.stats.endlessBestLoops, this.loop);
    } else {
      coins = Math.round(this.score / (cleared ? 100 : 200));
      coins += stars * 20;
      if (cleared && this.wasFirstClear) coins += 100;
      newBest = recordResult(this.song.id, this.score, stars).newBest;
    }
    addCoins(coins);

    // lifetime stats for achievements
    save.stats.caught += this.caught;
    save.stats.perfect += this.perfect;
    if (cleared && !this.endless) {
      save.stats.cleared += 1;
      if (!this.revived && this.skipped === 0) save.stats.flawless += 1;
    }
    if (this.twoP) save.stats.twoPlayerGames += 1;

    const dailyBonus = this.opts.daily && cleared ? completeDaily() : 0;
    const awards = checkAchievements().map((a) => ({ name: a.name, reward: a.reward }));

    const result: GameResult = {
      songId: this.song.id,
      score: this.score,
      maxCombo: this.maxCombo,
      caught: this.caught,
      perfect: this.perfect,
      total: this.notes.length,
      accuracy,
      stars,
      coins,
      cleared,
      newBest,
      ...(this.endless ? { loops: this.loop } : {}),
      ...(this.twoP ? { twoP: { caught: this.laneCaught, perfect: this.lanePerfect } } : {}),
      ...(dailyBonus > 0 ? { dailyBonus } : {}),
      ...(awards.length ? { awards } : {}),
    };

    showResults(this.overlayHost, this.song, result, {
      onRetry: () => this.restart(),
      onDone: () => this.quit(),
    });
  }

  /* ------------------------------ rendering ------------------------------ */

  private drawScene(t: number): void {
    const g = this.g;
    const { W, H } = this;
    const theme = this.song.theme;

    // wall
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, theme.top);
    grad.addColorStop(0.82, theme.bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // ambient bokeh
    g.save();
    for (let i = 0; i < 10; i++) {
      const seed = i * 127.3;
      const bx = ((seed * 7919) % W) + Math.sin(t * 0.3 + i) * 26;
      const by = ((seed * 104729) % (H * 0.6));
      g.globalAlpha = 0.05 + (i % 3) * 0.02;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(bx, by, 16 + (i % 4) * 13, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // floor with perspective tiles
    const floorY = H * 0.86;
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(0, floorY, W, H - floorY);
    g.strokeStyle = 'rgba(120,80,60,0.12)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, floorY);
    g.lineTo(W, floorY);
    g.stroke();
    for (let i = -2; i <= 6; i++) {
      const xTop = (i / 4) * W;
      const xBot = W / 2 + (xTop - W / 2) * 1.7;
      g.beginPath();
      g.moveTo(xTop, floorY);
      g.lineTo(xBot, H);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0, floorY + (H - floorY) * 0.5);
    g.lineTo(W, floorY + (H - floorY) * 0.5);
    g.stroke();

    // center divider
    g.save();
    g.strokeStyle = 'rgba(120,90,110,0.22)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(W / 2, 70);
    g.lineTo(W / 2, H);
    g.stroke();
    g.restore();

    // dashed catch line across both lanes
    const landY = this.landY();
    g.save();
    g.strokeStyle = 'rgba(120,90,110,0.3)';
    g.lineWidth = 1.6;
    g.setLineDash([7, 8]);
    g.beginPath();
    g.moveTo(12, landY);
    g.lineTo(W - 12, landY);
    g.stroke();
    g.restore();

    // benches
    const size = this.animalSize();
    const by = this.benchY();
    for (const s of [0, 1] as const) {
      const x0 = s === 0 ? W * 0.04 : W * 0.54;
      const x1 = s === 0 ? W * 0.46 : W * 0.96;
      const bw = x1 - x0;
      // legs
      g.fillStyle = '#8a5a30';
      const legW = Math.max(5, size * 0.06);
      g.fillRect(x0 + bw * 0.12, by, legW, size * 0.34);
      g.fillRect(x1 - bw * 0.12 - legW, by, legW, size * 0.34);
      // plank
      const plank = g.createLinearGradient(0, by - size * 0.1, 0, by + size * 0.08);
      plank.addColorStop(0, '#d29a5c');
      plank.addColorStop(1, '#b0743a');
      g.beginPath();
      g.roundRect(x0, by - size * 0.1, bw, size * 0.17, 6);
      g.fillStyle = plank;
      g.fill();
      g.strokeStyle = 'rgba(90,50,20,0.35)';
      g.lineWidth = 1.5;
      g.stroke();
      // wood grain
      g.strokeStyle = 'rgba(90,50,20,0.14)';
      g.beginPath();
      g.moveTo(x0 + bw * 0.08, by - size * 0.02);
      g.lineTo(x1 - bw * 0.2, by - size * 0.02);
      g.stroke();
    }
  }

  private draw(): void {
    const g = this.g;
    const { W, H } = this;
    const t = this.now() - this.startTime;

    this.drawScene(t);

    const landY = this.landY();
    const size = this.animalSize();
    const spawnY = -60;
    const noteR = Math.min(22, W * 0.048);

    // notes
    for (const n of this.notes) {
      if (n.status !== 'active' && n.status !== 'holding') continue;
      const def = this.animals[n.lane];
      const speed = (landY - spawnY) / this.fallDur;
      const len = n.isHold ? n.durSec * speed : 0;
      if (n.status === 'holding') {
        const heldRatio = Math.min(1, (t - n.time) / n.durSec);
        const tailY = landY - len * (1 - heldRatio);
        drawHoldTreat(g, def.treat, n.x, landY, tailY, noteR, t + n.beat, def.colors.accent, heldRatio);
        continue;
      }
      const k = 1 - (n.time - t) / this.fallDur;
      const y = spawnY + (landY - spawnY) * k;
      if (n.isHold) {
        drawHoldTreat(g, def.treat, n.x, y, y - len, noteR, t + n.beat, def.colors.accent, 0);
      } else {
        // sparkle trail
        g.save();
        for (let i = 1; i <= 3; i++) {
          g.globalAlpha = 0.1 / i;
          g.fillStyle = def.colors.accent;
          g.beginPath();
          g.arc(n.x, y - i * 24, noteR * (1 - i * 0.18), 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        drawTreat(g, def.treat, n.x, y, noteR, t + n.beat, def.colors.accent);
      }
    }

    // characters on their benches
    for (const s of [0, 1] as const) {
      const lean = (this.targetX[s] - this.animX[s]) / (W * 0.2);
      drawAnimal(g, this.animals[s], this.animX[s], this.animCY(), size, {
        t: performance.now() / 1000,
        squash: this.squash[s],
        sing: this.sing[s],
        dir: Math.max(-1, Math.min(1, lean)),
      });
      if (this.twoP) {
        g.save();
        g.font = `800 ${Math.round(size * 0.13)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillStyle = s === 0 ? '#e75f96' : '#5aa7e8';
        g.fillText(`P${s + 1}`, this.animX[s], this.animCY() - size * 0.62);
        g.restore();
      }
    }

    this.particles.draw(g);

    if (this.missFlash > 0) {
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      v.addColorStop(0, 'rgba(255,80,90,0)');
      v.addColorStop(1, `rgba(255,80,90,${this.missFlash * 0.35})`);
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------- cleanup ------------------------------- */

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.backing.stop();
    for (const n of this.notes) n.handle?.stop();
    void audio.resume();
    setBackHandler(null);
    setPauseHandler(null);
    keepAwake(false);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.innerHTML = '';
    this.root.className = '';
  }
}
