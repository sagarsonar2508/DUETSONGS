/**
 * Awards screen: every achievement with live progress and coin rewards.
 */

import { router } from '../core/router';
import { uiSound } from '../audio/instruments';
import { ACHIEVEMENTS, isEarned } from '../core/achievements';
import { save } from '../core/storage';
import { topbar } from './components';

export function renderAwards(root: HTMLElement): () => void {
  const earned = ACHIEVEMENTS.filter((a) => isEarned(a.id)).length;

  const rows = ACHIEVEMENTS.map((a) => {
    const done = isEarned(a.id);
    const [cur, goal] = a.progress();
    const pct = done ? 100 : Math.min(100, Math.round((cur / goal) * 100));
    return `
      <div class="award-row ${done ? 'done' : ''}">
        <div class="award-icon">${a.icon}</div>
        <div class="award-main">
          <div class="award-name">${a.name}</div>
          <div class="award-desc">${a.desc}</div>
          <div class="award-bar"><div class="award-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="award-side">
          ${done ? '<div class="award-check">✓</div>' : `<div class="award-progress">${Math.min(cur, goal)}/${goal}</div>`}
          <div class="award-reward"><span class="coin-ico">●</span> ${a.reward}</div>
        </div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="screen">
      ${topbar('Awards', { back: true })}
      <div class="award-summary">🏆 ${earned}/${ACHIEVEMENTS.length} earned · streak 🔥 ${save.streak.count} day${save.streak.count === 1 ? '' : 's'}</div>
      <div class="award-list">${rows}</div>
    </div>`;

  root.querySelector('.back-btn')!.addEventListener('click', () => {
    uiSound('tap');
    router.go('home');
  });

  return () => {};
}
