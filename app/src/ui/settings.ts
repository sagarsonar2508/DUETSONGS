/**
 * Settings: volumes, player name, local leaderboard toggle, haptics, reset.
 */

import { router } from '../core/router';
import { save, persist, resetProgress, unlockEverything } from '../core/storage';
import { SPECIES, OUTFITS } from '../data/animals';
import { SONGS } from '../data/songs';
import { audio } from '../audio/engine';
import { uiSound } from '../audio/instruments';
import { topbar, modal, toast, refreshCoins } from './components';

export function renderSettings(root: HTMLElement): () => void {
  const s = save.settings;
  root.innerHTML = `
    <div class="screen">
      ${topbar('Settings', { back: true })}
      <div class="settings-list">
        <label class="setting-row">
          <span>Music volume</span>
          <input type="range" min="0" max="1" step="0.05" value="${s.musicVol}" data-k="musicVol" />
        </label>
        <label class="setting-row">
          <span>Animal voices</span>
          <input type="range" min="0" max="1" step="0.05" value="${s.sfxVol}" data-k="sfxVol" />
        </label>
        <label class="setting-row">
          <span>Haptics</span>
          <input type="checkbox" class="switch" ${s.haptics ? 'checked' : ''} data-k="haptics" />
        </label>
        <div class="setting-divider"></div>
        <label class="setting-row">
          <span>Player name</span>
          <input type="text" maxlength="16" placeholder="Player" value="${escapeAttr(s.name)}" data-k="name" />
        </label>
        <label class="setting-row">
          <span>Local leaderboard<br/><small>needs the local backend running</small></span>
          <input type="checkbox" class="switch" ${s.leaderboard ? 'checked' : ''} data-k="leaderboard" />
        </label>
        <div class="setting-divider"></div>
        <button class="btn" data-act="unlockall">🧪 Test mode: unlock everything</button>
        <button class="btn btn-ghost btn-danger" data-act="reset">Reset all progress</button>
        <div class="settings-footer">Animal Duet · everything stays on this device 🐾</div>
      </div>
    </div>`;

  root.querySelector('.back-btn')!.addEventListener('click', () => {
    uiSound('tap');
    router.go('home');
  });

  root.querySelectorAll('input').forEach((input) =>
    input.addEventListener('change', () => {
      const k = input.dataset.k;
      if (input.type === 'range' && (k === 'musicVol' || k === 'sfxVol')) {
        s[k] = parseFloat(input.value);
        audio.applyVolumes();
        uiSound('tap');
      } else if (input.type === 'checkbox' && (k === 'haptics' || k === 'leaderboard')) {
        s[k] = input.checked;
      } else if (k === 'name') {
        s.name = input.value;
      }
      persist();
    }),
  );

  root.querySelector('[data-act="unlockall"]')!.addEventListener('click', () => {
    unlockEverything(
      SPECIES.map((x) => x.id),
      OUTFITS.map((x) => x.id),
      SONGS.map((x) => x.id),
    );
    uiSound('buy');
    refreshCoins();
    toast('Everything unlocked — 16 characters, all outfits & songs, 99,999 coins');
  });

  root.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
    modal({
      title: 'Reset everything?',
      body: 'Coins, stars, unlocked animals and songs will all be lost.',
      actions: [
        {
          label: 'Reset',
          kind: 'primary',
          onClick: () => {
            resetProgress();
            toast('Progress reset');
            router.go('home');
          },
        },
        { label: 'Cancel', kind: 'ghost' },
      ],
    });
  });

  return () => {};
}

function escapeAttr(v: string): string {
  return v.replace(/"/g, '&quot;');
}
