/**
 * Character artwork v3 — professional illustration-style rig.
 *
 * Shape language matched to top-tier cute-game art: wide squircle heads with
 * cheek bulges that overlap a smaller blob body, thick tails curled around
 * the front, consistent dark outlines everywhere, fur patch markings, bean
 * eyes with a single shine, tiny triangle nose, ω mouth. Females get lashes,
 * softer palettes and accessories. Outfits render as layered clothing.
 */

import type { AnimalDef, TreatId, OutfitId } from '../data/animals';
import { getSprite, getOutfitOverlay, SPRITE_META } from './sprites';

export interface Pose {
  t: number;
  squash: number;
  sing: number;
  dir: number;
}

type Ctx = CanvasRenderingContext2D;

/* ------------------------------ utilities ------------------------------- */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

const OUTLINE = '#4a3b3e';

interface P {
  g: Ctx;
  U: number;
  lw: number;
}

function stroke(p: P): void {
  p.g.strokeStyle = OUTLINE;
  p.g.lineWidth = p.lw;
  p.g.lineJoin = 'round';
  p.g.lineCap = 'round';
  p.g.stroke();
}

function fillStroke(p: P, fill: string | CanvasGradient, outlined = true): void {
  p.g.fillStyle = fill;
  p.g.fill();
  if (outlined) stroke(p);
}

function ell(
  p: P,
  x: number, y: number, rx: number, ry: number,
  fill: string | CanvasGradient,
  outlined = false,
  rot = 0,
): void {
  p.g.beginPath();
  p.g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  fillStroke(p, fill, outlined);
}

/** Wide squircle head with cheek bulges — the core of the look. */
function headPath(p: P, cx: number, cy: number, w: number, h: number): void {
  const g = p.g;
  g.beginPath();
  g.moveTo(cx - w * 0.5, cy);
  g.bezierCurveTo(cx - w * 0.5, cy - h * 0.42, cx - w * 0.32, cy - h * 0.52, cx, cy - h * 0.52);
  g.bezierCurveTo(cx + w * 0.32, cy - h * 0.52, cx + w * 0.5, cy - h * 0.42, cx + w * 0.5, cy);
  g.bezierCurveTo(cx + w * 0.51, cy + h * 0.36, cx + w * 0.3, cy + h * 0.5, cx, cy + h * 0.5);
  g.bezierCurveTo(cx - w * 0.3, cy + h * 0.5, cx - w * 0.51, cy + h * 0.36, cx - w * 0.5, cy);
  g.closePath();
}

/** Small blob body under the head. */
function bodyPath(p: P, topY: number, botY: number, topW: number, botW: number): void {
  const g = p.g;
  g.beginPath();
  g.moveTo(-topW, topY);
  g.bezierCurveTo(-botW - 3 * p.U, topY + (botY - topY) * 0.5, -botW, botY, 0, botY);
  g.bezierCurveTo(botW, botY, botW + 3 * p.U, topY + (botY - topY) * 0.5, topW, topY);
  g.closePath();
}

function grad(p: P, color: string, y0: number, y1: number): CanvasGradient {
  const gr = p.g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, shade(color, 1.02));
  gr.addColorStop(1, shade(color, 0.93));
  return gr;
}

/* ------------------------------ rig layout ------------------------------ */
// unit space: character ~100 tall, origin at center
const HEAD_W = 62;
const HEAD_H = 52;
const HEAD_CY = -20;
const BODY_TOP = -4;
const BODY_BOT = 47;
const HEAD_BOTTOM = HEAD_CY + HEAD_H * 0.5; // ≈ 6

/* ------------------------------ base parts ------------------------------ */

function drawBodyBase(p: P, def: AnimalDef): void {
  bodyPath(p, BODY_TOP * p.U, BODY_BOT * p.U, 19 * p.U, 26 * p.U);
  fillStroke(p, grad(p, def.colors.body, BODY_TOP * p.U, BODY_BOT * p.U));
}

/**
 * Proper four-limbed sitting anatomy: haunches at the sides with back paws
 * peeking out, a narrower torso, and two distinct front legs with a gap
 * between them — the reference-correct cat silhouette.
 */
function drawQuadBody(
  p: P,
  def: AnimalDef,
  opts: { legColor?: string; pawColor?: string; hindColor?: string } = {},
): void {
  const U = p.U;
  const g = p.g;
  const bodyCol = () => grad(p, def.colors.body, BODY_TOP * U, 45 * U);
  const hindCol = opts.hindColor ?? undefined;
  // haunches
  for (const s of [-1, 1] as const) {
    ell(p, s * 19 * U, 33 * U, 11.5 * U, 13.5 * U, hindCol ?? bodyCol(), true);
  }
  // back paws peeking outward
  for (const s of [-1, 1] as const) {
    ell(p, s * 21.5 * U, 43 * U, 5.4 * U, 4 * U, opts.pawColor ?? def.colors.belly, true);
    g.strokeStyle = OUTLINE;
    g.lineWidth = p.lw * 0.55;
    for (const tx of [-1.6, 1.6]) {
      g.beginPath();
      g.moveTo(s * 21.5 * U + tx * U, 44.4 * U);
      g.lineTo(s * 21.5 * U + tx * U, 46.2 * U);
      g.stroke();
    }
  }
  // torso
  bodyPath(p, BODY_TOP * U, 44.5 * U, 15 * U, 18.5 * U);
  fillStroke(p, bodyCol());
  // chest/belly patch showing between the legs
  ell(p, 0, 31 * U, 10 * U, 11.5 * U, def.colors.belly);
  // front legs — two clear columns emerging below the chest
  for (const s of [-1, 1] as const) {
    g.beginPath();
    g.roundRect(s * 6.5 * U - 3.6 * U, 22 * U, 7.2 * U, 21 * U, 3.6 * U);
    fillStroke(p, opts.legColor ?? shade(def.colors.body, 1.0), true);
  }
}

function drawFrontPaws(p: P, def: AnimalDef, color?: string): void {
  const g = p.g;
  const U = p.U;
  for (const s of [-1, 1] as const) {
    ell(p, s * 6.5 * U, 42.5 * U, 5 * U, 4 * U, color ?? def.colors.belly, true);
    g.strokeStyle = OUTLINE;
    g.lineWidth = p.lw * 0.55;
    for (const tx of [-1.6, 1.6]) {
      g.beginPath();
      g.moveTo(s * 6.5 * U + tx * U, 43.5 * U);
      g.lineTo(s * 6.5 * U + tx * U, 45.6 * U);
      g.stroke();
    }
  }
}

/** Tabby forehead stripes between the ears. */
function foreheadStripes(p: P, def: AnimalDef, soft = false): void {
  const g = p.g;
  const U = p.U;
  g.save();
  g.strokeStyle = def.colors.accent;
  g.globalAlpha = soft ? 0.5 : 0.9;
  g.lineWidth = 2.2 * U;
  g.lineCap = 'round';
  for (const i of [-1, 0, 1]) {
    g.beginPath();
    g.moveTo(i * 5 * U, (HEAD_CY - HEAD_H * 0.48) * U);
    g.lineTo(i * 6.5 * U, (HEAD_CY - HEAD_H * 0.31) * U);
    g.stroke();
  }
  g.restore();
}

function drawBellyPatch(p: P, def: AnimalDef): void {
  ell(p, 0, 32 * p.U, 12 * p.U, 13 * p.U, def.colors.belly);
}

function drawPaws(p: P, def: AnimalDef, color?: string): void {
  const y = 43 * p.U;
  for (const s of [-1, 1]) {
    ell(p, s * 8 * p.U, y, 6 * p.U, 4.6 * p.U, color ?? def.colors.belly, true);
    p.g.strokeStyle = OUTLINE;
    p.g.lineWidth = p.lw * 0.6;
    for (const tx of [-1.8, 1.8]) {
      p.g.beginPath();
      p.g.moveTo(s * 8 * p.U + tx * p.U, y + 1.6 * p.U);
      p.g.lineTo(s * 8 * p.U + tx * p.U, y + 3.8 * p.U);
      p.g.stroke();
    }
  }
}

/** Thick tail curled around the front — the signature silhouette. */
function drawCurlTail(p: P, def: AnimalDef, t: number, striped: boolean, tipColor?: string): void {
  const g = p.g;
  const sway = Math.sin(t * 1.8) * 1.2 * p.U;
  const w = 9.5 * p.U;
  const path = () => {
    g.beginPath();
    g.moveTo(12 * p.U, 43 * p.U);
    g.bezierCurveTo(24 * p.U, 46.5 * p.U, 32 * p.U + sway, 46 * p.U, 34 * p.U + sway, 36 * p.U);
  };
  path();
  g.lineWidth = w + p.lw * 2;
  g.strokeStyle = OUTLINE;
  g.lineCap = 'round';
  g.stroke();
  path();
  g.lineWidth = w;
  g.strokeStyle = shade(def.colors.body, 0.99);
  g.stroke();
  if (striped) {
    // two soft rings across the tail
    g.save();
    g.strokeStyle = def.colors.accent;
    g.globalAlpha = 0.85;
    g.lineWidth = 3.4 * p.U;
    g.lineCap = 'butt';
    for (const [x0, y0, x1, y1] of [
      [24 * p.U, 41.5 * p.U, 25.5 * p.U, 48 * p.U],
      [30.5 * p.U + sway, 39.5 * p.U, 34.5 * p.U + sway, 43 * p.U],
    ]) {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    g.restore();
  }
  if (tipColor) {
    // colored tail tip, blended (no outline, no balloon look)
    g.save();
    g.beginPath();
    g.moveTo(33.2 * p.U + sway, 42 * p.U);
    g.bezierCurveTo(33.8 * p.U + sway, 40 * p.U, 34 * p.U + sway, 38 * p.U, 34 * p.U + sway, 36 * p.U);
    g.lineWidth = w;
    g.strokeStyle = tipColor;
    g.lineCap = 'round';
    g.stroke();
    g.restore();
  }
}

function drawHeadBase(p: P, def: AnimalDef): { cy: number; w: number; h: number } {
  const cy = HEAD_CY * p.U;
  const w = HEAD_W * p.U;
  const h = HEAD_H * p.U;
  headPath(p, 0, cy, w, h);
  fillStroke(p, grad(p, def.colors.body, cy - h / 2, cy + h / 2));
  return { cy, w, h };
}

/** Fur patch over one ear/eye (clipped to the head). */
function headPatch(p: P, def: AnimalDef, side: 1 | -1, big: boolean): void {
  const g = p.g;
  g.save();
  headPath(p, 0, HEAD_CY * p.U, HEAD_W * p.U, HEAD_H * p.U);
  g.clip();
  g.beginPath();
  const cx = side * HEAD_W * 0.3 * p.U;
  const cy = (HEAD_CY - HEAD_H * (big ? 0.28 : 0.38)) * p.U;
  g.ellipse(cx, cy, HEAD_W * (big ? 0.26 : 0.16) * p.U, HEAD_H * (big ? 0.3 : 0.18) * p.U, side * 0.4, 0, Math.PI * 2);
  g.fillStyle = def.colors.accent;
  g.globalAlpha = 0.85;
  g.fill();
  g.restore();
}

/* -------------------------------- faces --------------------------------- */

interface FaceOpts {
  eyeDX?: number;
  eyeY?: number;
  eyeS?: number;
  mouth?: 'cat' | 'smile' | 'wide';
  nose?: 'tri' | 'oval' | 'none';
  whiskers?: boolean;
  muzzlePatch?: boolean;
}

function drawFace(p: P, def: AnimalDef, pose: Pose, o: FaceOpts = {}): void {
  const g = p.g;
  const U = p.U;
  const eyeDX = (o.eyeDX ?? 13.5) * U;
  const eyeY = (o.eyeY ?? HEAD_CY + 5) * U;
  const eyeS = (o.eyeS ?? 0.82) * U;
  const noseY = (HEAD_CY + 12) * U;
  const female = def.sex === 'f';
  const phase = (pose.t + hashStr(def.id) * 0.17) % 3.8;
  const blink = phase < 0.12;

  if (o.muzzlePatch) {
    ell(p, 0, (HEAD_CY + 13) * U, 11 * U, 8 * U, def.colors.belly);
  }

  // eyes — dark beans with one shine
  for (const s of [-1, 1]) {
    const ex = s * eyeDX;
    if (blink) {
      g.strokeStyle = OUTLINE;
      g.lineWidth = 1.8 * U;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(ex, eyeY + 1 * U, 3 * eyeS, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    } else {
      ell(p, ex, eyeY, 3.1 * eyeS, 4 * eyeS, OUTLINE);
      ell(p, ex - 1 * eyeS, eyeY - 1.4 * eyeS, 1.15 * eyeS, 1.15 * eyeS, '#ffffff');
    }
    if (female && !blink) {
      g.strokeStyle = OUTLINE;
      g.lineWidth = 1.1 * U;
      g.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const a = -Math.PI * (0.42 + i * 0.16);
        g.beginPath();
        g.moveTo(ex + Math.cos(a) * 3.4 * eyeS * s, eyeY + Math.sin(a) * 4.2 * eyeS);
        g.lineTo(ex + Math.cos(a) * 6 * eyeS * s, eyeY + Math.sin(a) * 6.4 * eyeS);
        g.stroke();
      }
    }
  }

  // blush
  g.globalAlpha = female ? 0.7 : 0.45;
  ell(p, -eyeDX - 6 * U, noseY - 1 * U, 4 * U, 2.6 * U, def.colors.cheek);
  ell(p, eyeDX + 6 * U, noseY - 1 * U, 4 * U, 2.6 * U, def.colors.cheek);
  g.globalAlpha = 1;

  // whiskers
  if (o.whiskers) {
    g.strokeStyle = 'rgba(74,59,62,0.45)';
    g.lineWidth = 0.9 * U;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(s * 24 * U, noseY - 4.5 * U + i * 3.2 * U);
        g.lineTo(s * 35 * U, noseY - 6.5 * U + i * 4.6 * U);
        g.stroke();
      }
    }
  }

  // nose
  if (o.nose === 'tri' || o.nose === undefined) {
    g.beginPath();
    g.moveTo(-1.9 * U, noseY - 1.4 * U);
    g.quadraticCurveTo(0, noseY - 2.2 * U, 1.9 * U, noseY - 1.4 * U);
    g.quadraticCurveTo(1.6 * U, noseY + 0.9 * U, 0, noseY + 1.2 * U);
    g.quadraticCurveTo(-1.6 * U, noseY + 0.9 * U, -1.9 * U, noseY - 1.4 * U);
    g.closePath();
    g.fillStyle = '#c97a86';
    g.fill();
  } else if (o.nose === 'oval') {
    ell(p, 0, noseY - 0.5 * U, 2.6 * U, 2 * U, OUTLINE);
  }

  // mouth
  const sing = pose.sing;
  if (sing > 0.15) {
    const open = (2.6 + 3.6 * sing) * U;
    p.g.beginPath();
    p.g.ellipse(0, noseY + 3.2 * U + open * 0.4, open * 0.62, open, 0, 0, Math.PI * 2);
    fillStroke(p, '#8a4a52', true);
    ell(p, 0, noseY + 3.2 * U + open * 0.85, open * 0.34, open * 0.3, '#f191a2');
  } else if (o.mouth === 'wide') {
    g.strokeStyle = OUTLINE;
    g.lineWidth = 1.3 * U;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, noseY - 1 * U, 6.5 * U, Math.PI * 0.18, Math.PI * 0.82);
    g.stroke();
  } else if (o.mouth === 'smile') {
    g.strokeStyle = OUTLINE;
    g.lineWidth = 1.3 * U;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, noseY + 1.2 * U, 2.6 * U, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  } else {
    // cat ω
    g.strokeStyle = OUTLINE;
    g.lineWidth = 1.2 * U;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(-2 * U, noseY + 2.6 * U, 2.1 * U, Math.PI * 0.1, Math.PI * 0.9);
    g.arc(2 * U, noseY + 2.6 * U, 2.1 * U, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  }
}

/* ------------------------------- ears etc ------------------------------- */

function catEar(p: P, def: AnimalDef, s: 1 | -1, big = false, accentBack = false): void {
  const g = p.g;
  const U = p.U;
  const k = big ? 1.22 : 1;
  const bx = s * HEAD_W * 0.32 * U;
  const by = (HEAD_CY - HEAD_H * 0.34) * U;
  const tipX = s * HEAD_W * 0.46 * U;
  const tipY = (HEAD_CY - HEAD_H * (0.62 + 0.16 * k)) * U;
  const inX = s * HEAD_W * 0.12 * U;
  const inY = (HEAD_CY - HEAD_H * 0.48) * U;
  g.beginPath();
  g.moveTo(inX, inY);
  g.quadraticCurveTo(s * HEAD_W * 0.28 * U, tipY - 2 * U, tipX, tipY);
  g.quadraticCurveTo(s * HEAD_W * 0.5 * U, by - 4 * U, bx + s * 6 * U, by);
  g.closePath();
  fillStroke(p, accentBack ? def.colors.accent : def.colors.body);
  // inner ear — smaller, softer
  g.beginPath();
  g.moveTo(inX + s * 6 * U, inY + 2 * U);
  g.quadraticCurveTo(s * HEAD_W * 0.3 * U, tipY + 5 * U, tipX - s * 3.5 * U, tipY + 4.5 * U);
  g.quadraticCurveTo(s * HEAD_W * 0.38 * U, by - 3 * U, bx + s * 4 * U, by - 1.5 * U);
  g.closePath();
  p.g.fillStyle = def.colors.cheek;
  p.g.globalAlpha = 0.6;
  p.g.fill();
  p.g.globalAlpha = 1;
}

function flower(p: P, x: number, y: number, color: string, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    ell(p, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.55, r * 0.55, color);
  }
  ell(p, x, y, r * 0.42, r * 0.42, '#fff3c9');
}

function bow(p: P, x: number, y: number, color: string, k = 1): void {
  const U = p.U;
  const w = 6 * U * k;
  const h = 4 * U * k;
  const g = p.g;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(x + s * 0.6 * U, y);
    g.quadraticCurveTo(x + s * w * 0.8, y - h, x + s * w, y - h * 0.35);
    g.quadraticCurveTo(x + s * w * 1.02, y + h * 0.45, x + s * w * 0.55, y + h * 0.5);
    g.closePath();
    fillStroke(p, color, true);
  }
  ell(p, x, y, 1.9 * U * k, 1.9 * U * k, shade(color, 0.82), true);
}

function femaleAccessory(p: P, def: AnimalDef, outfit: OutfitId): void {
  if (def.sex !== 'f' || outfit === 'flowercrown' || outfit === 'tophat' || outfit === 'dress') return;
  const x = HEAD_W * 0.3 * p.U;
  const y = (HEAD_CY - HEAD_H * 0.42) * p.U;
  if (def.species === 'chick' || def.species === 'duck') {
    bow(p, x, y, '#f290b2', 0.85);
  } else {
    flower(p, x, y, '#f290b2', 3.4 * p.U);
  }
}

/* ------------------------------- outfits -------------------------------- */

function outfitTorso(p: P, outfit: OutfitId): void {
  const U = p.U;
  const g = p.g;
  if (outfit === 'tuxedo') {
    bodyPath(p, (BODY_TOP + 2) * U, (BODY_BOT - 1) * U, 16.5 * U, 22.5 * U);
    fillStroke(p, '#383842', true);
    g.beginPath();
    g.moveTo(-6.5 * U, (BODY_TOP + 3) * U);
    g.lineTo(6.5 * U, (BODY_TOP + 3) * U);
    g.lineTo(0, (BODY_TOP + 16) * U);
    g.closePath();
    fillStroke(p, '#ffffff', true);
    ell(p, 0, (BODY_TOP + 19) * U, 1 * U, 1 * U, '#26262e');
    ell(p, 0, (BODY_TOP + 23.5) * U, 1 * U, 1 * U, '#26262e');
    bow(p, 0, (BODY_TOP + 4.5) * U, '#26262e', 0.8);
  } else if (outfit === 'dress') {
    g.beginPath();
    g.moveTo(-15 * U, (BODY_TOP + 6) * U);
    g.bezierCurveTo(-30 * U, (BODY_BOT - 4) * U, -28 * U, (BODY_BOT + 1) * U, 0, (BODY_BOT + 1) * U);
    g.bezierCurveTo(28 * U, (BODY_BOT + 1) * U, 30 * U, (BODY_BOT - 4) * U, 15 * U, (BODY_TOP + 6) * U);
    g.closePath();
    fillStroke(p, '#ffffff', true);
    g.strokeStyle = '#ecd6e2';
    g.lineWidth = p.lw * 0.8;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.arc(i * 10 * U, (BODY_BOT - 1) * U, 5 * U, Math.PI * 0.12, Math.PI * 0.88);
      g.stroke();
    }
    bow(p, 0, (BODY_TOP + 9) * U, '#f290b2', 0.95);
  } else if (outfit === 'scarf') {
    g.beginPath();
    g.roundRect(-15 * U, (HEAD_BOTTOM + 0.5) * U, 30 * U, 6.5 * U, 3 * U);
    fillStroke(p, '#e87a7a', true);
    g.beginPath();
    g.roundRect(3 * U, (HEAD_BOTTOM + 5) * U, 7 * U, 14 * U, 3 * U);
    fillStroke(p, '#e87a7a', true);
    g.strokeStyle = '#c05a5a';
    g.lineWidth = p.lw * 0.7;
    for (const yy of [14, 17]) {
      g.beginPath();
      g.moveTo(4 * U, (HEAD_BOTTOM + yy) * U);
      g.lineTo(9.5 * U, (HEAD_BOTTOM + yy) * U);
      g.stroke();
    }
  } else if (outfit === 'bowtie') {
    bow(p, 0, (HEAD_BOTTOM + 3) * U, '#5aa7e8', 1.1);
  }
}

function outfitHead(p: P, outfit: OutfitId): void {
  const U = p.U;
  const g = p.g;
  const topY = (HEAD_CY - HEAD_H * 0.5) * U;
  if (outfit === 'flowercrown') {
    for (let i = -2; i <= 2; i++) {
      flower(p, i * HEAD_W * 0.16 * U, topY + Math.abs(i) * 2.4 * U + 1 * U, i % 2 === 0 ? '#f290b2' : '#ffd98a', 3 * U);
    }
  } else if (outfit === 'tophat') {
    g.save();
    g.rotate(-0.05);
    g.beginPath();
    g.roundRect(-13 * U, topY - 20 * U, 26 * U, 20 * U, 2.5 * U);
    fillStroke(p, '#383842', true);
    g.beginPath();
    g.roundRect(-18 * U, topY - 3 * U, 36 * U, 5 * U, 2.5 * U);
    fillStroke(p, '#383842', true);
    g.beginPath();
    g.roundRect(-13 * U, topY - 8.5 * U, 26 * U, 5 * U, 1.5 * U);
    fillStroke(p, '#e75f96', true);
    g.restore();
  } else if (outfit === 'dress') {
    for (let i = -1; i <= 1; i++) {
      flower(p, i * HEAD_W * 0.15 * U, topY + Math.abs(i) * 1.8 * U + 1.5 * U, '#f290b2', 2.6 * U);
    }
  }
}

function veilBack(p: P): void {
  const g = p.g;
  const U = p.U;
  g.save();
  g.globalAlpha = 0.5;
  g.beginPath();
  g.moveTo(-HEAD_W * 0.42 * U, (HEAD_CY - HEAD_H * 0.3) * U);
  g.quadraticCurveTo(-HEAD_W * 0.85 * U, 20 * U, -HEAD_W * 0.5 * U, 46 * U);
  g.quadraticCurveTo(0, 52 * U, HEAD_W * 0.62 * U, 42 * U);
  g.quadraticCurveTo(HEAD_W * 0.72 * U, 8 * U, HEAD_W * 0.42 * U, (HEAD_CY - HEAD_H * 0.3) * U);
  g.quadraticCurveTo(0, (HEAD_CY - HEAD_H * 0.62) * U, -HEAD_W * 0.42 * U, (HEAD_CY - HEAD_H * 0.3) * U);
  g.closePath();
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}

/* --------------------------- species drawings ---------------------------- */

type SpeciesFn = (p: P, def: AnimalDef, pose: Pose, outfit: OutfitId) => void;

const drawCat: SpeciesFn = (p, def, pose, outfit) => {
  if (outfit !== 'dress') drawCurlTail(p, def, pose.t, def.sex === 'm', def.sex === 'f' ? def.colors.accent : undefined);
  drawQuadBody(p, def);
  outfitTorso(p, outfit);
  drawFrontPaws(p, def);
  catEar(p, def, -1, false, def.sex === 'm');
  catEar(p, def, 1);
  drawHeadBase(p, def);
  if (def.sex === 'm') headPatch(p, def, -1, true);
  foreheadStripes(p, def, def.sex === 'f');
  drawFace(p, def, pose, { whiskers: true, mouth: 'cat', nose: 'tri', muzzlePatch: true });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawChick: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  const flap = pose.sing * 4 * U;
  ell(p, -24 * U, 22 * U - flap, 7 * U, 11 * U, def.colors.accent, true, -0.35);
  ell(p, 24 * U, 22 * U - flap, 7 * U, 11 * U, def.colors.accent, true, 0.35);
  drawBodyBase(p, def);
  drawBellyPatch(p, def);
  outfitTorso(p, outfit);
  drawPaws(p, def, def.colors.accent);
  // hair sprigs
  const g = p.g;
  g.strokeStyle = OUTLINE;
  g.lineWidth = 1.6 * U;
  g.lineCap = 'round';
  for (const a of [-0.5, 0, 0.5]) {
    g.beginPath();
    g.moveTo(a * 6 * U, (HEAD_CY - HEAD_H * 0.48) * U);
    g.quadraticCurveTo(a * 14 * U, (HEAD_CY - HEAD_H * 0.75) * U, a * 16 * U + 2 * U, (HEAD_CY - HEAD_H * 0.66) * U);
    g.stroke();
  }
  drawHeadBase(p, def);
  // beak
  const noseY = (HEAD_CY + 11) * U;
  const open = pose.sing * 3.5 * U;
  g.beginPath();
  g.moveTo(-4.5 * U, noseY - 1.5 * U);
  g.quadraticCurveTo(0, noseY - 3.5 * U, 4.5 * U, noseY - 1.5 * U);
  g.quadraticCurveTo(0, noseY + 1 * U, -4.5 * U, noseY - 1.5 * U);
  fillStroke(p, def.colors.accent, true);
  g.beginPath();
  g.moveTo(-3.6 * U, noseY - 0.4 * U);
  g.quadraticCurveTo(0, noseY + 2.6 * U + open, 3.6 * U, noseY - 0.4 * U);
  g.quadraticCurveTo(0, noseY + 0.6 * U + open * 0.4, -3.6 * U, noseY - 0.4 * U);
  fillStroke(p, shade(def.colors.accent, 0.85), true);
  drawFace(p, def, pose, { mouth: 'smile', nose: 'none', eyeDX: 10.5 });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawDog: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  if (outfit !== 'dress') drawCurlTail(p, def, pose.t * 2.2, false, def.colors.accent);
  drawQuadBody(p, def);
  outfitTorso(p, outfit);
  drawFrontPaws(p, def);
  drawHeadBase(p, def);
  headPatch(p, def, 1, def.sex === 'm');
  // floppy ears hanging from the top corners
  for (const s of [-1, 1] as const) {
    const g = p.g;
    const ax = s * HEAD_W * 0.4 * U;
    const topY = (HEAD_CY - HEAD_H * 0.42) * U;
    g.beginPath();
    g.moveTo(ax - s * 6 * U, topY + 1 * U);
    g.quadraticCurveTo(ax + s * 10 * U, topY - 3 * U, ax + s * 11 * U, topY + 12 * U);
    g.quadraticCurveTo(ax + s * 11 * U, topY + 24 * U, ax + s * 2 * U, topY + 25 * U);
    g.quadraticCurveTo(ax - s * 6 * U, topY + 24 * U, ax - s * 5 * U, topY + 12 * U);
    g.closePath();
    fillStroke(p, shade(def.colors.accent, 0.98), true);
  }
  drawFace(p, def, pose, { mouth: 'cat', nose: 'oval', muzzlePatch: true });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawFrog: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  drawQuadBody(p, def, { pawColor: def.colors.body, legColor: def.colors.body });
  outfitTorso(p, outfit);
  drawFrontPaws(p, def, def.colors.body);
  // eye bumps
  for (const s of [-1, 1] as const) {
    ell(p, s * HEAD_W * 0.28 * U, (HEAD_CY - HEAD_H * 0.5) * U, 9 * U, 8.5 * U, grad(p, def.colors.body, (HEAD_CY - HEAD_H * 0.72) * U, (HEAD_CY - HEAD_H * 0.3) * U), true);
  }
  drawHeadBase(p, def);
  // eyes on bumps
  const phase = (pose.t + hashStr(def.id) * 0.17) % 3.8;
  const blink = phase < 0.12;
  for (const s of [-1, 1] as const) {
    const ex = s * HEAD_W * 0.28 * U;
    const ey = (HEAD_CY - HEAD_H * 0.52) * U;
    if (blink) {
      p.g.strokeStyle = OUTLINE;
      p.g.lineWidth = 1.6 * U;
      p.g.beginPath();
      p.g.arc(ex, ey + 1 * U, 2.8 * U, Math.PI * 0.12, Math.PI * 0.88);
      p.g.stroke();
    } else {
      ell(p, ex, ey, 2.9 * U, 3.6 * U, OUTLINE);
      ell(p, ex - 1 * U, ey - 1.2 * U, 1.05 * U, 1.05 * U, '#ffffff');
      if (def.sex === 'f') {
        p.g.strokeStyle = OUTLINE;
        p.g.lineWidth = 1 * U;
        p.g.beginPath();
        p.g.moveTo(ex + s * 3.2 * U, ey - 2.4 * U);
        p.g.lineTo(ex + s * 5.2 * U, ey - 4 * U);
        p.g.stroke();
      }
    }
  }
  drawFace(p, def, pose, { mouth: 'wide', nose: 'none', eyeDX: 0, eyeS: 0.01, eyeY: -200 });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawOwl: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  ell(p, -24 * U, 20 * U, 7.5 * U, 13 * U, def.colors.accent, true, -0.25);
  ell(p, 24 * U, 20 * U, 7.5 * U, 13 * U, def.colors.accent, true, 0.25);
  drawBodyBase(p, def);
  drawBellyPatch(p, def);
  // belly scallops
  const g = p.g;
  g.strokeStyle = shade(def.colors.accent, 1.06);
  g.lineWidth = 1.1 * U;
  for (let row = 0; row < 3; row++) {
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.arc(i * 7 * U + (row % 2) * 3.5 * U, (26 + row * 6.5) * U, 3.4 * U, Math.PI * 0.12, Math.PI * 0.88);
      g.stroke();
    }
  }
  outfitTorso(p, outfit);
  drawPaws(p, def, def.colors.accent);
  // ear tufts
  for (const s of [-1, 1] as const) {
    p.g.beginPath();
    p.g.moveTo(s * HEAD_W * 0.2 * U, (HEAD_CY - HEAD_H * 0.42) * U);
    p.g.quadraticCurveTo(s * HEAD_W * 0.42 * U, (HEAD_CY - HEAD_H * 0.85) * U, s * HEAD_W * 0.48 * U, (HEAD_CY - HEAD_H * 0.68) * U);
    p.g.quadraticCurveTo(s * HEAD_W * 0.5 * U, (HEAD_CY - HEAD_H * 0.4) * U, s * HEAD_W * 0.34 * U, (HEAD_CY - HEAD_H * 0.3) * U);
    p.g.closePath();
    fillStroke(p, def.colors.accent, true);
  }
  drawHeadBase(p, def);
  // facial disc
  for (const s of [-1, 1] as const) {
    ell(p, s * 10 * U, (HEAD_CY + 1) * U, 9.5 * U, 10 * U, def.colors.belly);
  }
  // beak
  const noseY = (HEAD_CY + 10) * U;
  p.g.beginPath();
  p.g.moveTo(-2.6 * U, noseY - 1 * U);
  p.g.quadraticCurveTo(0, noseY - 2.2 * U, 2.6 * U, noseY - 1 * U);
  p.g.quadraticCurveTo(0.8 * U, noseY + 3 * U, 0, noseY + 3.4 * U);
  p.g.quadraticCurveTo(-0.8 * U, noseY + 3 * U, -2.6 * U, noseY - 1 * U);
  p.g.closePath();
  fillStroke(p, '#e8b45e', true);
  drawFace(p, def, pose, { mouth: 'smile', nose: 'none', eyeDX: 10, eyeS: 1.25 });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawDuck: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  const g = p.g;
  // tail flick behind
  g.beginPath();
  g.moveTo(-16 * U, 34 * U);
  g.quadraticCurveTo(-27 * U, 28 * U, -25 * U, 37 * U);
  g.quadraticCurveTo(-22 * U, 40 * U, -15 * U, 38 * U);
  g.closePath();
  fillStroke(p, def.colors.body, true);
  ell(p, -23 * U, 21 * U, 7 * U, 11.5 * U, shade(def.colors.body, 0.95), true, -0.3);
  ell(p, 23 * U, 21 * U, 7 * U, 11.5 * U, shade(def.colors.body, 0.95), true, 0.3);
  drawBodyBase(p, def);
  drawBellyPatch(p, def);
  outfitTorso(p, outfit);
  drawPaws(p, def, '#f5a95e');
  // head swoosh
  g.strokeStyle = OUTLINE;
  g.lineWidth = 1.7 * U;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, (HEAD_CY - HEAD_H * 0.5) * U);
  g.quadraticCurveTo(5 * U, (HEAD_CY - HEAD_H * 0.72) * U, 11 * U, (HEAD_CY - HEAD_H * 0.6) * U);
  g.stroke();
  drawHeadBase(p, def);
  // wide flat bill
  const noseY = (HEAD_CY + 11) * U;
  const open = pose.sing * 3.5 * U;
  g.beginPath();
  g.moveTo(-10.5 * U, noseY - 2 * U);
  g.quadraticCurveTo(0, noseY - 5 * U, 10.5 * U, noseY - 2 * U);
  g.quadraticCurveTo(0, noseY + 1.2 * U, -10.5 * U, noseY - 2 * U);
  fillStroke(p, '#f5a95e', true);
  g.beginPath();
  g.moveTo(-8.5 * U, noseY - 0.6 * U);
  g.quadraticCurveTo(0, noseY + 3.6 * U + open, 8.5 * U, noseY - 0.6 * U);
  g.quadraticCurveTo(0, noseY + 0.6 * U + open * 0.4, -8.5 * U, noseY - 0.6 * U);
  fillStroke(p, '#e8954a', true);
  drawFace(p, def, pose, { mouth: 'smile', nose: 'none', eyeDX: 11 });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawFox: SpeciesFn = (p, def, pose, outfit) => {
  if (outfit !== 'dress') drawCurlTail(p, def, pose.t, false, def.colors.belly);
  drawQuadBody(p, def);
  outfitTorso(p, outfit);
  drawFrontPaws(p, def);
  catEar(p, def, -1, true, true);
  catEar(p, def, 1, true, true);
  drawHeadBase(p, def);
  headPatch(p, def, 1, def.sex === 'm');
  drawFace(p, def, pose, { mouth: 'cat', nose: 'oval', muzzlePatch: true, whiskers: true });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const drawPanda: SpeciesFn = (p, def, pose, outfit) => {
  const U = p.U;
  drawQuadBody(p, def, {
    legColor: def.colors.accent,
    hindColor: def.colors.accent,
    pawColor: shade(def.colors.accent, 1.5),
  });
  outfitTorso(p, outfit);
  drawFrontPaws(p, def, shade(def.colors.accent, 1.5));
  // round ears
  for (const s of [-1, 1] as const) {
    ell(p, s * HEAD_W * 0.36 * U, (HEAD_CY - HEAD_H * 0.44) * U, 8.5 * U, 8 * U, def.colors.accent, true);
  }
  drawHeadBase(p, def);
  // eye patches
  for (const s of [-1, 1] as const) {
    ell(p, s * 11 * U, (HEAD_CY + 3) * U, 6.5 * U, 7.5 * U, def.colors.accent, false, s * 0.3);
  }
  drawFace(p, def, pose, { mouth: 'smile', nose: 'oval', eyeS: 0.9 });
  femaleAccessory(p, def, outfit);
  outfitHead(p, outfit);
};

const SPECIES_FN: Record<string, SpeciesFn> = {
  cat: drawCat,
  chick: drawChick,
  dog: drawDog,
  frog: drawFrog,
  owl: drawOwl,
  duck: drawDuck,
  fox: drawFox,
  panda: drawPanda,
};

/**
 * Draw a character centered at (x, y) with total height ~= size.
 */
export function drawAnimal(
  g: Ctx,
  def: AnimalDef,
  x: number,
  y: number,
  size: number,
  pose: Pose,
  outfit: OutfitId = 'none',
): void {
  const U = size / 100;
  const p: P = { g, U, lw: Math.max(1.2, 1.7 * U) };
  const bob = Math.sin(pose.t * 2.2 + hashStr(def.id)) * 1.4 * U;

  g.save();
  g.translate(x, y + bob);
  g.rotate(pose.dir * 0.08);
  g.scale(1 + pose.squash * 0.1, 1 - pose.squash * 0.14);
  // ground shadow
  g.save();
  g.globalAlpha = 0.13;
  ell(p, 0, 49 * U, 32 * U, 5.5 * U, '#3a3050');
  g.restore();

  // designer-grade sculpted sprite path (falls back to parametric while
  // the sprite decodes or if the species has no sculpt yet)
  const sprite = getSprite(def, outfit, pose.sing > 0.35);
  if (sprite) {
    // sprite viewBox is 100 units with ground at y≈92; align ground to +49U
    g.drawImage(sprite.img, -size / 2, -size * 0.43, size, size);
    if (sprite.custom) {
      // user artwork: outfits render as a standard overlay layer, no blink
      const overlay = getOutfitOverlay(outfit);
      if (overlay) g.drawImage(overlay, -size / 2, -size * 0.43, size, size);
      g.restore();
      return;
    }
    const meta = SPRITE_META[def.species];
    const phase = (pose.t + hashStr(def.id) * 0.17) % 3.8;
    if (meta && phase < 0.12) {
      const cover =
        meta.headFill === 'belly'
          ? def.colors.belly
          : meta.headFill === 'accent'
            ? def.colors.accent
            : def.colors.body;
      for (const [ex, ey] of meta.eyes) {
        const px = (ex - 50) * U;
        const py = (ey - 43) * U;
        g.fillStyle = cover;
        g.beginPath();
        g.ellipse(px, py - 0.6 * U, meta.eyeR * 1.35 * U, meta.eyeR * 1.5 * U, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(74,59,54,0.9)';
        g.lineWidth = 1.5 * U;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(px, py - 0.8 * U, meta.eyeR * 0.9 * U, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }
    }
    g.restore();
    return;
  }

  if (outfit === 'dress') veilBack(p);
  (SPECIES_FN[def.species] ?? drawCat)(p, def, pose, outfit);
  g.restore();
}

/* -------------------------------- treats -------------------------------- */

export function drawTreat(
  g: Ctx,
  treat: TreatId,
  x: number,
  y: number,
  r: number,
  t: number,
  accent: string,
): void {
  g.save();
  g.translate(x, y);
  const glow = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.1);
  glow.addColorStop(0, 'rgba(255,255,255,0.75)');
  glow.addColorStop(0.5, `${accent}55`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(0, 0, r * 2.1, 0, Math.PI * 2);
  g.fill();
  g.rotate(Math.sin(t * 3) * 0.18);
  drawTreatIcon(g, treat, r);
  const sp = (Math.sin(t * 5) + 1) / 2;
  g.globalAlpha = 0.5 + sp * 0.5;
  g.beginPath();
  g.arc(r * 0.85, -r * 0.85, r * 0.09 + sp * r * 0.05, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}

export function drawHoldTreat(
  g: Ctx,
  treat: TreatId,
  x: number,
  yHead: number,
  yTail: number,
  r: number,
  t: number,
  accent: string,
  heldRatio: number,
): void {
  g.save();
  const top = Math.min(yHead, yTail);
  const h = Math.abs(yHead - yTail);
  const grad2 = g.createLinearGradient(x, top, x, yHead);
  grad2.addColorStop(0, `${accent}44`);
  grad2.addColorStop(1, `${accent}aa`);
  g.beginPath();
  g.roundRect(x - r * 0.62, top, r * 1.24, h, r * 0.62);
  g.fillStyle = grad2;
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 2;
  g.stroke();
  if (heldRatio > 0) {
    const fillTop = yHead - h * heldRatio;
    g.beginPath();
    g.roundRect(x - r * 0.4, fillTop, r * 0.8, yHead - fillTop, r * 0.4);
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fill();
  }
  g.restore();
  drawTreat(g, treat, x, yHead, r, t, accent);
}

function drawTreatIcon(g: Ctx, treat: TreatId, r: number): void {
  const ei = (x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };
  switch (treat) {
    case 'fish':
      ei(-r * 0.15, 0, r * 0.75, r * 0.5, '#9fc9ef');
      g.beginPath();
      g.moveTo(r * 0.45, -r * 0.45);
      g.lineTo(r * 1.0, 0);
      g.lineTo(r * 0.45, r * 0.45);
      g.closePath();
      g.fillStyle = '#7fb0e0';
      g.fill();
      ei(-r * 0.5, -r * 0.08, r * 0.09, r * 0.09, '#3a3a52');
      break;
    case 'worm':
      g.strokeStyle = '#f2a2b8';
      g.lineWidth = r * 0.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-r * 0.7, r * 0.2);
      g.quadraticCurveTo(-r * 0.2, -r * 0.6, r * 0.2, 0);
      g.quadraticCurveTo(r * 0.5, r * 0.4, r * 0.75, -r * 0.1);
      g.stroke();
      ei(-r * 0.7, r * 0.16, r * 0.1, r * 0.1, '#3a3a52');
      break;
    case 'bone':
      g.fillStyle = '#fdf6ec';
      g.fillRect(-r * 0.55, -r * 0.18, r * 1.1, r * 0.36);
      for (const side of [-1, 1]) {
        ei(side * r * 0.6, -r * 0.22, r * 0.26, r * 0.26, '#fdf6ec');
        ei(side * r * 0.6, r * 0.22, r * 0.26, r * 0.26, '#fdf6ec');
      }
      break;
    case 'fly':
      ei(0, r * 0.1, r * 0.35, r * 0.3, '#6a6a7a');
      ei(-r * 0.38, -r * 0.3, r * 0.4, r * 0.22, 'rgba(200,225,255,0.8)', -0.5);
      ei(r * 0.38, -r * 0.3, r * 0.4, r * 0.22, 'rgba(200,225,255,0.8)', 0.5);
      break;
    case 'moon':
      g.fillStyle = '#ffe9a8';
      g.beginPath();
      g.arc(0, 0, r * 0.75, Math.PI * 0.42, Math.PI * 1.58, false);
      g.arc(r * 0.42, 0, r * 0.62, Math.PI * 1.45, Math.PI * 0.55, true);
      g.closePath();
      g.fill();
      break;
    case 'bread':
      g.fillStyle = '#e8b46e';
      g.beginPath();
      g.roundRect(-r * 0.65, -r * 0.55, r * 1.3, r * 1.15, r * 0.28);
      g.fill();
      g.fillStyle = '#f7dcae';
      g.beginPath();
      g.roundRect(-r * 0.48, -r * 0.36, r * 0.96, r * 0.82, r * 0.2);
      g.fill();
      break;
    case 'berry':
      ei(-r * 0.28, r * 0.12, r * 0.34, r * 0.34, '#7f6cd9');
      ei(r * 0.28, r * 0.12, r * 0.34, r * 0.34, '#9a82cf');
      ei(0, -r * 0.25, r * 0.34, r * 0.34, '#8a76e0');
      ei(r * 0.15, -r * 0.62, r * 0.28, r * 0.13, '#6fbf6a', -0.5);
      break;
    case 'bamboo':
      g.fillStyle = '#8fd08a';
      g.beginPath();
      g.roundRect(-r * 0.2, -r * 0.8, r * 0.4, r * 1.6, r * 0.18);
      g.fill();
      g.strokeStyle = '#5fae5f';
      g.lineWidth = r * 0.07;
      for (const yy of [-r * 0.28, r * 0.28]) {
        g.beginPath();
        g.moveTo(-r * 0.2, yy);
        g.lineTo(r * 0.2, yy);
        g.stroke();
      }
      ei(r * 0.5, -r * 0.55, r * 0.38, r * 0.15, '#6fbf6a', -0.6);
      break;
  }
}

/** Simple music-note glyph used by particles. */
export function drawNoteGlyph(g: Ctx, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = s * 0.14;
  g.beginPath();
  g.ellipse(0, s * 0.5, s * 0.32, s * 0.24, -0.3, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(s * 0.28, s * 0.42);
  g.lineTo(s * 0.28, -s * 0.5);
  g.quadraticCurveTo(s * 0.55, -s * 0.42, s * 0.7, -s * 0.2);
  g.stroke();
  g.restore();
}
