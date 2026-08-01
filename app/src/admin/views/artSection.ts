/**
 * Artwork section of the character detail view.
 *
 * Two pose slots (idle / sing). Each shows exactly what the game draws
 * today — custom PNG if installed, sculpted template otherwise — and hosts
 * the replace workflow: drop image → sanitize (metadata stripped, corner
 * background keyed, alpha-trimmed, standard frame) → preview on the game's
 * bench → save into app/public/characters/.
 */

import { artUrl, removeArt, saveArt, type CharInfo, type Pose, POSES } from '../store';
import { el, esc, download, toast, toastResult, confirmDialog } from '../ui';
import {
  fileToBitmap,
  sanitizeImage,
  canvasToPngBlob,
  IMAGE_ACCEPT,
  OUT_SIZE,
  GROUND,
} from '../imagePipeline';
import { charArtSrc, templateArtSrc } from './shared';

interface Draft {
  forId: string;
  pose: Pose;
  bitmap: ImageBitmap | null;
  tolerance: number;
  processed: HTMLCanvasElement | null;
  error: string | null;
}

let draft: Draft | null = null;
let rerender: () => void = () => {};

/** main.ts hands us its render loop so async pipeline steps can refresh. */
export function onArtRerender(fn: () => void): void {
  rerender = fn;
}

export function resetArtDraft(): void {
  draft = null;
}

function process(): void {
  if (!draft?.bitmap) return;
  const res = sanitizeImage(draft.bitmap, draft.tolerance);
  if ('error' in res) {
    draft.processed = null;
    draft.error = res.error;
  } else {
    draft.processed = res.canvas;
    draft.error = null;
  }
}

function slotCard(info: CharInfo, pose: Pose): string {
  const custom = !!artUrl(info.def.id, pose);
  const src = charArtSrc(info, pose);
  const sourceLabel = custom
    ? 'Custom PNG'
    : pose === 'sing' && artUrl(info.def.id, 'idle')
      ? 'Falls back to idle PNG'
      : templateArtSrc(info.def, pose)
        ? 'Built-in vector art'
        : 'No art';
  return `
    <div class="art-slot">
      <div class="art-slot-head">
        <span class="art-pose">${pose === 'idle' ? '😌 Idle' : '🎤 Singing'}</span>
        <span class="chip ${custom ? 'chip-good' : ''}">${sourceLabel}</span>
      </div>
      <div class="art-frame checker">${src ? `<img src="${src}" alt="${pose}" />` : '<span class="art-none">—</span>'}</div>
      <div class="art-slot-actions">
        <button class="btn btn-small" data-act="replace" data-pose="${pose}">Replace…</button>
        ${src ? `<button class="btn btn-small btn-ghost" data-act="download" data-pose="${pose}">Download</button>` : ''}
        ${custom ? `<button class="btn btn-small btn-ghost btn-danger-text" data-act="revert" data-pose="${pose}">Remove custom</button>` : ''}
      </div>
    </div>`;
}

function editorHtml(d: Draft): string {
  return `
    <div class="art-editor">
      <div class="art-editor-head">
        <b>Replace ${d.pose} artwork</b>
        <button class="btn btn-small btn-ghost" data-act="cancel">✕ Close</button>
      </div>
      <div class="art-editor-grid">
        <div>
          <div class="dropzone" tabindex="0">
            Drop a PNG/JPG here<br/>or click to browse
            <small>ideal: 1024–2048 px · white or transparent background · full body, sitting</small>
          </div>
          <input type="file" hidden accept="${IMAGE_ACCEPT}" />
          <label class="field-label">Background removal tolerance — <span data-ref="tolv">${d.tolerance}</span></label>
          <input type="range" min="0" max="90" value="${d.tolerance}" data-ref="tol" />
          <small class="hint">0 keeps the background (for already-transparent PNGs); higher removes more near-white.</small>
          ${d.error ? `<div class="error-note">${esc(d.error)}</div>` : ''}
        </div>
        <div>
          <label class="field-label">Sanitized sprite (standard frame)</label>
          <canvas class="checker art-prev" width="${OUT_SIZE}" height="${OUT_SIZE}" data-ref="prev"></canvas>
        </div>
        <div>
          <label class="field-label">On the game bench</label>
          <canvas class="art-game" width="480" height="640" data-ref="game"></canvas>
        </div>
      </div>
      <div class="art-editor-actions">
        <button class="btn btn-primary" data-act="save" ${d.processed ? '' : 'disabled'}>💾 Save into project</button>
        <button class="btn btn-ghost" data-act="dl-draft" ${d.processed ? '' : 'disabled'}>Download PNG</button>
      </div>
    </div>`;
}

function drawPreviews(host: HTMLElement): void {
  if (!draft) return;
  const prev = host.querySelector('[data-ref="prev"]') as HTMLCanvasElement | null;
  const game = host.querySelector('[data-ref="game"]') as HTMLCanvasElement | null;
  if (!prev || !game) return;

  const pg = prev.getContext('2d')!;
  pg.clearRect(0, 0, prev.width, prev.height);
  if (draft.processed) pg.drawImage(draft.processed, 0, 0);
  pg.strokeStyle = 'rgba(231,95,150,0.5)';
  pg.setLineDash([12, 10]);
  pg.lineWidth = 3;
  pg.beginPath();
  pg.moveTo(0, GROUND * OUT_SIZE);
  pg.lineTo(OUT_SIZE, GROUND * OUT_SIZE);
  pg.stroke();

  const gg = game.getContext('2d')!;
  const grad = gg.createLinearGradient(0, 0, 0, game.height);
  grad.addColorStop(0, '#c9d7f4');
  grad.addColorStop(1, '#f6d8e6');
  gg.fillStyle = grad;
  gg.fillRect(0, 0, game.width, game.height);
  gg.fillStyle = '#c08850';
  gg.fillRect(60, 540, 360, 26);
  gg.fillStyle = '#8a5a30';
  gg.fillRect(100, 566, 16, 50);
  gg.fillRect(364, 566, 16, 50);
  if (draft.processed) {
    const size = 300;
    const cx = game.width / 2;
    const cy = 540 - size * 0.49;
    gg.drawImage(draft.processed, cx - size / 2, cy - size * 0.43, size, size);
  }
}

export function renderArtSection(info: CharInfo): HTMLElement {
  const id = info.def.id;
  if (draft && draft.forId !== id) draft = null;

  const host = el(`
    <section class="card">
      <div class="card-head">
        <h2>🖼 Artwork</h2>
        <span class="hint">Custom PNGs override the built-in vector art · saved to app/public/characters/</span>
      </div>
      <div class="art-slots">${POSES.map((p) => slotCard(info, p)).join('')}</div>
      ${draft ? editorHtml(draft) : ''}
    </section>`);

  host.querySelectorAll('[data-act="replace"]').forEach((b) =>
    b.addEventListener('click', () => {
      const pose = (b as HTMLElement).dataset.pose as Pose;
      draft = { forId: id, pose, bitmap: null, tolerance: 32, processed: null, error: null };
      rerender();
    }),
  );
  host.querySelectorAll('[data-act="download"]').forEach((b) =>
    b.addEventListener('click', () => {
      const pose = (b as HTMLElement).dataset.pose as Pose;
      const cur = charArtSrc(info, pose);
      if (cur) download(cur, `${id}.${pose}${cur.startsWith('data:') ? '.svg' : '.png'}`);
    }),
  );
  host.querySelectorAll('[data-act="revert"]').forEach((b) =>
    b.addEventListener('click', () => {
      const pose = (b as HTMLElement).dataset.pose as Pose;
      void confirmDialog({
        title: `Remove custom ${pose} art?`,
        body: `<b>${esc(info.def.name)}</b> will go back to the built-in vector artwork.`,
        confirmLabel: 'Remove file',
        danger: true,
      }).then((ok) => {
        if (ok) void removeArt(id, pose).then((err) => toastResult(err, 'Custom art removed.'));
      });
    }),
  );

  if (draft) bindEditor(host);
  drawPreviews(host);
  return host;
}

function bindEditor(host: HTMLElement): void {
  const d = draft!;
  const dz = host.querySelector('.dropzone') as HTMLElement;
  const file = host.querySelector('input[type=file]') as HTMLInputElement;

  const load = async (f: File): Promise<void> => {
    const bmp = await fileToBitmap(f);
    if (typeof bmp === 'string') {
      d.error = bmp;
      d.processed = null;
    } else {
      d.bitmap = bmp;
      process();
    }
    rerender();
  };

  dz.addEventListener('click', () => file.click());
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('over');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('over');
    const f = e.dataTransfer?.files?.[0];
    if (f) void load(f);
  });
  file.addEventListener('change', () => {
    if (file.files?.[0]) void load(file.files[0]);
  });

  const tol = host.querySelector('[data-ref="tol"]') as HTMLInputElement;
  tol.addEventListener('input', () => {
    d.tolerance = parseInt(tol.value, 10);
    (host.querySelector('[data-ref="tolv"]') as HTMLElement).textContent = tol.value;
    if (d.bitmap) {
      process();
      drawPreviews(host);
      // enable/disable save without a full re-render
      (host.querySelector('[data-act="save"]') as HTMLButtonElement).disabled = !d.processed;
      (host.querySelector('[data-act="dl-draft"]') as HTMLButtonElement).disabled = !d.processed;
    }
  });

  host.querySelector('[data-act="cancel"]')!.addEventListener('click', () => {
    draft = null;
    rerender();
  });
  host.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    if (!d.processed) return;
    void canvasToPngBlob(d.processed).then((png) =>
      saveArt(d.forId, d.pose, png).then((err) => {
        if (!err) draft = null;
        toastResult(err, `Saved ${d.forId}.${d.pose}.png — rebuild to ship it.`);
      }),
    );
  });
  host.querySelector('[data-act="dl-draft"]')!.addEventListener('click', () => {
    if (!d.processed) return;
    download(d.processed.toDataURL('image/png'), `${d.forId}.${d.pose}.png`);
    toast('Downloaded — move it into app/public/characters/.');
  });
}
