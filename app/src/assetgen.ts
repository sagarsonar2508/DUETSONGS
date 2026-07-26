/**
 * Dev-only launcher-icon & splash generator. Renders the real in-game
 * characters into the exact canvases Capacitor's asset pipeline expects,
 * and exposes them as data URLs for the export script.
 */

import { animalById } from './data/animals';
import { drawAnimal } from './game/art';

const MILO = animalById('cat-m');
const MIMI = animalById('cat-f');

function bg(g: CanvasRenderingContext2D, size: number, dark: boolean): void {
  const grad = g.createLinearGradient(0, 0, 0, size);
  if (dark) {
    grad.addColorStop(0, '#3a3450');
    grad.addColorStop(1, '#5a4668');
  } else {
    grad.addColorStop(0, '#ffd9ec');
    grad.addColorStop(1, '#c9e9f6');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // soft bokeh
  g.save();
  g.globalAlpha = dark ? 0.06 : 0.28;
  g.fillStyle = '#ffffff';
  for (const [x, y, r] of [
    [0.18, 0.2, 0.1],
    [0.82, 0.16, 0.07],
    [0.9, 0.7, 0.11],
    [0.1, 0.78, 0.08],
  ]) {
    g.beginPath();
    g.arc(x * size, y * size, r * size, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Music notes floating around the pair. */
function notes(g: CanvasRenderingContext2D, size: number, color: string): void {
  g.save();
  g.globalAlpha = 0.55;
  g.fillStyle = color;
  g.strokeStyle = color;
  for (const [x, y, s, rot] of [
    [0.16, 0.3, 0.07, -0.3],
    [0.85, 0.34, 0.055, 0.25],
    [0.75, 0.16, 0.045, 0.1],
  ]) {
    g.save();
    g.translate(x * size, y * size);
    g.rotate(rot);
    const u = s * size;
    g.beginPath();
    g.ellipse(0, u * 0.5, u * 0.32, u * 0.24, -0.3, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = u * 0.15;
    g.beginPath();
    g.moveTo(u * 0.28, u * 0.45);
    g.lineTo(u * 0.28, -u * 0.5);
    g.quadraticCurveTo(u * 0.56, -u * 0.42, u * 0.72, -u * 0.18);
    g.stroke();
    g.restore();
  }
  g.restore();
}

function pair(
  g: CanvasRenderingContext2D,
  size: number,
  scale: number,
  cy: number,
): void {
  const s = size * scale;
  const pose = { t: 0.35, squash: 0, sing: 0, dir: 0 };
  drawAnimal(g, MILO, size * 0.32, size * cy, s, pose);
  drawAnimal(g, MIMI, size * 0.68, size * cy, s, { ...pose, t: 1.1 });
}

function render(): void {
  // ---- icon (full bleed) ----
  const icon = document.getElementById('icon') as HTMLCanvasElement;
  const ig = icon.getContext('2d')!;
  bg(ig, 1024, false);
  notes(ig, 1024, '#e75f96');
  pair(ig, 1024, 0.52, 0.6);

  // ---- adaptive foreground: content inside the safe inner circle (~66%) ----
  const fg = document.getElementById('iconFg') as HTMLCanvasElement;
  const fgg = fg.getContext('2d')!;
  fgg.clearRect(0, 0, 1024, 1024);
  pair(fgg, 1024, 0.36, 0.56);

  // ---- adaptive background ----
  const bgc = document.getElementById('iconBg') as HTMLCanvasElement;
  bg(bgc.getContext('2d')!, 1024, false);

  // ---- splashes ----
  for (const [id, dark] of [
    ['splash', false],
    ['splashDark', true],
  ] as const) {
    const c = document.getElementById(id) as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const S = 2732;
    bg(g, S, dark);
    notes(g, S, dark ? '#ffffff' : '#e75f96');
    pair(g, S, 0.23, 0.44);
    g.font = `800 ${S * 0.07}px 'Baloo 2', 'Arial Rounded MT Bold', system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillStyle = dark ? '#ffe9f3' : '#e75f96';
    g.fillText('Animal Duet', S / 2, S * 0.635);
    g.font = `700 ${S * 0.026}px 'Baloo 2', system-ui, sans-serif`;
    g.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(90,70,100,0.6)';
    g.fillText('catch the beat · sing the song', S / 2, S * 0.682);
  }

  document.getElementById('ready')!.textContent = 'ready';
}

// characters are SVG sprites that decode async — render until stable
let tries = 0;
const timer = setInterval(() => {
  render();
  if (++tries > 12) clearInterval(timer);
}, 250);
render();
