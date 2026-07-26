/**
 * Character roster: 8 species × male & female = 16 characters.
 * Each character has its own palette and a sex-specific voice character
 * (brightness, vibrato, register) so the two halves of a duet look AND
 * sound like a real couple. Outfits are defined here too.
 */

export type PatchId =
  | 'meow'
  | 'chirp'
  | 'bark'
  | 'croak'
  | 'hoot'
  | 'quack'
  | 'yip'
  | 'grunt';

export type TreatId =
  | 'fish'
  | 'worm'
  | 'bone'
  | 'fly'
  | 'moon'
  | 'bread'
  | 'berry'
  | 'bamboo';

export type SpeciesId =
  | 'cat'
  | 'chick'
  | 'dog'
  | 'frog'
  | 'owl'
  | 'duck'
  | 'fox'
  | 'panda';

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
];

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

/* -------------------------------- outfits ------------------------------- */

export type OutfitId =
  | 'none'
  | 'bowtie'
  | 'flowercrown'
  | 'scarf'
  | 'tophat'
  | 'tuxedo'
  | 'dress';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  cost: number;
  blurb: string;
}

export const OUTFITS: OutfitDef[] = [
  { id: 'none', name: 'Natural', cost: 0, blurb: 'Just fur and feathers.' },
  { id: 'bowtie', name: 'Bowtie', cost: 150, blurb: 'Instant charm, zero effort.' },
  { id: 'flowercrown', name: 'Flower Crown', cost: 150, blurb: 'Spring, worn as a hat.' },
  { id: 'scarf', name: 'Cozy Scarf', cost: 250, blurb: 'For chilly duets.' },
  { id: 'tophat', name: 'Top Hat', cost: 300, blurb: 'Fancy. Very fancy.' },
  { id: 'tuxedo', name: 'Tuxedo', cost: 500, blurb: 'Dressed for the grand stage.' },
  { id: 'dress', name: 'Wedding Dress', cost: 500, blurb: 'A veil, a bow, a promise.' },
];

export function outfitById(id: string): OutfitDef {
  return OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}
