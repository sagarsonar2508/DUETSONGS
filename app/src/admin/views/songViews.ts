/**
 * Songs tab: sidebar list, overview page, and per-song detail with poster
 * management (upload → cover-cropped 512×512 PNG → public/posters/) and
 * price editing (override written to public/content.json).
 */

import { DIFFICULTY_LABEL } from '../../data/songs';
import {
  songInfos,
  songInfo,
  posterUrl,
  savePoster,
  removePoster,
  saveSongCost,
  show,
  state,
  type SongInfo,
} from '../store';
import { el, esc, toast, toastResult, confirmDialog } from '../ui';
import { fileToBitmap, coverSquare, canvasToPngBlob, IMAGE_ACCEPT } from '../imagePipeline';

const POSTER_SIZE = 512;

function themeSwatch(s: SongInfo): string {
  return `style="background:linear-gradient(120deg,${s.def.theme.top},${s.def.theme.bottom})"`;
}

function thumb(s: SongInfo): string {
  const url = posterUrl(s.def.id);
  return url
    ? `<span class="roster-thumb"><img src="${url}" alt="" /></span>`
    : `<span class="roster-thumb" ${themeSwatch(s)}>🎵</span>`;
}

/* -------------------------------- sidebar -------------------------------- */

export function renderSongsSidebar(): HTMLElement {
  const songs = songInfos();
  const rows = songs
    .map((s) => {
      const selected = state.view.kind === 'song' && state.view.id === s.def.id;
      return `
        <button class="roster-row ${selected ? 'selected' : ''}" data-id="${esc(s.def.id)}">
          ${thumb(s)}
          <span class="roster-text">
            <span class="roster-name">${esc(s.def.title)}</span>
            <span class="roster-sub">${esc(s.def.composer)}</span>
          </span>
          <span class="roster-badges">
            ${s.poster ? '<span class="mini-badge" title="Has poster">🖼</span>' : ''}
            <span class="mini-chip ${s.cost === 0 ? 'chip-free' : ''}">${s.cost === 0 ? 'free' : `● ${s.cost}`}</span>
          </span>
        </button>`;
    })
    .join('');

  const host = el(`
    <aside class="sidebar">
      <div class="roster-list">
        <div class="roster-group">Song library <span>${songs.length}</span></div>
        ${rows}
      </div>
      <div class="sidebar-note">Melodies & themes live in code (src/data/songs.ts) — posters and prices are editable here.</div>
    </aside>`);

  host.querySelectorAll('.roster-row').forEach((b) =>
    b.addEventListener('click', () => show({ kind: 'song', id: (b as HTMLElement).dataset.id! })),
  );
  return host;
}

/* ------------------------------ overview page ----------------------------- */

export function renderSongsHome(): HTMLElement {
  const songs = songInfos();
  const withPoster = songs.filter((s) => s.poster).length;
  const free = songs.filter((s) => s.cost === 0).length;
  const host = el(`
    <div class="detail welcome">
      <header class="detail-head">
        <div class="detail-title">
          <h1>🎵 Songs</h1>
          <p class="detail-blurb">
            Give every song a poster (shown on its card in the song list) and tune unlock prices.
            Pick a song from the left to get started.
          </p>
        </div>
      </header>
      <section class="stat-row">
        <div class="stat"><b>${songs.length}</b><span>songs</span><small>${free} free · ${songs.length - free} paid</small></div>
        <div class="stat"><b>${withPoster}</b><span>with posters</span><small>${songs.length - withPoster} using gradient cards</small></div>
        <div class="stat"><b>${Object.keys(state.content.economy.songCosts).length}</b><span>price overrides</span><small>vs code defaults</small></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Poster guidelines</h2></div>
        <ul class="steps">
          <li>Square-ish artwork works best — uploads are center-cropped to a ${POSTER_SIZE}×${POSTER_SIZE} PNG (metadata stripped).</li>
          <li>Posters appear as a rounded thumbnail on the song card, over the card's gradient.</li>
          <li>No poster is fine — cards simply keep their themed gradient look.</li>
        </ul>
      </section>
    </div>`);
  return host;
}

/* ------------------------------- detail page ------------------------------ */

export function renderSongDetail(id: string): HTMLElement {
  const s = songInfo(id);
  if (!s) return renderSongsHome();
  const url = posterUrl(id);

  const host = el(`
    <div class="detail">
      <header class="detail-head">
        <div class="detail-portrait" ${url ? '' : themeSwatch(s)}>
          ${url ? `<img src="${url}" alt="" />` : '🎵'}
        </div>
        <div class="detail-title">
          <h1>${esc(s.def.title)}</h1>
          <div class="detail-chips">
            <span class="chip chip-mono">${esc(s.def.id)}</span>
            <span class="chip">${esc(s.def.composer)}</span>
            <span class="chip">${DIFFICULTY_LABEL[s.def.difficulty]}</span>
            <span class="chip">${s.def.bpm} bpm</span>
            <span class="chip ${s.cost === 0 ? 'chip-good' : ''}">${s.cost === 0 ? 'free' : `● ${s.cost} coins`}</span>
          </div>
        </div>
      </header>

      <section class="card">
        <div class="card-head">
          <h2>🖼 Poster</h2>
          <span class="hint">saved as public/posters/${esc(id)}.png · shown on the song card</span>
        </div>
        <div class="poster-grid">
          <div class="poster-preview checker">${url ? `<img src="${url}" alt="" />` : `<div class="poster-empty" ${themeSwatch(s)}><span>no poster —<br/>gradient card</span></div>`}</div>
          <div class="poster-actions">
            <div class="dropzone" tabindex="0">
              Drop a poster image here<br/>or click to browse
              <small>PNG/JPG/WebP · center-cropped to ${POSTER_SIZE}×${POSTER_SIZE}</small>
            </div>
            <input type="file" hidden accept="${IMAGE_ACCEPT}" />
            ${url ? `<button class="btn btn-small btn-ghost btn-danger-text" data-act="remove-poster">Remove poster</button>` : ''}
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>💰 Price</h2>
          <span class="hint">0 = free · code default: ${s.defaultCost} · override saved to content.json</span>
        </div>
        <div class="price-row">
          <label class="field price-field">
            <span>Unlock cost (coins)</span>
            <input type="number" min="0" max="999999" step="50" value="${s.cost}" data-ref="cost" />
          </label>
          <button class="btn btn-primary" data-act="save-cost">💾 Save price</button>
          ${s.cost !== s.defaultCost ? `<button class="btn btn-ghost" data-act="reset-cost">↩ Default (${s.defaultCost})</button>` : ''}
        </div>
      </section>
    </div>`);

  const dz = host.querySelector('.dropzone') as HTMLElement;
  const file = host.querySelector('input[type=file]') as HTMLInputElement;
  const accept = async (f: File): Promise<void> => {
    const bmp = await fileToBitmap(f);
    if (typeof bmp === 'string') {
      toast(bmp, false);
      return;
    }
    const png = await canvasToPngBlob(coverSquare(bmp, POSTER_SIZE));
    const err = await savePoster(id, png);
    toastResult(err, `Poster saved for “${s.def.title}”.`);
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
    if (f) void accept(f);
  });
  file.addEventListener('change', () => {
    if (file.files?.[0]) void accept(file.files[0]);
  });

  host.querySelector('[data-act="remove-poster"]')?.addEventListener('click', () => {
    void confirmDialog({
      title: 'Remove this poster?',
      body: `The song card goes back to its gradient look.`,
      confirmLabel: 'Remove poster',
      danger: true,
    }).then((ok) => {
      if (ok) void removePoster(id).then((err) => toastResult(err, 'Poster removed.'));
    });
  });

  const costInput = host.querySelector('[data-ref="cost"]') as HTMLInputElement;
  host.querySelector('[data-act="save-cost"]')!.addEventListener('click', () => {
    const v = Math.max(0, Math.min(999999, Math.round(Number(costInput.value) || 0)));
    void saveSongCost(id, v).then((err) => toastResult(err, `Price saved: ${v === 0 ? 'free' : `${v} coins`}.`));
  });
  host.querySelector('[data-act="reset-cost"]')?.addEventListener('click', () => {
    void saveSongCost(id, s.defaultCost).then((err) =>
      toastResult(err, `Price back to default (${s.defaultCost}).`),
    );
  });

  return host;
}
