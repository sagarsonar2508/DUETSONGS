/**
 * "New character" view — a prefilled character form (species defaults come
 * from the built-in couples) plus a short explainer of what happens next.
 * Duplicating a built-in lands here with its values preloaded.
 */

import { ANIMALS, type AnimalDef } from '../../data/animals';
import { createCharacter, usedIds } from '../store';
import { el, toastResult } from '../ui';
import { characterForm } from './characterForm';

let prefill: AnimalDef | null = null;

export function setCreatePrefill(def: AnimalDef): void {
  prefill = def;
}

function freshDefault(): AnimalDef {
  const base = ANIMALS[0];
  const ids = usedIds();
  let id = 'x-new-star';
  for (let n = 2; ids.has(id); n++) id = `x-new-star-${n}`;
  return {
    ...base,
    colors: { ...base.colors },
    id,
    name: 'New Star',
    blurb: '',
  };
}

export function renderCreateView(): HTMLElement {
  const initial = prefill ?? freshDefault();
  prefill = null;

  const host = el(`
    <div class="detail">
      <header class="detail-head">
        <div class="detail-title">
          <h1>＋ New character</h1>
          <p class="detail-blurb">
            Pick a species template for the art and family, tune the voice and palette, then save —
            the character joins that species' couple in the game (unlocks with it). Afterwards you can
            drop in custom artwork and record a real voice from the character page.
          </p>
        </div>
      </header>
      <section class="card"></section>
    </div>`);

  host.querySelector('.card')!.appendChild(
    characterForm({
      initial,
      mode: 'create',
      submitLabel: '✨ Create character',
      onSave: (def) => {
        void createCharacter(def).then((err) =>
          toastResult(err, `${def.name} created — now give them art and a voice!`),
        );
      },
    }),
  );
  return host;
}
