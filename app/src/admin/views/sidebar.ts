/**
 * Roster sidebar: searchable character list with live thumbnails and
 * asset-status badges, grouped into built-in and studio-created sections.
 */

import { roster, show, state, type CharInfo } from '../store';
import { el, esc } from '../ui';
import { charArtSrc, SEX_ICON } from './shared';

let query = '';

function matches(c: CharInfo, q: string): boolean {
  const hay = `${c.def.name} ${c.def.speciesName} ${c.def.id} ${c.def.species}`.toLowerCase();
  return hay.includes(q);
}

function row(c: CharInfo): string {
  const selected = state.view.kind === 'character' && state.view.id === c.def.id;
  const src = charArtSrc(c, 'idle');
  const hasArt = c.art.idle || c.art.sing;
  return `
    <button class="roster-row ${selected ? 'selected' : ''} ${c.hidden ? 'is-hidden' : ''}"
            data-id="${esc(c.def.id)}">
      <span class="roster-thumb">${src ? `<img src="${src}" alt="" />` : '🐾'}</span>
      <span class="roster-text">
        <span class="roster-name">${esc(c.def.name)}</span>
        <span class="roster-sub">${esc(c.def.speciesName)} ${SEX_ICON[c.def.sex]}</span>
      </span>
      <span class="roster-badges">
        ${c.hidden ? '<span class="mini-chip chip-hidden" title="Hidden from the game">hidden</span>' : ''}
        ${hasArt ? '<span class="mini-badge" title="Custom artwork">🖼</span>' : ''}
        ${c.voice ? '<span class="mini-badge" title="Recorded voice">🎙</span>' : ''}
      </span>
    </button>`;
}

export function renderSidebar(): HTMLElement {
  const all = roster();
  const q = query.trim().toLowerCase();
  const builtins = all.filter((c) => c.builtin && matches(c, q));
  const studio = all.filter((c) => !c.builtin && matches(c, q));

  const host = el(`
    <aside class="sidebar">
      <div class="sidebar-search">
        <input type="search" placeholder="Search ${all.length} characters…" value="${esc(query)}" />
      </div>
      <div class="roster-list">
        <div class="roster-group">Built-in roster <span>${builtins.length}</span></div>
        ${builtins.map(row).join('') || '<div class="roster-empty">No matches</div>'}
        <div class="roster-group">Created in studio <span>${studio.length}</span></div>
        ${
          studio.map(row).join('') ||
          `<div class="roster-empty">${q ? 'No matches' : 'None yet — add one below'}</div>`
        }
      </div>
      <button class="btn btn-primary sidebar-new">＋ &nbsp;New character</button>
    </aside>`);

  const input = host.querySelector('input')!;
  input.addEventListener('input', () => {
    query = input.value;
    // targeted refilter: rebuild only the list so the input keeps focus
    const fresh = renderSidebar();
    host.querySelector('.roster-list')!.replaceWith(fresh.querySelector('.roster-list')!);
    bindRows(host);
  });

  bindRows(host);
  host.querySelector('.sidebar-new')!.addEventListener('click', () => show({ kind: 'create' }));
  return host;
}

function bindRows(host: HTMLElement): void {
  host.querySelectorAll('.roster-row').forEach((b) =>
    b.addEventListener('click', () =>
      show({ kind: 'character', id: (b as HTMLElement).dataset.id! }),
    ),
  );
}
