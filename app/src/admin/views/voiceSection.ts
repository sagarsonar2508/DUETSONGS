/**
 * Voice section of the character detail view.
 *
 * Shows what the character sings with right now — the synthesized species
 * patch or a recorded override — with instant preview, and hosts the
 * replace workflow: record (≤1.5 s) or upload → conditioned exactly like
 * the in-game pet creator → pitch detected → preview arpeggio → saved as
 * <id>.voice.wav + registered in manifest.json.
 */

import { animalRiff } from '../../audio/instruments';
import { audio } from '../../audio/engine';
import { decodeWav, hasVoiceOverride, playOverrideRiff } from '../../audio/voiceOverrides';
import { removeVoice, saveVoice, state, type CharInfo } from '../store';
import { el, esc, download, toast, toastResult, confirmDialog } from '../ui';
import {
  prepareVoice,
  encodeWav16,
  playDraftRiff,
  drawWaveform,
  VoiceRecorder,
  MAX_VOICE_SECONDS,
  type PreparedVoice,
} from '../audioPipeline';
import { patchRegister, freqNote } from './shared';

let draft: { forId: string; voice: PreparedVoice } | null = null;
const recorder = new VoiceRecorder();
let recordingFor: string | null = null;
let rerender: () => void = () => {};

/** cache of decoded saved-voice PCM for waveform display, keyed id@ver */
const savedPcmCache = new Map<string, Float32Array>();

export function onVoiceRerender(fn: () => void): void {
  rerender = fn;
}

export function resetVoiceDraft(): void {
  draft = null;
  recordingFor = null;
  recorder.dispose();
}

function currentVoiceHtml(info: CharInfo): string {
  if (info.voice) {
    return `
      <div class="voice-current">
        <div class="voice-meta">
          <span class="chip chip-good">🎙 Recorded voice</span>
          <span class="voice-fact">${esc(info.voice.file)}</span>
          <span class="voice-fact">base pitch ~${Math.round(info.voice.baseFreq)} Hz (${freqNote(info.voice.baseFreq)})</span>
        </div>
        <canvas class="wave" width="640" height="96" data-ref="saved-wave"></canvas>
        <div class="voice-actions">
          <button class="btn btn-small" data-act="play-current">▶ Play riff</button>
          <button class="btn btn-small btn-ghost" data-act="dl-current">Download WAV</button>
          <button class="btn btn-small btn-ghost btn-danger-text" data-act="remove-voice">Remove — back to synth</button>
        </div>
      </div>`;
  }
  const d = info.def;
  return `
    <div class="voice-current">
      <div class="voice-meta">
        <span class="chip">🎛 Synthesized patch</span>
        <span class="voice-fact">patch <b>${d.patch}</b></span>
        <span class="voice-fact">register ${patchRegister(d.patch)}</span>
        <span class="voice-fact">brightness ${d.bright.toFixed(2)} ${d.bright > 1 ? '(feminine sparkle)' : '(masculine roundness)'}</span>
      </div>
      <div class="voice-actions">
        <button class="btn btn-small" data-act="play-current">▶ Play riff</button>
      </div>
    </div>`;
}

function draftHtml(v: PreparedVoice): string {
  return `
    <div class="voice-draft">
      <div class="voice-meta">
        <span class="chip chip-warn">Unsaved draft</span>
        <span class="voice-fact">${v.seconds.toFixed(2)} s</span>
        <span class="voice-fact">pitch ~${Math.round(v.baseFreq)} Hz (${freqNote(v.baseFreq)})</span>
      </div>
      <canvas class="wave" width="640" height="96" data-ref="draft-wave"></canvas>
      <div class="voice-actions">
        <button class="btn btn-small" data-act="test-draft">▶ Test</button>
        <button class="btn btn-small btn-primary" data-act="save-draft">💾 Save voice</button>
        <button class="btn btn-small btn-ghost" data-act="dl-draft">Download WAV</button>
        <button class="btn btn-small btn-ghost" data-act="discard-draft">✕ Discard</button>
      </div>
    </div>`;
}

export function renderVoiceSection(info: CharInfo): HTMLElement {
  const id = info.def.id;
  if (draft && draft.forId !== id) draft = null;
  const recording = recordingFor === id && recorder.recording;

  const host = el(`
    <section class="card">
      <div class="card-head">
        <h2>🎙 Voice</h2>
        <span class="hint">Recorded voices sing the melody pitch-shifted, never straying past an octave from the sample</span>
      </div>
      ${currentVoiceHtml(info)}
      <div class="voice-replace">
        <div class="voice-replace-title">${info.voice ? 'Replace the recording' : 'Give it a real voice'}</div>
        <div class="voice-actions">
          <button class="btn btn-small ${recording ? 'btn-danger' : ''}" data-act="record">
            ${recording ? '■ Stop' : '● Record'}
          </button>
          <button class="btn btn-small btn-ghost" data-act="upload">Upload audio…</button>
          <input type="file" hidden accept="audio/*" data-ref="audio-file" />
          <span class="hint">one clean note, ≤ ${MAX_VOICE_SECONDS} s used · trimmed & normalized automatically</span>
        </div>
        ${draft ? draftHtml(draft.voice) : ''}
      </div>
    </section>`);

  bind(host, info);
  drawWaves(host, info);
  return host;
}

function drawWaves(host: HTMLElement, info: CharInfo): void {
  const draftWave = host.querySelector('[data-ref="draft-wave"]') as HTMLCanvasElement | null;
  if (draftWave && draft) drawWaveform(draftWave, draft.voice.pcm, '#e75f96');

  const savedWave = host.querySelector('[data-ref="saved-wave"]') as HTMLCanvasElement | null;
  if (savedWave && info.voice) {
    const key = `${info.def.id}@${state.assetVer}`;
    const cached = savedPcmCache.get(key);
    if (cached) {
      drawWaveform(savedWave, cached, '#8d76bd');
    } else {
      void fetch(`/characters/${info.voice.file}?v=${state.assetVer}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((buf) => {
          const wav = decodeWav(buf);
          if (wav && savedWave.isConnected) {
            savedPcmCache.set(key, wav.pcm);
            drawWaveform(savedWave, wav.pcm, '#8d76bd');
          }
        })
        .catch(() => {
          /* file missing — manifest points nowhere; leave the canvas blank */
        });
    }
  }
}

function bind(host: HTMLElement, info: CharInfo): void {
  const id = info.def.id;

  host.querySelector('[data-act="play-current"]')?.addEventListener('click', () => {
    audio.ensure();
    if (info.voice) {
      if (hasVoiceOverride(id)) playOverrideRiff(id);
      else toast('Voice sample still loading — try again in a second.', false);
    } else {
      animalRiff(info.def.patch, info.def.bright, info.def.pitchOffset);
    }
  });

  host.querySelector('[data-act="dl-current"]')?.addEventListener('click', () => {
    if (info.voice) {
      void fetch(`/characters/${info.voice.file}?v=${state.assetVer}`)
        .then((r) => r.blob())
        .then((b) => download(b, info.voice!.file));
    }
  });

  host.querySelector('[data-act="remove-voice"]')?.addEventListener('click', () => {
    void confirmDialog({
      title: 'Remove the recorded voice?',
      body: `<b>${esc(info.def.name)}</b> will sing with the synthesized <b>${info.def.patch}</b> patch again. The WAV file is deleted.`,
      confirmLabel: 'Remove voice',
      danger: true,
    }).then((ok) => {
      if (ok) void removeVoice(id).then((err) => toastResult(err, 'Voice removed — synth patch restored.'));
    });
  });

  host.querySelector('[data-act="record"]')!.addEventListener('click', () => {
    audio.ensure();
    if (recorder.recording) {
      recorder.stop();
      return;
    }
    recordingFor = id;
    void recorder
      .start((blob) => {
        recordingFor = null;
        void acceptBlob(id, blob);
      })
      .then((err) => {
        if (err) {
          recordingFor = null;
          toast(err, false);
        }
        rerender();
      });
  });

  const fileInput = host.querySelector('[data-ref="audio-file"]') as HTMLInputElement;
  host.querySelector('[data-act="upload"]')!.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) void acceptBlob(id, fileInput.files[0]);
  });

  host.querySelector('[data-act="test-draft"]')?.addEventListener('click', () => {
    if (draft) playDraftRiff(draft.voice);
  });
  host.querySelector('[data-act="save-draft"]')?.addEventListener('click', () => {
    if (!draft) return;
    const { voice } = draft;
    const wav = encodeWav16(voice.pcm, voice.sampleRate);
    void saveVoice(id, wav, voice.baseFreq).then((err) => {
      if (!err) draft = null;
      toastResult(err, `Saved ${id}.voice.wav — this character now sings for real.`);
    });
  });
  host.querySelector('[data-act="dl-draft"]')?.addEventListener('click', () => {
    if (draft) download(encodeWav16(draft.voice.pcm, draft.voice.sampleRate), `${id}.voice.wav`);
  });
  host.querySelector('[data-act="discard-draft"]')?.addEventListener('click', () => {
    draft = null;
    rerender();
  });
}

async function acceptBlob(id: string, blob: Blob): Promise<void> {
  const res = await prepareVoice(blob);
  if (typeof res === 'string') {
    toast(res, false);
  } else {
    draft = { forId: id, voice: res };
  }
  rerender();
}
