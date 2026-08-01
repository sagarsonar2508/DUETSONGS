/**
 * Home screen: animated duo on a stage, big play button, navigation.
 */

import { router } from '../core/router';
import { branding } from '../core/content';
import { save } from '../core/storage';
import { animalById } from '../data/animals';
import { drawAnimal } from '../game/art';
import { uiSound, animalRiff } from '../audio/instruments';
import { hasVoiceOverride, playOverrideRiff } from '../audio/voiceOverrides';
import { coinPill } from './components';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Keep the two-tone logo treatment: first word plain, the rest tinted. */
function titleHtml(title: string): string {
  const [first, ...rest] = title.split(' ');
  return rest.length
    ? `${escapeHtml(first)}<span> ${escapeHtml(rest.join(' '))}</span>`
    : escapeHtml(first);
}

export function renderHome(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="screen home-screen">
      <div class="topbar">
        <div class="topbar-spacer"></div>
        <div class="topbar-title"></div>
        ${coinPill()}
      </div>
      <div class="home-logo">
        <div class="home-logo-paw">🐾</div>
        <h1>${titleHtml(branding.title)}</h1>
        <div class="home-tagline">${escapeHtml(branding.tagline)}</div>
      </div>
      <canvas class="duo-stage" width="10" height="10"></canvas>
      <button class="btn btn-play">▶&nbsp; Play</button>
      <div class="home-nav">
        <button class="nav-card" data-go="songs"><span class="nav-emoji">🎵</span><span>Songs</span></button>
        <button class="nav-card" data-go="animals"><span class="nav-emoji">⭐</span><span>Stars</span></button>
        <button class="nav-card" data-go="settings"><span class="nav-emoji">⚙️</span><span>Settings</span></button>
      </div>
    </div>`;

  const playBtn = root.querySelector('.btn-play')!;
  playBtn.addEventListener('click', () => {
    uiSound('tap');
    router.go('songs');
  });
  root.querySelectorAll('.nav-card').forEach((b) =>
    b.addEventListener('click', () => {
      uiSound('tap');
      router.go((b as HTMLElement).dataset.go as 'songs');
    }),
  );

  // Animated duo preview — tap an animal to hear its voice.
  const canvas = root.querySelector('.duo-stage') as HTMLCanvasElement;
  const g = canvas.getContext('2d')!;
  let raf = 0;
  let sing: [number, number] = [0, 0];
  let lastT = performance.now();

  const size = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return rect;
  };
  let rect = size();

  canvas.addEventListener('click', (e) => {
    const side = e.offsetX < rect.width / 2 ? 0 : 1;
    sing[side] = 1;
    const id = side === 0 ? save.left : save.right;
    void import('../core/customChars').then((m) => {
      if (m.isCustomChar(id)) {
        m.playCustomRiff(id);
      } else if (hasVoiceOverride(id)) {
        playOverrideRiff(id);
      } else {
        const def = animalById(id);
        animalRiff(def.patch, def.bright, def.pitchOffset);
      }
    });
  });

  const loop = () => {
    rect = size();
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, (performance.now() - lastT) / 1000);
    lastT = performance.now();
    sing = [Math.max(0, sing[0] - dt * 1.5), Math.max(0, sing[1] - dt * 1.5)];
    g.clearRect(0, 0, rect.width, rect.height);
    const s = Math.min(150, rect.width * 0.34);
    const y = rect.height * 0.52;
    drawAnimal(g, animalById(save.left), rect.width * 0.28, y, s, {
      t, squash: 0, sing: sing[0], dir: 0,
    });
    drawAnimal(g, animalById(save.right), rect.width * 0.72, y, s, {
      t: t + 0.7, squash: 0, sing: sing[1], dir: 0,
    });
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(raf);
}
