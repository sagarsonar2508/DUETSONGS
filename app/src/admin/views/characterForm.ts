/**
 * Character editor form — one component for both "new character" and
 * "edit studio character". Every change updates a live preview pair
 * (idle + singing) rendered through the real sculpted species templates,
 * so what you see is exactly what the game draws.
 */

import { ANIMALS, type AnimalDef, type PatchId, type SpeciesId, type TreatId } from '../../data/animals';
import { animalRiff } from '../../audio/instruments';
import { audio } from '../../audio/engine';
import { normalizeCharacter } from '../../core/manifest';
import { el, esc } from '../ui';
import {
  templateArtSrc,
  PATCH_OPTIONS,
  TREAT_OPTIONS,
  SPECIES_OPTIONS,
  COLOR_FIELDS,
  patchRegister,
} from './shared';

export interface CharacterFormOpts {
  initial: AnimalDef;
  mode: 'create' | 'edit';
  submitLabel: string;
  onSave: (def: AnimalDef) => void;
}

function slug(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `x-${s || 'char'}`.slice(0, 40);
}

/** The species couple member matching the sex — source of sensible defaults. */
function speciesDefaults(species: SpeciesId, sex: 'm' | 'f'): AnimalDef | undefined {
  return ANIMALS.find((a) => a.species === species && a.sex === sex);
}

export function characterForm(opts: CharacterFormOpts): HTMLElement {
  // working copy — mutated by inputs, validated on save
  const d: AnimalDef = { ...opts.initial, colors: { ...opts.initial.colors } };
  let idTouched = opts.mode === 'edit';

  const speciesSel = (v: SpeciesId) =>
    SPECIES_OPTIONS.map(
      (s) => `<option value="${s}" ${s === v ? 'selected' : ''}>${s}</option>`,
    ).join('');
  const patchSel = (v: PatchId) =>
    PATCH_OPTIONS.map(
      (p) => `<option value="${p.id}" ${p.id === v ? 'selected' : ''}>${p.label}</option>`,
    ).join('');
  const treatSel = (v: TreatId) =>
    TREAT_OPTIONS.map(
      (t) => `<option value="${t.id}" ${t.id === v ? 'selected' : ''}>${t.label}</option>`,
    ).join('');

  const host = el(`
    <form class="char-form" novalidate>
      <div class="form-grid">
        <div class="form-fields">
          <div class="field-row">
            <label class="field">
              <span>Name</span>
              <input name="name" maxlength="24" required value="${esc(d.name)}" />
            </label>
            <label class="field">
              <span>Id ${opts.mode === 'edit' ? '(fixed)' : '<small>file names use this</small>'}</span>
              <input name="id" maxlength="40" pattern="[a-z0-9][a-z0-9-]*" value="${esc(d.id)}"
                     ${opts.mode === 'edit' ? 'disabled' : ''} />
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span>Species template <small>art & family</small></span>
              <select name="species">${speciesSel(d.species)}</select>
            </label>
            <label class="field">
              <span>Sex</span>
              <select name="sex">
                <option value="m" ${d.sex === 'm' ? 'selected' : ''}>♂ male</option>
                <option value="f" ${d.sex === 'f' ? 'selected' : ''}>♀ female</option>
              </select>
            </label>
            <label class="field">
              <span>Species label</span>
              <input name="speciesName" maxlength="24" value="${esc(d.speciesName)}" />
            </label>
          </div>
          <label class="field">
            <span>Blurb <small>shown when adopting</small></span>
            <textarea name="blurb" maxlength="140" rows="2">${esc(d.blurb)}</textarea>
          </label>
          <div class="field-row">
            <label class="field">
              <span>Voice patch <small>register <span data-ref="register">${patchRegister(d.patch)}</span></small></span>
              <select name="patch">${patchSel(d.patch)}</select>
            </label>
            <button type="button" class="btn btn-small form-listen" data-act="listen">▶ Listen</button>
          </div>
          <div class="field-row">
            <label class="field">
              <span>Brightness <small><span data-ref="brightv">${d.bright.toFixed(2)}</span> — dark ↔ sparkly</small></span>
              <input type="range" name="bright" min="0.6" max="1.6" step="0.05" value="${d.bright}" />
            </label>
            <label class="field">
              <span>Pitch offset <small>semitones</small></span>
              <input type="number" name="pitchOffset" min="-24" max="24" step="1" value="${d.pitchOffset}" />
            </label>
            <label class="field">
              <span>Treat</span>
              <select name="treat">${treatSel(d.treat)}</select>
            </label>
          </div>
          <div class="field">
            <span class="field-label">Palette</span>
            <div class="color-row">
              ${COLOR_FIELDS.map(
                (c) => `
                <label class="color-field">
                  <input type="color" name="color-${c.key}" value="${d.colors[c.key]}" />
                  <span>${c.label}</span>
                </label>`,
              ).join('')}
            </div>
          </div>
          <div class="error-note" data-ref="errors" hidden></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${esc(opts.submitLabel)}</button>
          </div>
        </div>
        <div class="form-preview">
          <span class="field-label">Live preview</span>
          <div class="preview-pair">
            <figure><img data-ref="prev-idle" alt="idle" /><figcaption>idle</figcaption></figure>
            <figure><img data-ref="prev-sing" alt="singing" /><figcaption>singing</figcaption></figure>
          </div>
          <small class="hint">Rendered with the real in-game ${esc(d.species)} template — replace with custom PNGs after saving.</small>
        </div>
      </div>
    </form>`);

  const q = <T extends HTMLElement>(sel: string) => host.querySelector(sel) as T;
  const input = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    host.querySelector(`[name="${name}"]`) as T;

  const refreshPreview = (): void => {
    const idle = templateArtSrc(d, 'idle');
    const sing = templateArtSrc(d, 'sing');
    if (idle) q<HTMLImageElement>('[data-ref="prev-idle"]').src = idle;
    if (sing) q<HTMLImageElement>('[data-ref="prev-sing"]').src = sing;
  };

  const adoptSpeciesDefaults = (): void => {
    const base = speciesDefaults(d.species, d.sex);
    if (!base) return;
    d.colors = { ...base.colors };
    d.patch = base.patch;
    d.treat = base.treat;
    d.bright = base.bright;
    d.speciesName = base.speciesName;
    input('speciesName').value = base.speciesName;
    input<HTMLSelectElement>('patch').value = base.patch;
    input<HTMLSelectElement>('treat').value = base.treat;
    input('bright').value = String(base.bright);
    q('[data-ref="brightv"]').textContent = base.bright.toFixed(2);
    q('[data-ref="register"]').textContent = patchRegister(base.patch);
    for (const c of COLOR_FIELDS) input(`color-${c.key}`).value = d.colors[c.key];
  };

  input('name').addEventListener('input', () => {
    d.name = input('name').value;
    if (opts.mode === 'create' && !idTouched) {
      d.id = slug(d.name);
      input('id').value = d.id;
    }
  });
  input('id').addEventListener('input', () => {
    idTouched = true;
    d.id = input('id').value.toLowerCase();
  });
  input<HTMLSelectElement>('species').addEventListener('change', () => {
    d.species = input<HTMLSelectElement>('species').value as SpeciesId;
    if (opts.mode === 'create') adoptSpeciesDefaults();
    refreshPreview();
  });
  input<HTMLSelectElement>('sex').addEventListener('change', () => {
    d.sex = input<HTMLSelectElement>('sex').value as 'm' | 'f';
    if (opts.mode === 'create') adoptSpeciesDefaults();
    refreshPreview();
  });
  input('speciesName').addEventListener('input', () => {
    d.speciesName = input('speciesName').value;
  });
  input<HTMLTextAreaElement>('blurb').addEventListener('input', () => {
    d.blurb = input<HTMLTextAreaElement>('blurb').value;
  });
  input<HTMLSelectElement>('patch').addEventListener('change', () => {
    d.patch = input<HTMLSelectElement>('patch').value as PatchId;
    q('[data-ref="register"]').textContent = patchRegister(d.patch);
  });
  input('bright').addEventListener('input', () => {
    d.bright = parseFloat(input('bright').value);
    q('[data-ref="brightv"]').textContent = d.bright.toFixed(2);
  });
  input('pitchOffset').addEventListener('input', () => {
    d.pitchOffset = parseInt(input('pitchOffset').value, 10) || 0;
  });
  input<HTMLSelectElement>('treat').addEventListener('change', () => {
    d.treat = input<HTMLSelectElement>('treat').value as TreatId;
  });
  for (const c of COLOR_FIELDS) {
    input(`color-${c.key}`).addEventListener('input', () => {
      d.colors[c.key] = input(`color-${c.key}`).value;
      refreshPreview();
    });
  }

  q('[data-act="listen"]').addEventListener('click', () => {
    audio.ensure();
    animalRiff(d.patch, d.bright, d.pitchOffset);
  });

  host.addEventListener('submit', (e) => {
    e.preventDefault();
    const errBox = q('[data-ref="errors"]');
    const clean = normalizeCharacter(d);
    if (!clean) {
      errBox.hidden = false;
      errBox.textContent =
        'Please check the fields: name required, id must be lowercase letters/digits/dashes (min 2 chars).';
      return;
    }
    errBox.hidden = true;
    opts.onSave(clean);
  });

  refreshPreview();
  return host;
}
