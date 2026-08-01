/**
 * Bits shared by the studio views: effective art resolution (custom PNG →
 * sculpted template), select-option data, and small formatters.
 */

import { SPECIES, type AnimalDef, type PatchId, type SpeciesId, type TreatId } from '../../data/animals';
import { PATCH_RANGE } from '../../audio/instruments';
import { templateSvg } from '../../game/sprites';
import { artUrl, type CharInfo, type Pose } from '../store';
import { svgDataUrl } from '../ui';

/** What the game would actually draw for this character/pose right now. */
export function charArtSrc(info: CharInfo, pose: Pose): string | null {
  const custom =
    artUrl(info.def.id, pose) ?? (pose === 'sing' ? artUrl(info.def.id, 'idle') : undefined);
  if (custom) return custom;
  const svg = templateSvg(info.def, pose === 'sing');
  return svg ? svgDataUrl(svg) : null;
}

/** Template-only render (used when comparing custom art to the built-in). */
export function templateArtSrc(def: AnimalDef, pose: Pose): string | null {
  const svg = templateSvg(def, pose === 'sing');
  return svg ? svgDataUrl(svg) : null;
}

export const SEX_ICON = { m: '♂', f: '♀' } as const;

export const PATCH_OPTIONS: { id: PatchId; label: string }[] = [
  { id: 'meow', label: 'Meow (cat)' },
  { id: 'chirp', label: 'Chirp (chick)' },
  { id: 'bark', label: 'Bark (dog)' },
  { id: 'croak', label: 'Croak (frog)' },
  { id: 'hoot', label: 'Hoot (owl)' },
  { id: 'quack', label: 'Quack (duck)' },
  { id: 'yip', label: 'Yip (fox)' },
  { id: 'grunt', label: 'Grunt (panda)' },
  { id: 'beep', label: 'Beep (robot)' },
  { id: 'boo', label: 'Boo (ghost)' },
  { id: 'roar', label: 'Roar (dragon)' },
  { id: 'twinkle', label: 'Twinkle (star)' },
];

export const TREAT_OPTIONS: { id: TreatId; label: string }[] = [
  { id: 'fish', label: '🐟 Fish' },
  { id: 'worm', label: '🪱 Worm' },
  { id: 'bone', label: '🦴 Bone' },
  { id: 'fly', label: '🪰 Fly' },
  { id: 'moon', label: '🌙 Moon' },
  { id: 'bread', label: '🍞 Bread' },
  { id: 'berry', label: '🫐 Berry' },
  { id: 'bamboo', label: '🎋 Bamboo' },
  { id: 'bolt', label: '🔩 Bolt' },
  { id: 'gem', label: '💎 Gem' },
  { id: 'candy', label: '🍬 Candy' },
];

export const SPECIES_OPTIONS: SpeciesId[] = SPECIES.map((s) => s.id);

export const COLOR_FIELDS: { key: keyof AnimalDef['colors']; label: string }[] = [
  { key: 'body', label: 'Body' },
  { key: 'belly', label: 'Belly' },
  { key: 'accent', label: 'Accent' },
  { key: 'cheek', label: 'Cheek' },
  { key: 'detail', label: 'Detail' },
];

export function midiName(m: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

export function patchRegister(patch: PatchId): string {
  const [lo, hi] = PATCH_RANGE[patch];
  return `${midiName(lo)}–${midiName(hi)}`;
}

export function freqNote(freq: number): string {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return midiName(midi);
}
