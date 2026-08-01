/**
 * Character content manifest — the bridge between the local admin studio
 * and the game.
 *
 * public/characters/manifest.json (written by the admin panel, shipped with
 * the build) declares everything the studio can author:
 *
 *   characters — extra roster members created in the admin (full AnimalDef;
 *                they join an existing species family for art + unlocking)
 *   hidden     — built-in character ids removed from the game
 *   voices     — recorded voice overrides: charId → { file, baseFreq }
 *
 * The manifest is optional: no file (or an unreadable one) simply means
 * "stock game". Both the game boot (initManifest) and the admin panel use
 * normalizeManifest so the accepted shape is defined in exactly one place.
 */

import {
  ANIMALS,
  SPECIES,
  registerAnimals,
  hideAnimals,
  animalById,
  type AnimalDef,
  type AnimalColors,
  type PatchId,
  type SpeciesId,
  type TreatId,
} from '../data/animals';
import { registerVoiceOverride } from '../audio/voiceOverrides';
import { save, persist } from './storage';

export interface VoiceOverrideSpec {
  /** file name inside public/characters/, e.g. "cat-m.voice.wav" */
  file: string;
  /** detected fundamental of the recording, Hz */
  baseFreq: number;
}

export interface CharacterManifest {
  version: 1;
  characters: AnimalDef[];
  hidden: string[];
  voices: Record<string, VoiceOverrideSpec>;
}

export const MANIFEST_FILE = 'manifest.json';
export const MANIFEST_URL = `/characters/${MANIFEST_FILE}`;

/** File name convention for voice override samples. */
export function voiceFileName(charId: string): string {
  return `${charId}.voice.wav`;
}

export function emptyManifest(): CharacterManifest {
  return { version: 1, characters: [], hidden: [], voices: {} };
}

const PATCHES: PatchId[] = [
  'meow', 'chirp', 'bark', 'croak', 'hoot', 'quack', 'yip', 'grunt',
  'beep', 'boo', 'roar', 'twinkle',
];
const TREATS: TreatId[] = [
  'fish', 'worm', 'bone', 'fly', 'moon', 'bread', 'berry', 'bamboo',
  'bolt', 'gem', 'candy',
];
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;

function isSpecies(x: unknown): x is SpeciesId {
  return typeof x === 'string' && SPECIES.some((s) => s.id === x);
}

function asColors(x: unknown): AnimalColors | null {
  if (typeof x !== 'object' || x === null) return null;
  const c = x as Record<string, unknown>;
  const keys = ['body', 'belly', 'accent', 'cheek', 'detail'] as const;
  const out = {} as Record<(typeof keys)[number], string>;
  for (const k of keys) {
    if (typeof c[k] !== 'string' || !HEX.test(c[k] as string)) return null;
    out[k] = (c[k] as string).toLowerCase();
  }
  return out;
}

/** Validate one manifest character entry into a well-formed AnimalDef. */
export function normalizeCharacter(raw: unknown): AnimalDef | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const colors = asColors(r.colors);
  if (
    typeof r.id !== 'string' || !ID.test(r.id) ||
    !isSpecies(r.species) ||
    (r.sex !== 'm' && r.sex !== 'f') ||
    typeof r.name !== 'string' || r.name.trim().length === 0 ||
    !PATCHES.includes(r.patch as PatchId) ||
    !colors
  ) {
    return null;
  }
  return {
    id: r.id,
    species: r.species,
    sex: r.sex,
    name: r.name.trim().slice(0, 24),
    speciesName:
      typeof r.speciesName === 'string' && r.speciesName.trim()
        ? r.speciesName.trim().slice(0, 24)
        : r.species.charAt(0).toUpperCase() + r.species.slice(1),
    blurb: typeof r.blurb === 'string' ? r.blurb.trim().slice(0, 140) : '',
    patch: r.patch as PatchId,
    pitchOffset:
      typeof r.pitchOffset === 'number' && Number.isFinite(r.pitchOffset)
        ? Math.max(-24, Math.min(24, Math.round(r.pitchOffset)))
        : 0,
    bright:
      typeof r.bright === 'number' && Number.isFinite(r.bright)
        ? Math.max(0.6, Math.min(1.6, r.bright))
        : 1,
    treat: TREATS.includes(r.treat as TreatId) ? (r.treat as TreatId) : 'berry',
    colors,
  };
}

/** Coerce arbitrary JSON into a safe, well-formed manifest. */
export function normalizeManifest(raw: unknown): CharacterManifest {
  const out = emptyManifest();
  if (typeof raw !== 'object' || raw === null) return out;
  const m = raw as Record<string, unknown>;

  if (Array.isArray(m.characters)) {
    const seen = new Set<string>();
    for (const entry of m.characters) {
      const def = normalizeCharacter(entry);
      if (def && !seen.has(def.id)) {
        seen.add(def.id);
        out.characters.push(def);
      }
    }
  }
  if (Array.isArray(m.hidden)) {
    out.hidden = [...new Set(m.hidden.filter((x): x is string => typeof x === 'string'))];
  }
  if (typeof m.voices === 'object' && m.voices !== null) {
    for (const [id, spec] of Object.entries(m.voices as Record<string, unknown>)) {
      if (typeof spec !== 'object' || spec === null) continue;
      const s = spec as Record<string, unknown>;
      if (typeof s.file !== 'string' || !/^[\w.-]+\.wav$/i.test(s.file)) continue;
      const baseFreq =
        typeof s.baseFreq === 'number' && s.baseFreq > 20 && s.baseFreq < 2000
          ? s.baseFreq
          : 220;
      out.voices[id] = { file: s.file, baseFreq };
    }
  }
  return out;
}

/**
 * Fetch and apply the manifest at game boot: extend the roster, hide
 * removed characters, register voice overrides, and make sure the saved
 * duet doesn't point at a character that no longer exists.
 */
export async function initManifest(): Promise<void> {
  let manifest = emptyManifest();
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (res.ok) manifest = normalizeManifest(await res.json());
  } catch {
    /* no manifest — stock game */
  }

  registerAnimals(manifest.characters);
  // never hide admin-created characters via `hidden` (they are deleted
  // outright instead), and never let hiding empty the roster
  const hideable = manifest.hidden.filter(
    (id) => !manifest.characters.some((c) => c.id === id),
  );
  if (ANIMALS.some((a) => !hideable.includes(a.id))) {
    hideAnimals(hideable);
  }

  for (const [id, spec] of Object.entries(manifest.voices)) {
    registerVoiceOverride(id, `/characters/${spec.file}`, spec.baseFreq);
  }

  // heal saves that reference removed characters
  const exists = (id: string) => ANIMALS.some((a) => a.id === id) || id.startsWith('custom-');
  let healed = false;
  if (!exists(save.left)) {
    save.left = animalById('').id; // animalById falls back to the first roster entry
    healed = true;
  }
  if (!exists(save.right)) {
    save.right = ANIMALS[Math.min(1, ANIMALS.length - 1)].id;
    healed = true;
  }
  if (healed) persist();
}
