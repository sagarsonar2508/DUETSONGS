/**
 * Character detail view: identity header, artwork, voice, details
 * (read-only for built-ins, editable form for studio characters), and a
 * danger zone (hide/restore built-ins, delete studio characters).
 */

import { type CharInfo, setHidden, deleteCharacter, updateCharacter, show } from '../store';
import { el, esc, confirmDialog, toastResult } from '../ui';
import { charArtSrc, SEX_ICON, TREAT_OPTIONS, COLOR_FIELDS, patchRegister } from './shared';
import { renderArtSection } from './artSection';
import { renderVoiceSection } from './voiceSection';
import { characterForm } from './characterForm';
import { setCreatePrefill } from './createView';

function headerHtml(info: CharInfo): string {
  const d = info.def;
  const src = charArtSrc(info, 'idle');
  return `
    <header class="detail-head">
      <div class="detail-portrait checker">${src ? `<img src="${src}" alt="" />` : '🐾'}</div>
      <div class="detail-title">
        <h1>${esc(d.name)} <span class="sex-mark ${d.sex}">${SEX_ICON[d.sex]}</span></h1>
        <div class="detail-chips">
          <span class="chip chip-mono">${esc(d.id)}</span>
          <span class="chip">${esc(d.speciesName)} · ${d.species}</span>
          <span class="chip ${info.builtin ? '' : 'chip-star'}">${info.builtin ? 'built-in' : '⭐ studio'}</span>
          ${info.hidden ? '<span class="chip chip-hidden">hidden from game</span>' : ''}
        </div>
        ${d.blurb ? `<p class="detail-blurb">${esc(d.blurb)}</p>` : ''}
      </div>
    </header>`;
}

function builtinDetails(info: CharInfo): HTMLElement {
  const d = info.def;
  const treat = TREAT_OPTIONS.find((t) => t.id === d.treat)?.label ?? d.treat;
  const host = el(`
    <section class="card">
      <div class="card-head">
        <h2>📋 Details</h2>
        <span class="hint">Built-in characters live in src/data/animals.ts — duplicate to remix one in the studio</span>
      </div>
      <div class="fact-grid">
        <div class="fact"><span>Voice patch</span><b>${d.patch}</b></div>
        <div class="fact"><span>Register</span><b>${patchRegister(d.patch)}</b></div>
        <div class="fact"><span>Brightness</span><b>${d.bright.toFixed(2)}</b></div>
        <div class="fact"><span>Pitch offset</span><b>${d.pitchOffset > 0 ? '+' : ''}${d.pitchOffset} st</b></div>
        <div class="fact"><span>Treat</span><b>${treat}</b></div>
        <div class="fact">
          <span>Palette</span>
          <span class="swatches">
            ${COLOR_FIELDS.map(
              (c) => `<i class="swatch" title="${c.label} ${d.colors[c.key]}" style="background:${d.colors[c.key]}"></i>`,
            ).join('')}
          </span>
        </div>
      </div>
      <div class="card-foot">
        <button class="btn btn-small btn-ghost" data-act="duplicate">⧉ Duplicate as studio character</button>
      </div>
    </section>`);
  host.querySelector('[data-act="duplicate"]')!.addEventListener('click', () => {
    setCreatePrefill({
      ...d,
      colors: { ...d.colors },
      id: `x-${d.id}`,
      name: `${d.name} II`,
    });
    show({ kind: 'create' });
  });
  return host;
}

function studioDetails(info: CharInfo): HTMLElement {
  const host = el(`
    <section class="card">
      <div class="card-head">
        <h2>📋 Details</h2>
        <span class="hint">Saved to manifest.json in app/public/characters/</span>
      </div>
    </section>`);
  host.appendChild(
    characterForm({
      initial: info.def,
      mode: 'edit',
      submitLabel: '💾 Save changes',
      onSave: (def) => {
        void updateCharacter(def).then((err) => toastResult(err, `${def.name} updated.`));
      },
    }),
  );
  return host;
}

function dangerZone(info: CharInfo): HTMLElement {
  const d = info.def;
  const host = el(`
    <section class="card card-danger">
      <div class="card-head"><h2>⚠️ Danger zone</h2></div>
      ${
        info.builtin
          ? `<div class="danger-row">
              <div>
                <b>${info.hidden ? 'Restore to the game' : 'Hide from the game'}</b>
                <p>${
                  info.hidden
                    ? 'Bring this character back into the roster.'
                    : 'Removes the character from the roster at runtime — no code or art is deleted, and you can restore it any time.'
                }</p>
              </div>
              <button class="btn ${info.hidden ? 'btn-primary' : 'btn-danger'}" data-act="toggle-hide">
                ${info.hidden ? '↩ Restore' : 'Hide character'}
              </button>
            </div>`
          : `<div class="danger-row">
              <div>
                <b>Delete this character</b>
                <p>Removes ${esc(d.name)} from manifest.json and deletes their art PNGs and voice WAV. This cannot be undone.</p>
              </div>
              <button class="btn btn-danger" data-act="delete">🗑 Delete forever</button>
            </div>`
      }
    </section>`);

  host.querySelector('[data-act="toggle-hide"]')?.addEventListener('click', () => {
    const hiding = !info.hidden;
    void (hiding
      ? confirmDialog({
          title: `Hide ${d.name}?`,
          body: 'Players who currently use this character will be switched to another one.',
          confirmLabel: 'Hide from game',
          danger: true,
        })
      : Promise.resolve(true)
    ).then((ok) => {
      if (ok) {
        void setHidden(d.id, hiding).then((err) =>
          toastResult(err, hiding ? `${d.name} hidden — rebuild to ship.` : `${d.name} restored.`),
        );
      }
    });
  });

  host.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    void confirmDialog({
      title: `Delete ${d.name} forever?`,
      body: `Their manifest entry, artwork files and voice recording will all be deleted from the project.`,
      confirmLabel: 'Delete forever',
      danger: true,
    }).then((ok) => {
      if (ok) void deleteCharacter(d.id).then((err) => toastResult(err, `${d.name} deleted.`));
    });
  });

  return host;
}

export function renderDetailView(info: CharInfo): HTMLElement {
  const host = el(`<div class="detail"></div>`);
  host.appendChild(el(headerHtml(info)));
  host.appendChild(renderArtSection(info));
  host.appendChild(renderVoiceSection(info));
  host.appendChild(info.builtin ? builtinDetails(info) : studioDetails(info));
  host.appendChild(dangerZone(info));
  return host;
}
