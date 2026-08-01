/**
 * Song select: cards with difficulty, best stars, unlock costs — plus the
 * "play your own song" section: import an audio file, it is transcribed to
 * a chart on-device (original audio discarded) and the stars sing it.
 */

import { router } from '../core/router';
import { save, songProgress, addCoins, persist } from '../core/storage';
import { SONGS, DIFFICULTY_LABEL, buildChart, type SongDef } from '../data/songs';
import {
  listUserSongs,
  isUserSong,
  deleteUserSong,
  addUserSong,
  MAX_USER_SONGS,
  type UserSongRecord,
} from '../core/userSongs';
import type { TranscribeResult } from '../core/transcribe';
import { animalById } from '../data/animals';
import {
  uiSound,
  playPatch,
  fitToRange,
  PATCH_RANGE,
  type VoiceHandle,
} from '../audio/instruments';
import { hasVoiceOverride, playVoiceOverride, voiceOverrideRange } from '../audio/voiceOverrides';
import { isCustomChar, playCustomVoice, customRange } from '../core/customChars';
import { checkAchievements } from '../core/achievements';
import { audio } from '../audio/engine';
import { topbar, starRow, difficultyDots, modal, toast, refreshCoins } from './components';

/** endless mode toggle lives for the session; 2P persists in settings */
let modeEndless = false;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function songCard(s: SongDef, userSong: boolean): string {
  const p = songProgress(s.id);
  const unlocked = s.cost === 0 || p.unlocked;
  return `
    <button class="song-card ${unlocked ? '' : 'locked'}" data-id="${s.id}"
            style="--card-a:${s.theme.top};--card-b:${s.theme.bottom};--card-accent:${s.theme.accent}">
      ${userSong ? `<span class="del-btn song-del" role="button" data-del="${s.id}" aria-label="Delete">🗑</span>` : ''}
      <span class="song-poster">${userSong ? '' : `<img src="/posters/${s.id}.png" alt="" />`}</span>
      <div class="song-card-main">
        <div class="song-title">${escapeHtml(s.title)}</div>
        <div class="song-meta">${escapeHtml(s.composer)} · ${DIFFICULTY_LABEL[s.difficulty]} ${difficultyDots(s.difficulty)}</div>
        ${p.bestScore > 0 ? `<div class="song-best">Best ${p.bestScore.toLocaleString()}</div>` : ''}
      </div>
      <div class="song-card-side">
        ${
          unlocked
            ? starRow(p.stars)
            : `<div class="song-cost"><span class="coin-ico">●</span> ${s.cost}</div><div class="song-lock">🔒</div>`
        }
      </div>
    </button>`;
}

export function renderSongs(root: HTMLElement): () => void {
  const builtinCards = SONGS.filter((s) => !isUserSong(s.id))
    .map((s) => songCard(s, false))
    .join('');
  const userSongs = listUserSongs();
  const userCards = userSongs.map((s) => songCard(s, true)).join('');

  const importCard =
    userSongs.length < MAX_USER_SONGS
      ? `<button class="song-card song-import" id="importSong">
          <span class="song-import-plus">＋</span>
          <div class="song-card-main">
            <div class="song-title">Play your own song</div>
            <div class="song-meta">pick an audio file — the stars learn the melody & sing it</div>
          </div>
        </button>
        <input type="file" id="importFile" accept="audio/*" hidden />`
      : '';

  root.innerHTML = `
    <div class="screen">
      ${topbar('Songs', { back: true })}
      <div class="mode-row">
        <button class="mode-chip ${modeEndless ? '' : 'on'}" data-mode="classic">🎵 Classic</button>
        <button class="mode-chip ${modeEndless ? 'on' : ''}" data-mode="endless">∞ Endless</button>
        <button class="mode-chip twop ${save.settings.twoPlayer ? 'on' : ''}" data-mode="2p">👥 2P</button>
      </div>
      <div class="song-list">
        ${builtinCards}
        <div class="song-section">🎤 Your songs</div>
        ${userCards}
        ${importCard}
      </div>
    </div>`;

  root.querySelector('.back-btn')!.addEventListener('click', () => {
    uiSound('tap');
    router.go('home');
  });

  root.querySelectorAll('.mode-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      uiSound('tap');
      const mode = (chip as HTMLElement).dataset.mode!;
      if (mode === '2p') {
        save.settings.twoPlayer = !save.settings.twoPlayer;
        persist();
        chip.classList.toggle('on', save.settings.twoPlayer);
        toast(save.settings.twoPlayer ? '👥 2-player duet on — one lane each!' : 'Back to single player.');
      } else {
        modeEndless = mode === 'endless';
        root.querySelector('[data-mode="classic"]')!.classList.toggle('on', !modeEndless);
        root.querySelector('[data-mode="endless"]')!.classList.toggle('on', modeEndless);
        if (modeEndless) toast('∞ Endless: the song loops faster and faster — one miss ends the run!');
      }
    }),
  );

  // posters are optional files (public/posters/<songId>.png, installed by
  // the admin studio) — cards without one just keep their gradient
  root.querySelectorAll('.song-poster img').forEach((img) =>
    img.addEventListener('error', () => (img.closest('.song-poster') as HTMLElement).remove()),
  );

  /* ------------------------------ import flow ---------------------------- */

  const fileInput = root.querySelector('#importFile') as HTMLInputElement | null;
  root.querySelector('#importSong')?.addEventListener('click', () => {
    uiSound('tap');
    audio.ensure();
    fileInput?.click();
  });
  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) void importSong(f);
  });

  async function importSong(f: File): Promise<void> {
    const host = document.createElement('div');
    host.className = 'overlay overlay-fade';
    host.innerHTML = `
      <div class="panel import-panel">
        <h2>🎧 Learning your song…</h2>
        <div class="import-name">${escapeHtml(f.name)}</div>
        <div class="import-bar"><div class="import-fill"></div></div>
        <div class="import-stage">reading the file…</div>
        <div class="creator-note">Everything happens on this device. The audio itself is not kept —
        only the melody chart, so your stars can sing it.</div>
      </div>`;
    document.body.appendChild(host);
    const fill = host.querySelector('.import-fill') as HTMLElement;
    const stageEl = host.querySelector('.import-stage') as HTMLElement;
    const STAGES = { decode: 'reading the file…', analyze: 'listening for the melody…', chart: 'writing the chart…' };

    try {
      const { transcribeFile } = await import('../core/transcribe');
      const res = await transcribeFile(f, (stage, pct) => {
        stageEl.textContent = STAGES[stage];
        const base = stage === 'decode' ? 0 : stage === 'analyze' ? 0.1 : 0.9;
        const span = stage === 'decode' ? 0.1 : stage === 'analyze' ? 0.8 : 0.1;
        fill.style.width = `${Math.round((base + span * pct) * 100)}%`;
      });
      host.remove();
      if ('error' in res) {
        toast(res.error);
        return;
      }
      reviewImport(res);
    } catch {
      host.remove();
      toast('Something went wrong while learning that song.');
    }
  }

  /* ------------------------- import review + preview ---------------------- */

  let previewHandles: VoiceHandle[] = [];
  function stopPreview(): void {
    previewHandles.forEach((h) => h.stop());
    previewHandles = [];
  }

  /** Sing the first ~10s of a chart with the current duet — same voices and
   *  per-lane transposition the real game uses. */
  function playPreview(def: SongDef): void {
    stopPreview();
    audio.ensure();
    const chart = buildChart(def);
    const spb = 60 / def.bpm;
    const pair = [animalById(save.left), animalById(save.right)];
    const lanes = ([0, 1] as const).map((lane) => {
      const d = pair[lane];
      const sampled = isCustomChar(d.id) || hasVoiceOverride(d.id);
      let [lo, hi] = isCustomChar(d.id)
        ? customRange(d.id)
        : hasVoiceOverride(d.id)
          ? voiceOverrideRange(d.id)
          : PATCH_RANGE[d.patch];
      if (!sampled && d.bright > 1) {
        lo += 3;
        hi += 3;
      }
      const notes = chart.filter((n) => n.lane === lane);
      const avg = notes.length ? notes.reduce((sum, n) => sum + n.midi, 0) / notes.length : 62;
      return { lo, hi, shift: Math.round(((lo + hi) / 2 - avg) / 12) * 12 };
    });
    const t0 = audio.ctx.currentTime + 0.15;
    for (const n of chart) {
      const start = n.beat * spb;
      if (start > 10) break;
      const L = lanes[n.lane];
      const d = pair[n.lane];
      const midi = fitToRange(n.midi + L.shift, L.lo, L.hi);
      const o = { when: t0 + start, dur: n.dur * spb, vel: 0.9 };
      previewHandles.push(
        isCustomChar(d.id)
          ? playCustomVoice(d.id, midi, o)
          : hasVoiceOverride(d.id)
            ? playVoiceOverride(d.id, midi, o)
            : playPatch(d.patch, midi, { ...o, bright: d.bright }),
      );
    }
  }

  function reviewImport(res: TranscribeResult): void {
    let variant: 'full' | 'easy' = 'full';
    const current = (): UserSongRecord =>
      variant === 'full'
        ? res.record
        : { ...res.record, melody: res.easy.melody, difficulty: 1 };

    const host = document.createElement('div');
    host.className = 'overlay overlay-fade';
    host.innerHTML = `
      <div class="panel import-panel">
        <h2>🎶 ${escapeHtml(res.record.title)}</h2>
        <div class="import-name">${res.record.bpm} bpm · key chords ${res.record.chords.join(' ')}${res.truncated ? ' · first 5 min used' : ''}</div>
        <div class="variant-row">
          <button class="mode-chip on" data-var="full">🎵 Full · ${res.noteCount} notes</button>
          <button class="mode-chip" data-var="easy">🌱 Easy · ${res.easy.noteCount} notes</button>
        </div>
        <div class="creator-note">Preview sings the first bars with your current duet. The original
        audio is not kept — only this chart.</div>
        <div class="panel-actions">
          <button class="btn" data-act="preview">▶ Preview</button>
          <button class="btn btn-primary" data-act="save">💾 Save song</button>
          <button class="btn btn-ghost" data-act="discard">Discard</button>
        </div>
      </div>`;
    document.body.appendChild(host);

    host.querySelectorAll('[data-var]').forEach((chip) =>
      chip.addEventListener('click', () => {
        uiSound('tap');
        variant = (chip as HTMLElement).dataset.var as 'full' | 'easy';
        host.querySelectorAll('[data-var]').forEach((c) =>
          c.classList.toggle('on', c === chip),
        );
        stopPreview();
      }),
    );
    host.querySelector('[data-act="preview"]')!.addEventListener('click', () => {
      uiSound('tap');
      playPreview(current());
    });
    host.querySelector('[data-act="discard"]')!.addEventListener('click', () => {
      stopPreview();
      host.remove();
    });
    host.querySelector('[data-act="save"]')!.addEventListener('click', () => {
      stopPreview();
      void addUserSong(current()).then(() => {
        save.stats.imported += 1;
        persist();
        uiSound('star');
        toast(`“${res.record.title}” is ready! 🎤`);
        for (const a of checkAchievements()) toast(`🏆 ${a.name} +${a.reward}`);
        host.remove();
        router.go('songs');
      });
    });
  }

  /* ------------------------------- deletion ------------------------------ */

  root.querySelectorAll('.song-del').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (b as HTMLElement).dataset.del!;
      modal({
        title: 'Remove this song?',
        body: 'Its chart and best score are removed from this device.',
        actions: [
          {
            label: 'Remove',
            kind: 'primary',
            onClick: () => {
              void deleteUserSong(id).then(() => router.go('songs'));
            },
          },
          { label: 'Keep', kind: 'ghost' },
        ],
      });
    }),
  );

  /* ----------------------------- play / unlock --------------------------- */

  root.querySelectorAll('.song-card:not(.song-import)').forEach((card) =>
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!;
      const song = SONGS.find((s) => s.id === id)!;
      const p = songProgress(id);
      const unlocked = song.cost === 0 || p.unlocked;
      uiSound('tap');
      if (unlocked) {
        router.play(id, modeEndless ? { mode: 'endless' } : {});
        return;
      }
      if (save.coins < song.cost) {
        toast(`Need ${song.cost - save.coins} more coins — play songs to earn!`);
        return;
      }
      modal({
        title: `Unlock “${song.title}”?`,
        body: `<div class="unlock-cost"><span class="coin-ico">●</span> ${song.cost}</div>`,
        actions: [
          {
            label: 'Unlock',
            kind: 'primary',
            onClick: () => {
              addCoins(-song.cost);
              p.unlocked = true;
              persist();
              uiSound('buy');
              refreshCoins();
              router.go('songs');
            },
          },
          { label: 'Not yet', kind: 'ghost' },
        ],
      });
    }),
  );

  return () => {};
}
