/**
 * End-of-song results overlay: animated stars, score tally, coins earned,
 * and (when the local backend is running) the leaderboard for this song.
 */

import type { GameResult } from '../game/gameplay';
import type { SongDef } from '../data/songs';
import { save } from '../core/storage';
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
  host.innerHTML = `
    <div class="overlay results-overlay">
      <div class="panel results-panel">
        <div class="results-heading">${r.cleared ? 'Song Complete!' : 'Nice Try!'}</div>
        <div class="panel-song">${song.title}</div>
        ${starRow(r.stars, 3, 'stars-big stars-animated')}
        <div class="results-score">${r.score.toLocaleString()}</div>
        ${r.newBest ? '<div class="best-badge">New Best!</div>' : ''}
        <div class="results-grid">
          <div class="stat"><div class="stat-num">${acc}%</div><div class="stat-label">Accuracy</div></div>
          <div class="stat"><div class="stat-num">${r.maxCombo}</div><div class="stat-label">Max combo</div></div>
          <div class="stat"><div class="stat-num">${r.perfect}</div><div class="stat-label">Perfect</div></div>
          <div class="stat"><div class="stat-num coin-earn"><span class="coin-ico">●</span>+${r.coins}</div><div class="stat-label">Coins</div></div>
        </div>
        <div class="lb-section" hidden>
          <div class="lb-title">Local Leaderboard</div>
          <div class="lb-list"></div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-act="retry">Play again</button>
          <button class="btn" data-act="done">Songs</button>
        </div>
      </div>
    </div>`;

  if (r.stars > 0) {
    setTimeout(() => uiSound('star'), 300);
  }

  host.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      uiSound('tap');
      const act = (b as HTMLElement).dataset.act;
      if (act === 'retry') handlers.onRetry();
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
