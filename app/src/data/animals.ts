/**
 * Character roster: 8 species × male & female = 16 characters.
 * Each character has its own palette and a sex-specific voice character
 * (brightness, vibrato, register) so the two halves of a duet look AND
 * sound like a real couple.
 */

export type PatchId =
  | 'meow'
  | 'chirp'
  | 'bark'
  | 'croak'
  | 'hoot'
  | 'quack'
  | 'yip'
  | 'grunt'
  | 'beep'
  | 'boo'
  | 'roar'
  | 'twinkle';

export type TreatId =
  | 'fish'
  | 'worm'
  | 'bone'
  | 'fly'
  | 'moon'
  | 'bread'
  | 'berry'
  | 'bamboo'
  | 'bolt'
  | 'gem'
  | 'candy';

export type SpeciesId =
  | 'cat'
  | 'chick'
  | 'dog'
  | 'frog'
  | 'owl'
  | 'duck'
  | 'fox'
  | 'panda'
  | 'robot'
  | 'ghost'
  | 'dragon'
  | 'star';

export interface AnimalColors {
  body: string;
  belly: string;
  accent: string;
  cheek: string;
  detail: string;
}

export interface AnimalDef {
  id: string;
  species: SpeciesId;
  sex: 'm' | 'f';
  name: string;
  speciesName: string;
  blurb: string;
  patch: PatchId;
  /** semitone shift applied to melody notes (octave shifts only, melody-safe) */
  pitchOffset: number;
  /** 1 = neutral timbre; >1 brighter/feminine, <1 rounder/masculine */
  bright: number;
  treat: TreatId;
  colors: AnimalColors;
}

export interface SpeciesInfo {
  id: SpeciesId;
  cost: number;
}

/** Unlocking a species unlocks its couple (both characters). */
export const SPECIES: SpeciesInfo[] = [
  { id: 'cat', cost: 0 },
  { id: 'chick', cost: 300 },
  { id: 'dog', cost: 500 },
  { id: 'frog', cost: 700 },
  { id: 'duck', cost: 900 },
  { id: 'owl', cost: 1100 },
  { id: 'fox', cost: 1400 },
  { id: 'panda', cost: 1700 },
  { id: 'ghost', cost: 2000 },
  { id: 'robot', cost: 2300 },
  { id: 'dragon', cost: 2600 },
  { id: 'star', cost: 3000 },
];

export const ANIMALS: AnimalDef[] = [
  {
    id: 'cat-m', species: 'cat', sex: 'm', name: 'Milo', speciesName: 'Cat',
    blurb: 'A velvet-voiced crooner with a bowtie-ready charm.',
    patch: 'meow', pitchOffset: 0, bright: 0.85, treat: 'fish',
    colors: { body: '#f8f3ea', belly: '#ffffff', accent: '#d9cbb9', cheek: '#f0b6c0', detail: '#544651' },
  },
  {
    id: 'cat-f', species: 'cat', sex: 'f', name: 'Mimi', speciesName: 'Cat',
    blurb: 'Sweet soprano purrs and a flower behind one ear.',
    patch: 'meow', pitchOffset: 0, bright: 1.35, treat: 'fish',
    colors: { body: '#fdf1f3', belly: '#ffffff', accent: '#f2c5d2', cheek: '#ff9ec0', detail: '#544651' },
  },
  {
    id: 'chick-m', species: 'chick', sex: 'm', name: 'Pip', speciesName: 'Chick',
    blurb: 'Tiny bird, huge range. Hits high notes before breakfast.',
    patch: 'chirp', pitchOffset: 0, bright: 0.9, treat: 'worm',
    colors: { body: '#ffe08a', belly: '#fff4cd', accent: '#f5a94a', cheek: '#ffb8a0', detail: '#6d5730' },
  },
  {
    id: 'chick-f', species: 'chick', sex: 'f', name: 'Pippa', speciesName: 'Chick',
    blurb: 'Trills like a music box and knows it.',
    patch: 'chirp', pitchOffset: 0, bright: 1.4, treat: 'worm',
    colors: { body: '#ffe9b8', belly: '#fff9e3', accent: '#ffb56b', cheek: '#ff9e9e', detail: '#6d5730' },
  },
  {
    id: 'dog-m', species: 'dog', sex: 'm', name: 'Bruno', speciesName: 'Puppy',
    blurb: 'Woofs in perfect time. Will absolutely sing for bones.',
    patch: 'bark', pitchOffset: 0, bright: 0.8, treat: 'bone',
    colors: { body: '#d9b48f', belly: '#f7e9d6', accent: '#a9825e', cheek: '#f0a08e', detail: '#54402c' },
  },
  {
    id: 'dog-f', species: 'dog', sex: 'f', name: 'Bella', speciesName: 'Puppy',
    blurb: 'Silky ears, silkier vibrato.',
    patch: 'bark', pitchOffset: 0, bright: 1.3, treat: 'bone',
    colors: { body: '#f0d9bd', belly: '#fdf6ea', accent: '#d3ab7e', cheek: '#ff9e9e', detail: '#54402c' },
  },
  {
    id: 'frog-m', species: 'frog', sex: 'm', name: 'Ferdie', speciesName: 'Frog',
    blurb: 'Bass section of the pond, surprising soul.',
    patch: 'croak', pitchOffset: 0, bright: 0.85, treat: 'fly',
    colors: { body: '#a8dfa0', belly: '#eaf8dc', accent: '#6fbf6a', cheek: '#ffb0a0', detail: '#33593c' },
  },
  {
    id: 'frog-f', species: 'frog', sex: 'f', name: 'Lily', speciesName: 'Frog',
    blurb: 'Sings an octave up with a waterlily in her hair.',
    patch: 'croak', pitchOffset: 12, bright: 1.35, treat: 'fly',
    colors: { body: '#c4ecb8', belly: '#f4fbe9', accent: '#8fd08a', cheek: '#ff9ec0', detail: '#33593c' },
  },
  {
    id: 'duck-m', species: 'duck', sex: 'm', name: 'Quackers', speciesName: 'Duck',
    blurb: 'Jazz honker. Never misses a beat, always demands bread.',
    patch: 'quack', pitchOffset: 0, bright: 0.85, treat: 'bread',
    colors: { body: '#fff1b8', belly: '#fffbe6', accent: '#f5a623', cheek: '#ffb8a0', detail: '#67541f' },
  },
  {
    id: 'duck-f', species: 'duck', sex: 'f', name: 'Daisy', speciesName: 'Duck',
    blurb: 'Swan-white feathers, honey-bright honks.',
    patch: 'quack', pitchOffset: 0, bright: 1.35, treat: 'bread',
    colors: { body: '#fdfaf2', belly: '#ffffff', accent: '#ffb95e', cheek: '#ff9ec0', detail: '#67541f' },
  },
  {
    id: 'owl-m', species: 'owl', sex: 'm', name: 'Otto', speciesName: 'Owl',
    blurb: 'Midnight baritone. Hoots lullabies to the moon.',
    patch: 'hoot', pitchOffset: 0, bright: 0.8, treat: 'moon',
    colors: { body: '#b7a4d6', belly: '#efe9fb', accent: '#8d76bd', cheek: '#e8a0b8', detail: '#463a63' },
  },
  {
    id: 'owl-f', species: 'owl', sex: 'f', name: 'Luna', speciesName: 'Owl',
    blurb: 'Mezzo-soprano of the night sky.',
    patch: 'hoot', pitchOffset: 0, bright: 1.3, treat: 'moon',
    colors: { body: '#d3c6ec', belly: '#f7f3fd', accent: '#ab94d8', cheek: '#f0a8c0', detail: '#463a63' },
  },
  {
    id: 'fox-m', species: 'fox', sex: 'm', name: 'Rusty', speciesName: 'Fox',
    blurb: 'What does he say? Glissandos, mostly.',
    patch: 'yip', pitchOffset: 0, bright: 0.85, treat: 'berry',
    colors: { body: '#f4a86f', belly: '#fdeada', accent: '#d98443', cheek: '#ff9e8a', detail: '#5f3a1e' },
  },
  {
    id: 'fox-f', species: 'fox', sex: 'f', name: 'Roxy', speciesName: 'Fox',
    blurb: 'Rose-gold fur and glissandos with extra sparkle.',
    patch: 'yip', pitchOffset: 0, bright: 1.35, treat: 'berry',
    colors: { body: '#f8c095', belly: '#fdf1e6', accent: '#e89a5e', cheek: '#ff9ec0', detail: '#5f3a1e' },
  },
  {
    id: 'panda-m', species: 'panda', sex: 'm', name: 'Bao', speciesName: 'Panda',
    blurb: 'Deep, gentle hums between bamboo snacks. Very zen.',
    patch: 'grunt', pitchOffset: 0, bright: 0.8, treat: 'bamboo',
    colors: { body: '#f6f4f1', belly: '#ffffff', accent: '#44444e', cheek: '#f0b6c0', detail: '#33333c' },
  },
  {
    id: 'panda-f', species: 'panda', sex: 'f', name: 'Mei', speciesName: 'Panda',
    blurb: 'Hums an octave up, wears plum blossoms.',
    patch: 'grunt', pitchOffset: 12, bright: 1.3, treat: 'bamboo',
    colors: { body: '#fbf6f4', belly: '#ffffff', accent: '#4e444e', cheek: '#ff9ec0', detail: '#3c333c' },
  },
  {
    id: 'ghost-m', species: 'ghost', sex: 'm', name: 'Gus', speciesName: 'Ghost',
    blurb: 'A shy phantom crooner. Only haunts the high notes.',
    patch: 'boo', pitchOffset: 0, bright: 0.85, treat: 'moon',
    colors: { body: '#eef0fb', belly: '#ffffff', accent: '#aab4e8', cheek: '#b8c4f0', detail: '#4a4a6a' },
  },
  {
    id: 'ghost-f', species: 'ghost', sex: 'f', name: 'Boo', speciesName: 'Ghost',
    blurb: 'Sweetest little haunt you ever heard. Boo!',
    patch: 'boo', pitchOffset: 0, bright: 1.35, treat: 'moon',
    colors: { body: '#f7effb', belly: '#ffffff', accent: '#d3b8ec', cheek: '#f0b0d0', detail: '#54486a' },
  },
  {
    id: 'robot-m', species: 'robot', sex: 'm', name: 'Bolt', speciesName: 'Robot',
    blurb: 'Beep boop baritone. Never misses a beat — literally.',
    patch: 'beep', pitchOffset: 0, bright: 0.85, treat: 'bolt',
    colors: { body: '#c8d8e8', belly: '#e8f0f8', accent: '#5aa7e8', cheek: '#7fd0f0', detail: '#3a4a5c' },
  },
  {
    id: 'robot-f', species: 'robot', sex: 'f', name: 'Pixel', speciesName: 'Robot',
    blurb: 'Chiptune diva with a heart of gold-plated circuits.',
    patch: 'beep', pitchOffset: 0, bright: 1.35, treat: 'bolt',
    colors: { body: '#f0d8e4', belly: '#faeef4', accent: '#e87ab0', cheek: '#ff9ec0', detail: '#5c3a4c' },
  },
  {
    id: 'dragon-m', species: 'dragon', sex: 'm', name: 'Blaze', speciesName: 'Dragon',
    blurb: 'Big roar, bigger heart. Sings smoke rings.',
    patch: 'roar', pitchOffset: 0, bright: 0.8, treat: 'gem',
    colors: { body: '#a8d8c0', belly: '#f0e6b8', accent: '#5faf8a', cheek: '#ffb0a0', detail: '#2e5a48' },
  },
  {
    id: 'dragon-f', species: 'dragon', sex: 'f', name: 'Ember', speciesName: 'Dragon',
    blurb: 'Warm crackling mezzo with sparks in every phrase.',
    patch: 'roar', pitchOffset: 12, bright: 1.3, treat: 'gem',
    colors: { body: '#f4b8a8', belly: '#fdeada', accent: '#e08a6a', cheek: '#ff9ec0', detail: '#6a3a2e' },
  },
  {
    id: 'star-m', species: 'star', sex: 'm', name: 'Cosmo', speciesName: 'Star',
    blurb: 'Fell from the sky mid-song and just kept singing.',
    patch: 'twinkle', pitchOffset: 0, bright: 0.9, treat: 'candy',
    colors: { body: '#ffe08a', belly: '#fff4cd', accent: '#f5a94a', cheek: '#ffb8a0', detail: '#6d5730' },
  },
  {
    id: 'star-f', species: 'star', sex: 'f', name: 'Stella', speciesName: 'Star',
    blurb: 'The literal star of the show. Shines an octave up.',
    patch: 'twinkle', pitchOffset: 0, bright: 1.4, treat: 'candy',
    colors: { body: '#ffe9c4', belly: '#fff9e8', accent: '#ffb56b', cheek: '#ff9e9e', detail: '#6d5730' },
  },
];

/**
 * Roster mutation hooks for the content manifest (admin-authored
 * characters). Called once at boot, before any screen renders — every
 * consumer iterates ANIMALS at render time, so in-place mutation is safe.
 */
export function registerAnimals(defs: AnimalDef[]): void {
  for (const def of defs) {
    const i = ANIMALS.findIndex((a) => a.id === def.id);
    if (i >= 0) ANIMALS[i] = def;
    else ANIMALS.push(def);
  }
}

export function hideAnimals(ids: string[]): void {
  for (const id of ids) {
    const i = ANIMALS.findIndex((a) => a.id === id);
    if (i >= 0) ANIMALS.splice(i, 1);
  }
}

/** Pluggable resolver so locally-created custom characters resolve too. */
let externalResolver: ((id: string) => AnimalDef | undefined) | null = null;

export function setAnimalResolver(r: (id: string) => AnimalDef | undefined): void {
  externalResolver = r;
}

export function animalById(id: string): AnimalDef {
  return ANIMALS.find((x) => x.id === id) ?? externalResolver?.(id) ?? ANIMALS[0];
}

export function coupleOf(species: SpeciesId): [AnimalDef, AnimalDef] {
  const pair = ANIMALS.filter((a) => a.species === species);
  return [pair[0], pair[1]];
}

export function speciesCost(id: SpeciesId): number {
  return SPECIES.find((s) => s.id === id)?.cost ?? 0;
}
