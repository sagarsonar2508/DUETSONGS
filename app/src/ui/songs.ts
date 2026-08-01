/**
 * Song select: cards with difficulty, best stars, unlock costs.
 */

import { router } from '../core/router';
import { save, songProgress, addCoins, persist } from '../core/storage';
import { SONGS, DIFFICULTY_LABEL } from '../data/songs';
import { uiSound } from '../audio/instruments';
import { topbar, starRow, difficultyDots, modal, toast, refreshCoins } from './components';

export function renderSongs(root: HTMLElement): () => void {
  const cards = SONGS.map((s) => {
    const p = songProgress(s.id);
    const unlocked = s.cost === 0 || p.unlocked;
    return `
      <button class="song-card ${unlocked ? '' : 'locked'}" data-id="${s.id}"
              style="--card-a:${s.theme.top};--card-b:${s.theme.bottom};--card-accent:${s.theme.accent}">
        <span class="song-poster"><img src="/posters/${s.id}.png" alt="" /></span>
        <div class="song-card-main">
          <div class="song-title">${s.title}</div>
          <div class="song-meta">${s.composer} · ${DIFFICULTY_LABEL[s.difficulty]} ${difficultyDots(s.difficulty)}</div>
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
  }).join('');

  root.innerHTML = `
    <div class="screen">
      ${topbar('Songs', { back: true })}
      <div class="song-list">${cards}</div>
    </div>`;

  root.querySelector('.back-btn')!.addEventListener('click', () => {
    uiSound('tap');
    router.go('home');
  });

  // posters are optional files (public/posters/<songId>.png, installed by
  // the admin studio) — cards without one just keep their gradient
  root.querySelectorAll('.song-poster img').forEach((img) =>
    img.addEventListener('error', () => (img.closest('.song-poster') as HTMLElement).remove()),
  );

  root.querySelectorAll('.song-card').forEach((card) =>
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!;
      const song = SONGS.find((s) => s.id === id)!;
      const p = songProgress(id);
      const unlocked = song.cost === 0 || p.unlocked;
      uiSound('tap');
      if (unlocked) {
        router.play(id);
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
