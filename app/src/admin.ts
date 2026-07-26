/**
 * Local art admin panel — dev-server only (never part of the production
 * build; `vite build` only bundles index.html).
 *
 * Workflow: pick a character + pose slot → drop a Midjourney PNG/JPG →
 * the panel sanitizes it entirely in-browser (decode + re-encode strips all
 * metadata; SVG uploads are rejected; background removal; auto-trim;
 * normalize into the game's standard 100-unit frame) → writes
 * <charId>.<pose>.png into app/public/characters/ via the browser's
 * File System Access API (or downloads it as a fallback).
 * Then rebuild/redeploy — the game auto-detects the files.
 */

import { ANIMALS, animalById } from './data/animals';

const POSES = ['idle', 'sing'] as const;
type PoseId = (typeof POSES)[number];

const OUT_SIZE = 1024;
// standard frame: ground line at 92%, art occupies up to 78% height, centered
const GROUND = 0.92;
const TOP = 0.09;
const MAX_W = 0.88;

const root = document.getElementById('admin')!;
let selected: { charId: string; pose: PoseId } | null = null;
let processed: HTMLCanvasElement | null = null;
let rawBitmap: ImageBitmap | null = null;
let tolerance = 32;
let dirHandle: FileSystemDirectoryHandle | null = null;

const style = document.createElement('style');
style.textContent = `
  body { font-family: system-ui, sans-serif; margin: 0; background: #f6eef4; color: #4a3a55; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22px; } h2 { font-size: 16px; margin: 18px 0 8px; }
  .note { background: #fff3f8; border: 1px solid #f0c8dc; border-radius: 10px; padding: 10px 14px; font-size: 13.5px; margin: 10px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 8px; }
  .slot { background: #fff; border: 2px solid transparent; border-radius: 10px; padding: 8px; text-align: center; cursor: pointer; font-size: 12.5px; }
  .slot.sel { border-color: #e75f96; }
  .slot .have { color: #2e9e5b; font-weight: 700; }
  .slot .miss { color: #b0a0b8; }
  .row { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; margin-top: 14px; }
  .drop { width: 320px; height: 220px; border: 2.5px dashed #d0a8c0; border-radius: 14px; display: flex; align-items: center; justify-content: center; text-align: center; background: #fff; font-size: 14px; padding: 12px; }
  .drop.over { background: #ffeaf3; border-color: #e75f96; }
  canvas.preview { background:
    linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%),
    linear-gradient(45deg, #eee 25%, #fff 25%, #fff 75%, #eee 75%);
    background-size: 20px 20px; background-position: 0 0, 10px 10px;
    border-radius: 14px; width: 320px; height: 320px; }
  canvas.game { border-radius: 14px; width: 240px; height: 320px; }
  button { font-family: inherit; font-weight: 700; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; background: #e75f96; color: #fff; margin: 4px 6px 4px 0; }
  button.sec { background: #e8dbe8; color: #4a3a55; }
  label { font-size: 13px; font-weight: 600; display: block; margin: 8px 0 2px; }
  input[type=range] { width: 200px; }
`;
document.head.appendChild(style);

function slotKey(charId: string, pose: PoseId): string {
  return `${charId}.${pose}`;
}

const present = new Map<string, boolean>();

async function checkPresent(): Promise<void> {
  await Promise.all(
    ANIMALS.flatMap((a) =>
      POSES.map(
        (pose) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              present.set(slotKey(a.id, pose), true);
              resolve();
            };
            img.onerror = () => {
              present.set(slotKey(a.id, pose), false);
              resolve();
            };
            img.src = `/characters/${slotKey(a.id, pose)}.png?t=${Date.now()}`;
          }),
      ),
    ),
  );
}

function render(): void {
  const slots = ANIMALS.flatMap((a) =>
    POSES.map((pose) => {
      const key = slotKey(a.id, pose);
      const sel = selected && selected.charId === a.id && selected.pose === pose;
      return `<div class="slot ${sel ? 'sel' : ''}" data-char="${a.id}" data-pose="${pose}">
        <div><b>${a.name}</b> ${a.sex === 'm' ? '♂' : '♀'}</div>
        <div>${pose}</div>
        <div class="${present.get(key) ? 'have' : 'miss'}">${present.get(key) ? '● custom art' : '○ template'}</div>
      </div>`;
    }),
  ).join('');

  root.innerHTML = `
  <div class="wrap">
    <h1>🎨 Animal Duet — Art Admin <small style="font-weight:400">(local only, dev server)</small></h1>
    <div class="note">
      Everything happens in your browser on this machine. Images are sanitized by decoding and
      re-encoding to a clean PNG (all metadata/EXIF is stripped; SVG files are rejected).
      After saving, run <code>npm run build</code> (or <code>npm run apk</code>) to ship the new art.
    </div>
    <h2>1 · Pick a slot ${selected ? `— <b>${animalById(selected.charId).name} / ${selected.pose}</b>` : ''}</h2>
    <div class="grid">${slots}</div>
    <h2>2 · Drop artwork</h2>
    <div class="row">
      <div>
        <div class="drop" id="drop">Drop a PNG/JPG here<br/>or click to browse<br/><small>(ideal: 1024–2048px, white or transparent background, character centered, full body sitting)</small></div>
        <input type="file" id="file" accept="image/png,image/jpeg,image/webp" hidden />
        <label>Background removal tolerance: <span id="tolv">${tolerance}</span></label>
        <input type="range" id="tol" min="0" max="90" value="${tolerance}" />
        <div><small>0 = keep background (already-transparent PNGs). Higher removes more near-white.</small></div>
      </div>
      <div>
        <label>Sanitized sprite (standard frame)</label>
        <canvas class="preview" id="prev" width="${OUT_SIZE}" height="${OUT_SIZE}"></canvas>
      </div>
      <div>
        <label>In-game preview</label>
        <canvas class="game" id="game" width="480" height="640"></canvas>
      </div>
    </div>
    <h2>3 · Save into the game</h2>
    <button id="saveDir">Save to project (pick app/public/characters once)</button>
    <button id="saveDl" class="sec">Download PNG instead</button>
    <span id="status"></span>
  </div>`;

  root.querySelectorAll('.slot').forEach((el) =>
    el.addEventListener('click', () => {
      selected = {
        charId: (el as HTMLElement).dataset.char!,
        pose: (el as HTMLElement).dataset.pose as PoseId,
      };
      render();
      if (rawBitmap) void process();
    }),
  );

  const drop = document.getElementById('drop')!;
  const file = document.getElementById('file') as HTMLInputElement;
  drop.addEventListener('click', () => file.click());
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files?.[0];
    if (f) void load(f);
  });
  file.addEventListener('change', () => {
    if (file.files?.[0]) void load(file.files[0]);
  });
  (document.getElementById('tol') as HTMLInputElement).addEventListener('input', (e) => {
    tolerance = parseInt((e.target as HTMLInputElement).value, 10);
    document.getElementById('tolv')!.textContent = String(tolerance);
    if (rawBitmap) void process();
  });
  document.getElementById('saveDir')!.addEventListener('click', () => void saveToProject());
  document.getElementById('saveDl')!.addEventListener('click', () => download());

  drawPreviews();
}

function status(msg: string, ok = true): void {
  const el = document.getElementById('status');
  if (el) {
    el.textContent = msg;
    (el as HTMLElement).style.color = ok ? '#2e9e5b' : '#c0392b';
  }
}

async function load(f: File): Promise<void> {
  // sanitization gate: raster formats only, size caps
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
    status('Rejected: only PNG/JPG/WebP raster images are accepted (no SVG).', false);
    return;
  }
  if (f.size > 25 * 1024 * 1024) {
    status('Rejected: file over 25 MB.', false);
    return;
  }
  try {
    rawBitmap = await createImageBitmap(f);
  } catch {
    status('Could not decode that file as an image.', false);
    return;
  }
  await process();
}

async function process(): Promise<void> {
  if (!rawBitmap) return;
  // work canvas capped at 2048 on the long edge — re-encode drops metadata
  const scale = Math.min(1, 2048 / Math.max(rawBitmap.width, rawBitmap.height));
  const w = Math.round(rawBitmap.width * scale);
  const h = Math.round(rawBitmap.height * scale);
  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wg = work.getContext('2d', { willReadFrequently: true })!;
  wg.drawImage(rawBitmap, 0, 0, w, h);

  const data = wg.getImageData(0, 0, w, h);
  if (tolerance > 0) removeBackground(data, w, h, tolerance);
  wg.putImageData(data, 0, 0);

  // trim transparent margins
  const bounds = trimBounds(data, w, h);
  if (!bounds) {
    status('Image is fully transparent after background removal — lower the tolerance.', false);
    return;
  }
  const tw = bounds.x1 - bounds.x0 + 1;
  const th = bounds.y1 - bounds.y0 + 1;

  // normalize into standard frame
  processed = document.createElement('canvas');
  processed.width = OUT_SIZE;
  processed.height = OUT_SIZE;
  const pg = processed.getContext('2d')!;
  const availH = (GROUND - TOP) * OUT_SIZE;
  const availW = MAX_W * OUT_SIZE;
  const k = Math.min(availH / th, availW / tw);
  const dw = tw * k;
  const dh = th * k;
  pg.drawImage(
    work,
    bounds.x0, bounds.y0, tw, th,
    (OUT_SIZE - dw) / 2, GROUND * OUT_SIZE - dh, dw, dh,
  );
  status('Sanitized ✓ — metadata stripped, background removed, frame normalized.');
  drawPreviews();
}

/** flood-fill background removal from the four corners */
function removeBackground(img: ImageData, w: number, h: number, tol: number): void {
  const d = img.data;
  const idx = (x: number, y: number) => (y * w + x) * 4;
  const seeds = [idx(0, 0), idx(w - 1, 0), idx(0, h - 1), idx(w - 1, h - 1)];
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const s of seeds) {
    const p = s / 4;
    if (d[s + 3] < 10) continue; // already transparent corners → nothing to key out
    stack.push(p);
  }
  if (stack.length === 0) return;
  const r0 = d[stack[0] * 4];
  const g0 = d[stack[0] * 4 + 1];
  const b0 = d[stack[0] * 4 + 2];
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

function trimBounds(img: ImageData, w: number, h: number) {
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

function drawPreviews(): void {
  const prev = document.getElementById('prev') as HTMLCanvasElement | null;
  const game = document.getElementById('game') as HTMLCanvasElement | null;
  if (!prev || !game) return;
  const pgc = prev.getContext('2d')!;
  pgc.clearRect(0, 0, prev.width, prev.height);
  if (processed) pgc.drawImage(processed, 0, 0);
  // frame guides
  pgc.strokeStyle = 'rgba(231,95,150,0.5)';
  pgc.setLineDash([12, 10]);
  pgc.lineWidth = 3;
  pgc.beginPath();
  pgc.moveTo(0, GROUND * OUT_SIZE);
  pgc.lineTo(OUT_SIZE, GROUND * OUT_SIZE);
  pgc.stroke();

  const gg = game.getContext('2d')!;
  const grad = gg.createLinearGradient(0, 0, 0, game.height);
  grad.addColorStop(0, '#c9d7f4');
  grad.addColorStop(1, '#f6d8e6');
  gg.fillStyle = grad;
  gg.fillRect(0, 0, game.width, game.height);
  // bench
  gg.fillStyle = '#c08850';
  gg.fillRect(60, 540, 360, 26);
  gg.fillStyle = '#8a5a30';
  gg.fillRect(100, 566, 16, 50);
  gg.fillRect(364, 566, 16, 50);
  if (processed) {
    const size = 300;
    // same alignment the game uses: ground at +0.49·size below center
    const cx = game.width / 2;
    const cy = 540 - size * 0.49;
    gg.drawImage(processed, cx - size / 2, cy - size * 0.43, size, size);
  }
}

async function saveToProject(): Promise<void> {
  if (!processed || !selected) {
    status('Pick a slot and drop an image first.', false);
    return;
  }
  const picker = (window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  if (!picker) {
    status('This browser lacks the File System Access API — use Download instead.', false);
    return;
  }
  try {
    if (!dirHandle) {
      dirHandle = await picker.call(window, { mode: 'readwrite' });
    }
    const name = `${slotKey(selected.charId, selected.pose)}.png`;
    const blob: Blob = await new Promise((res) => processed!.toBlob((b) => res(b!), 'image/png'));
    const fh = await dirHandle.getFileHandle(name, { create: true });
    const ws = await (fh as unknown as { createWritable: () => Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }).createWritable();
    await ws.write(blob);
    await ws.close();
    present.set(slotKey(selected.charId, selected.pose), true);
    status(`Saved ${name} ✓ — rebuild to ship it.`);
    render();
  } catch (e) {
    status(`Save failed: ${(e as Error).message}`, false);
  }
}

function download(): void {
  if (!processed || !selected) {
    status('Pick a slot and drop an image first.', false);
    return;
  }
  const a = document.createElement('a');
  a.download = `${slotKey(selected.charId, selected.pose)}.png`;
  a.href = processed.toDataURL('image/png');
  a.click();
  status('Downloaded — move it into app/public/characters/ and rebuild.');
}

void checkPresent().then(render);
