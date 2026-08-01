/**
 * Voice pipeline (admin studio).
 *
 * Mic recordings and uploaded audio files go through the exact same
 * conditioning the in-game "star your own pet" creator uses (import from
 * core/customChars): mono mixdown → silence trim → 1.5 s cap → peak
 * normalize → fade-out → autocorrelation pitch detection. The result is
 * encoded as a 16-bit mono WAV — small, metadata-free by construction, and
 * synchronously decodable by the game's voice-override engine.
 */

import { audio } from '../audio/engine';
import {
  conditionVoice,
  detectPitch,
  MAX_VOICE_SECONDS,
  MAX_AUDIO_FILE_MB,
} from '../core/customChars';

export { MAX_VOICE_SECONDS, MAX_AUDIO_FILE_MB };

export interface PreparedVoice {
  pcm: Float32Array;
  sampleRate: number;
  baseFreq: number;
  seconds: number;
}

/** Decode + condition any audio blob. Returns an error string on failure. */
export async function prepareVoice(blob: Blob): Promise<PreparedVoice | string> {
  if (blob.size > MAX_AUDIO_FILE_MB * 1024 * 1024) {
    return `Audio is over ${MAX_AUDIO_FILE_MB} MB.`;
  }
  let buf: AudioBuffer;
  try {
    buf = await audio.ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return 'Could not decode that audio.';
  }
  const mono = new Float32Array(buf.length);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) mono[i] += d[i] / buf.numberOfChannels;
  }
  const pcm = conditionVoice(mono, buf.sampleRate);
  if (!pcm) return 'Too quiet or too short — one clear sound, please.';
  return {
    pcm,
    sampleRate: buf.sampleRate,
    baseFreq: detectPitch(pcm, buf.sampleRate) ?? 220,
    seconds: pcm.length / buf.sampleRate,
  };
}

/** Encode mono Float32 PCM as a canonical 16-bit PCM WAV. */
export function encodeWav16(pcm: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(bytes);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

/* ------------------------------ recording -------------------------------- */

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** Resolves with the captured blob, or an error string. */
  async start(onDone: (blob: Blob) => void): Promise<string | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      this.recorder = new MediaRecorder(stream);
      this.recorder.ondataavailable = (e) => chunks.push(e.data);
      this.recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        onDone(new Blob(chunks));
      };
      this.recorder.start();
      // hard cap a little over the usable length
      setTimeout(() => this.stop(), (MAX_VOICE_SECONDS + 0.5) * 1000);
      return null;
    } catch {
      return 'Microphone unavailable — upload an audio file instead.';
    }
  }

  stop(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  dispose(): void {
    this.stop();
  }
}

/* ------------------------------- preview --------------------------------- */

/** Three-note arpeggio with an unsaved draft voice (C4–E4–G4). */
export function playDraftRiff(voice: PreparedVoice): void {
  const ctx = audio.ctx;
  const buffer = ctx.createBuffer(1, voice.pcm.length, voice.sampleRate);
  buffer.getChannelData(0).set(voice.pcm);
  [262, 330, 392].forEach((f, i) => {
    let rate = f / voice.baseFreq;
    while (rate > 1.75) rate /= 2;
    while (rate < 0.55) rate *= 2;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = 0.8;
    src.connect(g).connect(audio.sfxBus);
    src.start(ctx.currentTime + i * 0.26);
  });
}

/* ------------------------------ waveform --------------------------------- */

export function drawWaveform(canvas: HTMLCanvasElement, pcm: Float32Array, color: string): void {
  const g = canvas.getContext('2d')!;
  const { width: w, height: hgt } = canvas;
  g.clearRect(0, 0, w, hgt);
  g.fillStyle = color;
  const mid = hgt / 2;
  const cols = Math.min(w, 480);
  const colW = w / cols;
  const step = Math.max(1, Math.floor(pcm.length / cols));
  for (let c = 0; c < cols; c++) {
    let lo = 0;
    let hi = 0;
    const start = c * step;
    for (let i = start; i < Math.min(pcm.length, start + step); i++) {
      if (pcm[i] > hi) hi = pcm[i];
      if (pcm[i] < lo) lo = pcm[i];
    }
    const y0 = mid - hi * mid * 0.92;
    const y1 = mid - lo * mid * 0.92;
    g.fillRect(c * colW, y0, Math.max(1, colW - 1), Math.max(2, y1 - y0));
  }
}
