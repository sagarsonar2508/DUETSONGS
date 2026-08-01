/**
 * App tab: everything app-wide.
 *
 *   Branding — home-screen title & tagline (public/content.json)
 *   Economy  — every coin price in one table (public/content.json)
 *   Icons    — app icon & splash source images (app/assets/*.png, the
 *              inputs for `npx @capacitor/assets generate`)
 */

import { SPECIES, ANIMALS } from '../../data/animals';
import { SONGS } from '../../data/songs';
import { DEFAULT_BRANDING } from '../../core/content';
import {
  state,
  show,
  canWrite,
  saveBranding,
  saveEconomy,
  resetEconomy,
  saveIcon,
  DEFAULT_COSTS,
  ICON_ASSETS,
  type AppPage,
  type IconFile,
} from '../store';
import { el, esc, toast, toastResult, confirmDialog } from '../ui';
import { fileToBitmap, coverSquare, canvasToPngBlob, IMAGE_ACCEPT } from '../imagePipeline';

/* -------------------------------- sidebar -------------------------------- */

const PAGES: { page: AppPage; icon: string; label: string; sub: string }[] = [
  { page: 'branding', icon: '✨', label: 'Branding', sub: 'title & tagline' },
  { page: 'economy', icon: '💰', label: 'Economy', sub: 'all coin prices' },
  { page: 'icons', icon: '📱', label: 'App icons', sub: 'icon & splash sources' },
];

export function renderAppSidebar(): HTMLElement {
  const rows = PAGES.map((p) => {
    const selected = state.view.kind === 'app' && state.view.page === p.page;
    return `
      <button class="roster-row ${selected ? 'selected' : ''}" data-page="${p.page}">
        <span class="roster-thumb">${p.icon}</span>
        <span class="roster-text">
          <span class="roster-name">${p.label}</span>
          <span class="roster-sub">${p.sub}</span>
        </span>
      </button>`;
  }).join('');

  const host = el(`
    <aside class="sidebar">
      <div class="roster-list">
        <div class="roster-group">App settings</div>
        ${rows}
      </div>
      <div class="sidebar-note">Branding & prices ship via public/content.json; icons feed the Capacitor asset generator.</div>
    </aside>`);

  host.querySelectorAll('.roster-row').forEach((b) =>
    b.addEventListener('click', () =>
      show({ kind: 'app', page: (b as HTMLElement).dataset.page as AppPage }),
    ),
  );
  return host;
}

export function renderAppPage(page: AppPage): HTMLElement {
  switch (page) {
    case 'branding':
      return brandingPage();
    case 'economy':
      return economyPage();
    case 'icons':
      return iconsPage();
  }
}

/* -------------------------------- branding -------------------------------- */

function brandingPage(): HTMLElement {
  const b = state.content.branding;
  const host = el(`
    <div class="detail">
      <header class="detail-head">
        <div class="detail-title">
          <h1>✨ Branding</h1>
          <p class="detail-blurb">The home screen's title and tagline. Saved to public/content.json — leave a field empty to fall back to the default.</p>
        </div>
      </header>
      <section class="card">
        <div class="brand-grid">
          <div>
            <label class="field">
              <span>Title <small>default: ${esc(DEFAULT_BRANDING.title)}</small></span>
              <input maxlength="28" value="${esc(b.title)}" data-ref="title" />
            </label>
            <label class="field">
              <span>Tagline <small>default: ${esc(DEFAULT_BRANDING.tagline)}</small></span>
              <input maxlength="60" value="${esc(b.tagline)}" data-ref="tagline" />
            </label>
            <div class="form-actions">
              <button class="btn btn-primary" data-act="save">💾 Save branding</button>
            </div>
          </div>
          <div class="brand-preview">
            <span class="field-label">Home screen preview</span>
            <div class="brand-stage">
              <div class="brand-paw">🐾</div>
              <div class="brand-title" data-ref="prev-title"></div>
              <div class="brand-tagline" data-ref="prev-tagline"></div>
            </div>
          </div>
        </div>
      </section>
    </div>`);

  const title = host.querySelector('[data-ref="title"]') as HTMLInputElement;
  const tagline = host.querySelector('[data-ref="tagline"]') as HTMLInputElement;
  const pvT = host.querySelector('[data-ref="prev-title"]') as HTMLElement;
  const pvG = host.querySelector('[data-ref="prev-tagline"]') as HTMLElement;

  const refresh = (): void => {
    const t = title.value.trim() || DEFAULT_BRANDING.title;
    const [first, ...rest] = t.split(' ');
    pvT.innerHTML = rest.length
      ? `${esc(first)}<span> ${esc(rest.join(' '))}</span>`
      : esc(first);
    pvG.textContent = tagline.value.trim() || DEFAULT_BRANDING.tagline;
  };
  title.addEventListener('input', refresh);
  tagline.addEventListener('input', refresh);
  refresh();

  host.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    void saveBranding(title.value, tagline.value).then((err) =>
      toastResult(err, 'Branding saved — reload the game to see it.'),
    );
  });
  return host;
}

/* -------------------------------- economy --------------------------------- */

function priceRow(id: string, label: string, sub: string, value: number, def: number): string {
  return `
    <div class="price-line ${value !== def ? 'overridden' : ''}" data-id="${esc(id)}">
      <div class="price-name"><b>${esc(label)}</b><small>${esc(sub)}</small></div>
      <input type="number" min="0" max="999999" step="50" value="${value}" />
      <button class="btn btn-small btn-ghost price-reset" title="Back to default (${def})" ${value !== def ? '' : 'hidden'}>↩ ${def}</button>
    </div>`;
}

function economyPage(): HTMLElement {
  const e = state.content.economy;
  const speciesRows = SPECIES.filter((s) => s.cost !== 0 || (e.speciesCosts[s.id] ?? 0) !== 0 || DEFAULT_COSTS.species[s.id] !== 0)
    .map((s) => {
      const pair = ANIMALS.filter((a) => a.species === s.id).map((a) => a.name).join(' & ');
      return priceRow(s.id, s.id, pair || 'couple', e.speciesCosts[s.id] ?? DEFAULT_COSTS.species[s.id], DEFAULT_COSTS.species[s.id]);
    })
    .join('');
  const songRows = SONGS.map((s) =>
    priceRow(s.id, s.title, s.composer, e.songCosts[s.id] ?? DEFAULT_COSTS.songs[s.id], DEFAULT_COSTS.songs[s.id]),
  ).join('');
  const customChar = e.customCharCost ?? DEFAULT_COSTS.customChar;

  const host = el(`
    <div class="detail">
      <header class="detail-head">
        <div class="detail-title">
          <h1>💰 Economy</h1>
          <p class="detail-blurb">
            Every coin price in the game, in one place. Only values that differ from the code
            defaults are written to content.json, so future default changes still apply where you
            haven't overridden them. 0 = free.
          </p>
        </div>
      </header>

      <section class="card"><div class="card-head"><h2>🐾 Species couples</h2><span class="hint">unlocking a species unlocks both characters</span></div>
        <div class="price-table" data-group="species">${speciesRows}</div>
      </section>
      <section class="card"><div class="card-head"><h2>🎵 Songs</h2></div>
        <div class="price-table" data-group="songs">${songRows}</div>
      </section>
      <section class="card"><div class="card-head"><h2>⭐ Create your own star</h2></div>
        <div class="price-table" data-group="custom">
          ${priceRow('customChar', 'Custom character', 'photo + voice, on-device', customChar, DEFAULT_COSTS.customChar)}
        </div>
      </section>

      <div class="economy-actions">
        <button class="btn btn-primary" data-act="save">💾 Save all prices</button>
        <button class="btn btn-ghost" data-act="reset">↩ Reset everything to defaults</button>
      </div>
    </div>`);

  // per-row reset buttons
  host.querySelectorAll('.price-line').forEach((line) => {
    const input = line.querySelector('input') as HTMLInputElement;
    const reset = line.querySelector('.price-reset') as HTMLButtonElement;
    reset.addEventListener('click', () => {
      input.value = reset.textContent!.replace('↩', '').trim();
      input.dispatchEvent(new Event('input'));
    });
    input.addEventListener('input', () => {
      const def = Number(reset.textContent!.replace('↩', '').trim());
      const overridden = Number(input.value) !== def;
      line.classList.toggle('overridden', overridden);
      reset.hidden = !overridden;
    });
  });

  const collect = (group: string): Record<string, number> => {
    const out: Record<string, number> = {};
    host.querySelectorAll(`[data-group="${group}"] .price-line`).forEach((line) => {
      const id = (line as HTMLElement).dataset.id!;
      const v = Number((line.querySelector('input') as HTMLInputElement).value);
      out[id] = Math.max(0, Math.min(999999, Math.round(Number.isFinite(v) ? v : 0)));
    });
    return out;
  };

  host.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    void saveEconomy({
      species: collect('species'),
      songs: collect('songs'),
      customChar: collect('custom').customChar ?? DEFAULT_COSTS.customChar,
    }).then((err) => toastResult(err, 'Prices saved — reload the game to see them.'));
  });

  host.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
    void confirmDialog({
      title: 'Reset all prices?',
      body: 'Every species, song and the custom-character price goes back to the code defaults.',
      confirmLabel: 'Reset to defaults',
      danger: true,
    }).then((ok) => {
      if (ok) void resetEconomy().then((err) => toastResult(err, 'All prices back to defaults.'));
    });
  });

  return host;
}

/* --------------------------------- icons ---------------------------------- */

function iconsPage(): HTMLElement {
  const connected = canWrite();
  const cards = ICON_ASSETS.map((a) => {
    const url = state.iconUrls[a.file];
    return `
      <div class="icon-slot" data-file="${a.file}">
        <div class="icon-frame checker ${a.file.startsWith('splash') ? 'wide' : ''}">
          ${url ? `<img src="${url}" alt="" />` : `<span class="art-none">${connected ? '—' : '🔒'}</span>`}
        </div>
        <div class="icon-info">
          <b>${a.label}</b>
          <small>${a.file} · ${a.size}×${a.size}</small>
          <small class="hint">${a.hint}</small>
        </div>
        <button class="btn btn-small" data-act="replace">Replace…</button>
        <input type="file" hidden accept="${IMAGE_ACCEPT}" />
      </div>`;
  }).join('');

  const host = el(`
    <div class="detail">
      <header class="detail-head">
        <div class="detail-title">
          <h1>📱 App icons & splash</h1>
          <p class="detail-blurb">
            The source images in app/assets/ that Capacitor turns into every Android launcher icon
            and splash size. Uploads are center-cropped to the exact size and re-encoded (metadata
            stripped).${connected ? '' : ' <b>Connect the app folder to view and replace them.</b>'}
          </p>
        </div>
      </header>
      <section class="card">
        <div class="icon-grid">${cards}</div>
        <div class="card-foot">
          <span class="hint">After replacing, regenerate the platform assets:&nbsp;
          <code>npx @capacitor/assets generate --android</code>&nbsp; then rebuild the APK.
          The in-game favicon is separate (app/index.html).</span>
        </div>
      </section>
    </div>`);

  host.querySelectorAll('.icon-slot').forEach((slot) => {
    const file = (slot as HTMLElement).dataset.file as IconFile;
    const spec = ICON_ASSETS.find((a) => a.file === file)!;
    const input = slot.querySelector('input') as HTMLInputElement;
    const accept = async (f: File): Promise<void> => {
      const bmp = await fileToBitmap(f);
      if (typeof bmp === 'string') {
        toast(bmp, false);
        return;
      }
      if (Math.min(bmp.width, bmp.height) < spec.size / 2) {
        toast(`That image is quite small (${bmp.width}×${bmp.height}) — ${spec.size}×${spec.size} is ideal. Saved anyway, upscaled.`, false);
      }
      const png = await canvasToPngBlob(coverSquare(bmp, spec.size));
      const err = await saveIcon(file, png);
      toastResult(err, `${spec.label} saved — run the asset generator to apply.`);
    };
    slot.querySelector('[data-act="replace"]')!.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      if (input.files?.[0]) void accept(input.files[0]);
    });
  });

  return host;
}
