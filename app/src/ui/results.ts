/**
 * End-of-song results overlay: animated stars, score tally, coins earned,
 * 2-player breakdown, endless loop count, daily bonus, fresh achievements,
 * a shareable result card, and (when the local backend is running) the
 * leaderboard for this song.
 */

import type { GameResult } from '../game/gameplay';
import type { SongDef } from '../data/songs';
import { save } from '../core/storage';
import { branding } from '../core/content';
import { animalById } from '../data/animals';
import { drawAnimal } from '../game/art';
import { uiSound } from '../audio/instruments';
import { submitScore, topScores } from '../net/leaderboard';
import { starRow } from './components';

export function showResults(
  host: HTMLElement,
  song: SongDef,
  r: GameResult,
  handlers: { onRetry: () => void; onDone: () => void },
): void {
  const acc = Math.round(r.accuracy * 100);
  const heading =
    r.loops !== undefined
      ? `${r.loops} loop${r.loops === 1 ? '' : 's'}!`
      : r.cleared
        ? 'Song Complete!'
        : 'Nice Try!';

  const twoP = r.twoP
    ? `
      <div class="twop-row">
        <div class="twop-side p1">P1 · ${r.twoP.caught[0]} caught · ${r.twoP.perfect[0]} perfect</div>
        <div class="twop-vs">${
          r.twoP.caught[0] === r.twoP.caught[1] ? '🤝' : r.twoP.caught[0] > r.twoP.caught[1] ? '🏆◀' : '▶🏆'
        }</div>
        <div class="twop-side p2">P2 · ${r.twoP.caught[1]} caught · ${r.twoP.perfect[1]} perfect</div>
      </div>`
    : '';

  const bonuses = [
    r.dailyBonus ? `<div class="bonus-line">🗓 Daily challenge bonus <b>+${r.dailyBonus}</b></div>` : '',
    ...(r.awards ?? []).map(
      (a) => `<div class="bonus-line">🏆 ${escapeHtml(a.name)} <b>+${a.reward}</b></div>`,
    ),
  ].join('');

  host.innerHTML = `
    <div class="overlay results-overlay">
      <div class="panel results-panel">
        <div class="results-heading">${heading}</div>
        <div class="panel-song">${escapeHtml(song.title)}</div>
        ${r.loops !== undefined ? '' : starRow(r.stars, 3, 'stars-big stars-animated')}
        <div class="results-score">${r.score.toLocaleString()}</div>
        ${r.newBest ? '<div class="best-badge">New Best!</div>' : ''}
        ${twoP}
        <div class="results-grid">
          <div class="stat"><div class="stat-num">${acc}%</div><div class="stat-label">Accuracy</div></div>
          <div class="stat"><div class="stat-num">${r.maxCombo}</div><div class="stat-label">Max combo</div></div>
          <div class="stat"><div class="stat-num">${r.perfect}</div><div class="stat-label">Perfect</div></div>
          <div class="stat"><div class="stat-num coin-earn"><span class="coin-ico">●</span>+${r.coins}</div><div class="stat-label">Coins</div></div>
        </div>
        ${bonuses}
        <div class="lb-section" hidden>
          <div class="lb-title">Local Leaderboard</div>
          <div class="lb-list"></div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-act="retry">Play again</button>
          <button class="btn" data-act="share">📤 Share</button>
          <button class="btn" data-act="done">Songs</button>
        </div>
      </div>
    </div>`;

  if (r.stars > 0 || (r.loops ?? 0) > 0) {
    setTimeout(() => uiSound('star'), 300);
  }

  host.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      uiSound('tap');
      const act = (b as HTMLElement).dataset.act;
      if (act === 'retry') handlers.onRetry();
      else if (act === 'share') void shareCard(song, r);
      else handlers.onDone();
    }),
  );

  // Leaderboard (only if enabled in settings and the local backend answers).
  if (save.settings.leaderboard && r.cleared) {
    void (async () => {
      const name = save.settings.name.trim() || 'Player';
      await submitScore(song.id, {
        name,
        score: r.score,
        accuracy: r.accuracy,
        maxCombo: r.maxCombo,
      });
      const top = await topScores(song.id);
      if (!top) return;
      const section = host.querySelector('.lb-section') as HTMLElement | null;
      const list = host.querySelector('.lb-list');
      if (!section || !list) return;
      section.hidden = false;
      list.innerHTML = top.scores
        .slice(0, 5)
        .map(
          (e, i) => `
          <div class="lb-row ${e.name === name && e.score === r.score ? 'me' : ''}">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-name">${escapeHtml(e.name)}</span>
            <span class="lb-score">${e.score.toLocaleString()}</span>
          </div>`,
        )
        .join('');
    })();
  }
}

/* -------------------------------- share card ------------------------------ */

/**
 * Render a 1080×1350 result card (characters, song, score, stars) and hand
 * it to the system share sheet — falls back to a plain download where the
 * Web Share API can't take files.
 */
async function shareCard(song: SongDef, r: GameResult): Promise<void> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, song.theme.top);
  grad.addColorStop(1, song.theme.bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = 0.25;
  g.fillStyle = '#ffffff';
  for (const [x, y, rad] of [[0.15, 0.14, 0.09], [0.87, 0.1, 0.06], [0.9, 0.55, 0.1], [0.08, 0.6, 0.07]]) {
    g.beginPath();
    g.arc(x * W, y * H, rad * W, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  const font = (w: number, px: number) => `${w} ${px}px 'Baloo 2', 'Arial Rounded MT Bold', system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = '#5a4668';
  g.font = font(800, 64);
  g.fillText(`⭐ ${branding.title}`, W / 2, 120);

  g.font = font(800, 76);
  g.fillStyle = '#43364e';
  g.fillText(song.title, W / 2, 250);

  // the duet
  const size = 380;
  drawAnimal(g, animalById(save.left), W * 0.32, 560, size, { t: 0.4, squash: 0, sing: 1, dir: 0 });
  drawAnimal(g, animalById(save.right), W * 0.68, 560, size, { t: 1.1, squash: 0, sing: 1, dir: 0 });

  // stars / loops
  g.font = font(800, 90);
  if (r.loops !== undefined) {
    g.fillStyle = '#e75f96';
    g.fillText(`∞ ${r.loops} loops`, W / 2, 870);
  } else {
    const stars = '★★★'.slice(0, r.stars) || '☆';
    g.fillStyle = '#f5a623';
    g.fillText(stars, W / 2, 870);
  }

  g.font = font(800, 120);
  g.fillStyle = '#43364e';
  g.fillText(r.score.toLocaleString(), W / 2, 1010);

  g.font = font(700, 46);
  g.fillStyle = 'rgba(67,54,78,0.75)';
  g.fillText(
    `${Math.round(r.accuracy * 100)}% accuracy · ${r.maxCombo} combo${r.twoP ? ' · 2P duet' : ''}`,
    W / 2,
    1090,
  );

  g.font = font(700, 40);
  g.fillStyle = 'rgba(67,54,78,0.6)';
  g.fillText('catch the beat · sing the song', W / 2, 1270);

  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], 'duet-stars-result.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: branding.title });
      return;
    }
  } catch {
    /* user cancelled or share unsupported — fall through to download */
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'duet-stars-result.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
