/**
 * Web Audio bootstrap. One shared AudioContext, created lazily on the first
 * user gesture (mobile browsers require this), with a master bus:
 *
 *   [instruments] → sfx gain ┐
 *   [backing band] → music gain ┴→ master gain → compressor → speakers
 */

import { save } from '../core/storage';

class AudioEngine {
  private _ctx: AudioContext | null = null;
  private _master!: GainNode;
  private _music!: GainNode;
  private _sfx!: GainNode;

  get ctx(): AudioContext {
    return this.ensure();
  }

  get musicBus(): GainNode {
    this.ensure();
    return this._music;
  }

  get sfxBus(): GainNode {
    this.ensure();
    return this._sfx;
  }

  ensure(): AudioContext {
    if (!this._ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this._ctx = new Ctor({ latencyHint: 'interactive' });

      const compressor = this._ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 20;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;
      compressor.connect(this._ctx.destination);

      this._master = this._ctx.createGain();
      this._master.gain.value = 0.9;
      this._master.connect(compressor);

      this._music = this._ctx.createGain();
      this._music.connect(this._master);

      this._sfx = this._ctx.createGain();
      this._sfx.connect(this._master);

      this.applyVolumes();
    }
    if (this._ctx.state === 'suspended') {
      void this._ctx.resume();
    }
    return this._ctx;
  }

  applyVolumes(): void {
    if (!this._ctx) return;
    this._music.gain.value = save.settings.musicVol;
    this._sfx.gain.value = save.settings.sfxVol;
  }

  now(): number {
    return this.ctx.currentTime;
  }

  /**
   * How far ahead (seconds) sound must be scheduled so it is *heard* at the
   * intended moment. Uses the player's calibrated value, or the device's
   * reported output latency when set to auto.
   */
  get lead(): number {
    const ms = save.settings.audioLeadMs;
    if (ms >= 0) return Math.min(0.3, ms / 1000);
    const ctx = this.ensure();
    const reported = (ctx as { outputLatency?: number }).outputLatency ?? 0;
    const est = reported > 0.001 ? reported : ctx.baseLatency * 2;
    return Math.min(0.3, Math.max(0, est));
  }

  /** Auto-detected lead in ms, for display in the settings UI. */
  get autoLeadMs(): number {
    const ctx = this.ensure();
    const reported = (ctx as { outputLatency?: number }).outputLatency ?? 0;
    const est = reported > 0.001 ? reported : ctx.baseLatency * 2;
    return Math.round(Math.min(0.3, Math.max(0, est)) * 1000);
  }

  async pause(): Promise<void> {
    if (this._ctx && this._ctx.state === 'running') {
      await this._ctx.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this._ctx && this._ctx.state === 'suspended') {
      await this._ctx.resume();
    }
  }
}

export const audio = new AudioEngine();
