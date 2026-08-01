/**
 * Character collection v2 — species couples (male & female), voice test on
 * tap, and side assignment.
 */

import { router } from '../core/router';
import {
  save,
  persist,
  addCoins,
  isSpeciesUnlocked,
  unlockSpecies,
} from '../core/storage';
import { ANIMALS, animalById, speciesCost, type PatchId } from '../data/animals';
import { drawAnimal } from '../game/art';
import { uiSound, animalRiff } from '../audio/instruments';
import { hasVoiceOverride, playOverrideRiff } from '../audio/voiceOverrides';
import { audio } from '../audio/engine';
import {
  listCustomChars,
  isCustomChar,
  playCustomRiff,
  createCustomChar,
  deleteCustomChar,
  conditionVoice,
  detectPitch,
  CUSTOM_CHAR_COST,
  MAX_VOICE_SECONDS,
  MAX_AUDIO_FILE_MB,
  MAX_IMAGE_FILE_MB,
  MAX_CUSTOM_CHARS,
} from '../core/customChars';
import { topbar, modal, toast, refreshCoins } from './components';

export function renderAnimals(root: HTMLElement): () => void {
  let activeSlot: 0 | 1 = 0;
  let raf = 0;

  const cards = ANIMALS.map((a) => {
    const unlocked = isSpeciesUnlocked(a.species);
    return `
      <div class="animal-card ${unlocked ? '' : 'locked'}" data-id="${a.id}">
        <span class="sex-tag ${a.sex}">${a.sex === 'm' ? '♂' : '♀'}</span>
        <canvas class="animal-preview" width="10" height="10"></canvas>
        <div class="animal-name">${a.name}</div>
        <div class="animal-species">${a.speciesName}</div>
        ${
          unlocked
            ? `<div class="animal-badges" data-id="${a.id}"></div>`
            : `<div class="animal-cost"><span class="coin-ico">●</span> ${speciesCost(a.species)} <small>· couple</small></div>`
        }
      </div>`;
  }).join('');

  const customCards = listCustomChars()
    .map(
      (m) => `
      <div class="animal-card custom-card" data-id="${m.id}">
        <span class="sex-tag star">★</span>
        <button class="del-btn" data-id="${m.id}" aria-label="Delete">🗑</button>
        <canvas class="animal-preview" width="10" height="10"></canvas>
        <div class="animal-name">${escapeHtml(m.name)}</div>
        <div class="animal-species">Your Star</div>
        <div class="animal-badges" data-id="${m.id}"></div>
      </div>`,
    )
    .join('');

  const creatorCard =
    listCustomChars().length < MAX_CUSTOM_CHARS
      ? `<div class="animal-card creator-card" id="createChar">
          <div class="creator-plus">＋</div>
          <div class="animal-name">Create your own</div>
          <div class="animal-species">photo + your voice</div>
          <div class="animal-cost"><span class="coin-ico">●</span> ${CUSTOM_CHAR_COST}</div>
        </div>`
      : '';

  root.innerHTML = `
    <div class="screen">
      ${topbar('Stars', { back: true })}
      <div class="slot-picker">
        <button class="slot-btn active" data-slot="0">◀ Left: <b class="slot-name-0"></b></button>
        <button class="slot-btn" data-slot="1">Right: <b class="slot-name-1"></b> ▶</button>
      </div>
      <div class="slot-hint">Tap a character to hear their voice & assign the selected side</div>
      <div class="animal-grid">${cards}${customCards}${creatorCard}</div>
    </div>`;

  root.querySelector('.back-btn')!.addEventListener('click', () => {
    uiSound('tap');
    router.go('home');
  });

  const refreshSlots = (): void => {
    (root.querySelector('.slot-name-0') as HTMLElement).textContent =
      animalById(save.left).name;
    (root.querySelector('.slot-name-1') as HTMLElement).textContent =
      animalById(save.right).name;
    root.querySelectorAll('.animal-badges').forEach((el) => {
      const id = (el as HTMLElement).dataset.id;
      let html = '';
      if (save.left === id) html += '<span class="badge">Left</span>';
      if (save.right === id) html += '<span class="badge badge-r">Right</span>';
      (el as HTMLElement).innerHTML = html;
    });
  };
  refreshSlots();

  root.querySelectorAll('.slot-btn').forEach((b) =>
    b.addEventListener('click', () => {
      uiSound('tap');
      activeSlot = Number((b as HTMLElement).dataset.slot) as 0 | 1;
      root.querySelectorAll('.slot-btn').forEach((x) =>
        x.classList.toggle('active', x === b),
      );
    }),
  );

  document.getElementById('createChar')?.addEventListener('click', () => {
    uiSound('tap');
    openCreator();
  });

  root.querySelectorAll('.del-btn').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (b as HTMLElement).dataset.id!;
      modal({
        title: 'Delete this star?',
        body: 'Their photo and voice will be removed from this device.',
        actions: [
          {
            label: 'Delete',
            kind: 'primary',
            onClick: () => {
              void deleteCustomChar(id).then(() => router.go('animals'));
            },
          },
          { label: 'Keep', kind: 'ghost' },
        ],
      });
    }),
  );

  root.querySelectorAll('.animal-card').forEach((card) =>
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (!id) return;
      if (isCustomChar(id)) {
        playCustomRiff(id);
        if (activeSlot === 0) {
          if (save.right === id) save.right = save.left;
          save.left = id;
        } else {
          if (save.left === id) save.left = save.right;
          save.right = id;
        }
        persist();
        refreshSlots();
        return;
      }
      const def = animalById(id);
      if (isSpeciesUnlocked(def.species)) {
        if (hasVoiceOverride(id)) playOverrideRiff(id);
        else animalRiff(def.patch, def.bright, def.pitchOffset);
        if (activeSlot === 0) {
          if (save.right === id) save.right = save.left;
          save.left = id;
        } else {
          if (save.left === id) save.left = save.right;
          save.right = id;
        }
        persist();
        refreshSlots();
        return;
      }
      uiSound('tap');
      const cost = speciesCost(def.species);
      if (save.coins < cost) {
        toast(`Need ${cost - save.coins} more coins for the ${def.speciesName} couple!`);
        return;
      }
      const family = ANIMALS.filter((a) => a.species === def.species);
      modal({
        title: `Adopt ${family.map((a) => a.name).join(' & ')}?`,
        body: `<div class="unlock-blurb">${def.blurb}</div><div class="unlock-cost"><span class="coin-ico">●</span> ${cost}</div>`,
        actions: [
          {
            label: 'Adopt couple',
            kind: 'primary',
            onClick: () => {
              addCoins(-cost);
              unlockSpecies(def.species);
              uiSound('buy');
              if (hasVoiceOverride(def.id)) playOverrideRiff(def.id);
              else animalRiff(def.patch, def.bright, def.pitchOffset);
              refreshCoins();
              router.go('animals');
            },
          },
          { label: 'Not yet', kind: 'ghost' },
        ],
      });
    }),
  );

  /* --------------------------- create-your-own --------------------------- */

  function openCreator(): void {
    let photoBlob: Blob | null = null;
    let photoSingBlob: Blob | null = null;
    let voicePcm: Float32Array | null = null;
    let voiceRate = 44100;
    let baseFreq = 220;
    let chosenPatch: PatchId | '' = '';
    let recorder: MediaRecorder | null = null;

    const host = document.createElement('div');
    host.className = 'overlay overlay-fade';
    host.innerHTML = `
      <div class="panel creator-panel">
        <h2>Create your Star</h2>
        <div class="creator-note">Your photo & voice stay on this device only.</div>
        <input type="text" class="creator-name" maxlength="14" placeholder="Star's name" />
        <div class="creator-row">
          <div class="creator-box" data-k="photo">
            <div class="creator-box-title">📷 Normal</div>
            <img class="creator-photo" hidden />
            <div class="creator-box-hint">mouth closed · PNG/JPG ≤${MAX_IMAGE_FILE_MB}MB<br/>white or clear background</div>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden class="photo-input"/>
          </div>
          <div class="creator-box" data-k="photo-sing">
            <div class="creator-box-title">🎤 Singing</div>
            <img class="creator-photo" hidden />
            <div class="creator-box-hint">mouth open, same angle!<br/><b>optional</b> — reuses Normal</div>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden class="photo-sing-input"/>
          </div>
        </div>
        <div class="creator-row">
          <div class="creator-box" data-k="voice">
            <div class="creator-box-title">🎙 Voice</div>
            <div class="voice-status">no sound yet</div>
            <div class="creator-box-hint">max ${MAX_VOICE_SECONDS}s · one clean note<br/>(a meow, a woof, your voice…)</div>
            <button class="btn-mini rec-btn">● Record</button>
            <button class="btn-mini upl-btn">Upload</button>
            <input type="file" accept="audio/*" hidden class="audio-input"/>
            <div class="voice-or">— or pick a voice —</div>
            <select class="patch-pick">
              <option value="">choose…</option>
              <option value="meow">🐱 Meow</option>
              <option value="chirp">🐤 Chirp</option>
              <option value="bark">🐶 Bark</option>
              <option value="croak">🐸 Croak</option>
              <option value="hoot">🦉 Hoot</option>
              <option value="quack">🦆 Quack</option>
              <option value="yip">🦊 Yip</option>
              <option value="grunt">🐼 Grunt</option>
              <option value="beep">🤖 Beep</option>
              <option value="boo">👻 Boo</option>
              <option value="roar">🐲 Roar</option>
              <option value="twinkle">⭐ Twinkle</option>
            </select>
          </div>
        </div>
        <div class="creator-status"></div>
        <div class="panel-actions">
          <button class="btn" data-act="test" disabled>▶ Test voice</button>
          <button class="btn btn-primary" data-act="create" disabled>Create · <span class="coin-ico">●</span> ${CUSTOM_CHAR_COST}</button>
          <button class="btn btn-ghost" data-act="close">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(host);

    const q = <T extends HTMLElement>(sel: string) => host.querySelector(sel) as T;
    const setStatus = (msg: string, ok = true): void => {
      q('.creator-status').textContent = msg;
      q<HTMLElement>('.creator-status').style.color = ok ? '#2e9e5b' : '#c0392b';
    };
    const hasVoice = (): boolean => !!voicePcm || chosenPatch !== '';
    const refreshButtons = (): void => {
      (q('[data-act="test"]') as HTMLButtonElement).disabled = !hasVoice();
      (q('[data-act="create"]') as HTMLButtonElement).disabled = !(photoBlob && hasVoice());
    };
    const close = (): void => {
      recorder?.stream.getTracks().forEach((t) => t.stop());
      host.remove();
    };
    host.addEventListener('click', (e) => {
      if (e.target === host) close();
    });
    q('[data-act="close"]').addEventListener('click', close);

    // ---- photos (normal + optional singing frame) ----
    const photoInput = q<HTMLInputElement>('.photo-input');
    q('[data-k="photo"]').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
      const f = photoInput.files?.[0];
      if (f) void handlePhoto(f, 'photo');
    });
    const photoSingInput = q<HTMLInputElement>('.photo-sing-input');
    q('[data-k="photo-sing"]').addEventListener('click', () => photoSingInput.click());
    photoSingInput.addEventListener('change', () => {
      const f = photoSingInput.files?.[0];
      if (f) void handlePhoto(f, 'photo-sing');
    });

    async function handlePhoto(f: File, kind: 'photo' | 'photo-sing'): Promise<void> {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
        setStatus('Photo rejected: PNG/JPG/WebP only (no SVG).', false);
        return;
      }
      if (f.size > MAX_IMAGE_FILE_MB * 1024 * 1024) {
        setStatus(`Photo rejected: over ${MAX_IMAGE_FILE_MB} MB.`, false);
        return;
      }
      let bmp: ImageBitmap;
      try {
        bmp = await createImageBitmap(f);
      } catch {
        setStatus('Could not read that image.', false);
        return;
      }
      // sanitize: cap → corner-key background → trim → 512 standard frame
      const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * k);
      const h = Math.round(bmp.height * k);
      const work = document.createElement('canvas');
      work.width = w;
      work.height = h;
      const wg = work.getContext('2d', { willReadFrequently: true })!;
      wg.drawImage(bmp, 0, 0, w, h);
      const data = wg.getImageData(0, 0, w, h);
      keyBackground(data, w, h, 34);
      wg.putImageData(data, 0, 0);
      const b = alphaBounds(data, w, h);
      if (!b) {
        setStatus('Image vanished after background removal — try a clearer photo.', false);
        return;
      }
      const out = document.createElement('canvas');
      out.width = 512;
      out.height = 512;
      const og = out.getContext('2d')!;
      const tw = b.x1 - b.x0 + 1;
      const th = b.y1 - b.y0 + 1;
      const s = Math.min((0.83 * 512) / th, (0.88 * 512) / tw);
      og.drawImage(work, b.x0, b.y0, tw, th, (512 - tw * s) / 2, 0.92 * 512 - th * s, tw * s, th * s);
      const blob = await new Promise<Blob>((res) => out.toBlob((x) => res(x!), 'image/png'));
      if (kind === 'photo') photoBlob = blob;
      else photoSingBlob = blob;
      const img = q<HTMLImageElement>(`[data-k="${kind}"] .creator-photo`);
      img.src = out.toDataURL('image/png');
      img.hidden = false;
      setStatus(
        `${kind === 'photo' ? 'Normal' : 'Singing'} photo sanitized ✓ (metadata stripped, background keyed, framed)`,
      );
      refreshButtons();
    }

    // ---- voice: mic ----
    q('.rec-btn').addEventListener('click', () => {
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        return;
      }
      void startRecording();
    });

    async function startRecording(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks: Blob[] = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          q('.rec-btn').textContent = '● Record';
          void handleAudioBlob(new Blob(chunks));
        };
        recorder.start();
        q('.rec-btn').textContent = '■ Stop';
        q('.voice-status').textContent = 'recording…';
        setTimeout(() => {
          if (recorder && recorder.state === 'recording') recorder.stop();
        }, (MAX_VOICE_SECONDS + 0.3) * 1000);
      } catch {
        setStatus('Microphone unavailable — upload an audio file instead.', false);
      }
    }

    // ---- voice: file ----
    const audioInput = q<HTMLInputElement>('.audio-input');
    q('.upl-btn').addEventListener('click', () => audioInput.click());
    audioInput.addEventListener('change', () => {
      const f = audioInput.files?.[0];
      if (!f) return;
      if (f.size > MAX_AUDIO_FILE_MB * 1024 * 1024) {
        setStatus(`Audio rejected: over ${MAX_AUDIO_FILE_MB} MB.`, false);
        return;
      }
      void handleAudioBlob(f);
    });

    // ---- voice: built-in patch ----
    const patchPick = q<HTMLSelectElement>('.patch-pick');
    patchPick.addEventListener('change', () => {
      chosenPatch = patchPick.value as PatchId | '';
      if (chosenPatch) {
        voicePcm = null; // built-in voice replaces any recording
        q('.voice-status').textContent = `✓ built-in ${chosenPatch} voice`;
        setStatus('Built-in voice selected — tap Test to hear it.');
        animalRiff(chosenPatch, 1.1, 0);
      } else {
        q('.voice-status').textContent = 'no sound yet';
      }
      refreshButtons();
    });

    async function handleAudioBlob(blob: Blob): Promise<void> {
      try {
        const buf = await audio.ctx.decodeAudioData(await blob.arrayBuffer());
        // mono mixdown
        const mono = new Float32Array(buf.length);
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < d.length; i++) mono[i] += d[i] / buf.numberOfChannels;
        }
        const conditioned = conditionVoice(mono, buf.sampleRate);
        if (!conditioned) {
          setStatus('Too quiet or too short — record one clear sound.', false);
          return;
        }
        voicePcm = conditioned;
        chosenPatch = '';
        q<HTMLSelectElement>('.patch-pick').value = '';
        voiceRate = buf.sampleRate;
        baseFreq = detectPitch(conditioned, buf.sampleRate) ?? 220;
        q('.voice-status').textContent =
          `✓ ${(conditioned.length / buf.sampleRate).toFixed(2)}s · pitch ~${Math.round(baseFreq)} Hz`;
        setStatus('Voice conditioned ✓ (trimmed, normalized, pitch detected)');
        refreshButtons();
      } catch {
        setStatus('Could not decode that audio.', false);
      }
    }

    // ---- test ----
    q('[data-act="test"]').addEventListener('click', () => {
      if (!voicePcm) {
        if (chosenPatch) animalRiff(chosenPatch, 1.1, 0);
        return;
      }
      const ctx = audio.ctx;
      const buffer = ctx.createBuffer(1, voicePcm.length, voiceRate);
      buffer.getChannelData(0).set(voicePcm);
      [262, 330, 392].forEach((f, i) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = Math.min(4, Math.max(0.25, f / baseFreq));
        const g = ctx.createGain();
        g.gain.value = 0.75;
        src.connect(g).connect(audio.sfxBus);
        src.start(ctx.currentTime + i * 0.28);
      });
    });

    // ---- create ----
    q('[data-act="create"]').addEventListener('click', () => {
      const name = q<HTMLInputElement>('.creator-name').value.trim() || 'My Star';
      if (!photoBlob || !hasVoice()) return;
      if (save.coins < CUSTOM_CHAR_COST) {
        toast(`Need ${CUSTOM_CHAR_COST - save.coins} more coins!`);
        return;
      }
      addCoins(-CUSTOM_CHAR_COST);
      uiSound('buy');
      const voice = voicePcm
        ? { pcm: voicePcm, sampleRate: voiceRate, baseFreq }
        : { patch: chosenPatch as PatchId };
      void createCustomChar(name, photoBlob, photoSingBlob, voice).then((meta) => {
        if (activeSlot === 0) save.left = meta.id;
        else save.right = meta.id;
        persist();
        refreshCoins();
        close();
        toast(`${name} joined the duet! ⭐`);
        router.go('animals');
      });
    });
  }

  /* ------------------------------ previews ------------------------------ */

  const previews: { canvas: HTMLCanvasElement; id: string }[] = [];
  root.querySelectorAll('.animal-card').forEach((card) => {
    const canvas = card.querySelector('.animal-preview') as HTMLCanvasElement | null;
    const id = (card as HTMLElement).dataset.id;
    if (canvas && id) previews.push({ canvas, id });
  });
  const loop = () => {
    const t = performance.now() / 1000;
    for (const p of previews) {
      const rect = p.canvas.getBoundingClientRect();
      if (rect.width === 0) continue;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (p.canvas.width !== Math.round(rect.width * dpr)) {
        p.canvas.width = Math.round(rect.width * dpr);
        p.canvas.height = Math.round(rect.height * dpr);
      }
      const g = p.canvas.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, rect.width, rect.height);
      const def = animalById(p.id);
      const locked = !isSpeciesUnlocked(def.species);
      if (locked) g.filter = 'grayscale(0.85) opacity(0.7)';
      drawAnimal(g, def, rect.width / 2, rect.height * 0.52, rect.height * 0.78, {
        t, squash: 0, sing: 0, dir: 0,
      });
      g.filter = 'none';
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(raf);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** flood-fill background keying from the four corners */
function keyBackground(img: ImageData, w: number, h: number, tol: number): void {
  const d = img.data;
  const seeds = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
  if (seeds.every((s) => d[s + 3] < 10)) return; // already transparent
  const r0 = d[0];
  const g0 = d[1];
  const b0 = d[2];
  const visited = new Uint8Array(w * h);
  const stack = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    const dr = d[i] - r0;
    const dg = d[i + 1] - g0;
    const db = d[i + 2] - b0;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > tol) continue;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
}

function alphaBounds(img: ImageData, w: number, h: number) {
  const d = img.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
