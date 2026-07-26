/**
 * Song library. All melodies are public-domain classics arranged as compact
 * note charts, so the whole soundtrack is license-free and generated in-code.
 *
 * Melody notation: whitespace-separated tokens, "|" barlines are ignored.
 *   "C4"       — note, 1 beat
 *   "F#4/0.5"  — note, half a beat
 *   "R/2"      — rest, two beats
 * Lanes alternate note-by-note so the two animals sing the tune as a duet.
 */

export interface SongTheme {
  top: string;
  bottom: string;
  accent: string;
}

export interface SongDef {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  beatsPerBar: number;
  difficulty: 1 | 2 | 3;
  cost: number;
  theme: SongTheme;
  chords: string[];
  melody: string;
}

export interface ChartNote {
  beat: number;
  midi: number;
  lane: 0 | 1;
  dur: number;
}

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function noteNameToMidi(token: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(token);
  if (!m) throw new Error(`Bad note token: ${token}`);
  let semis = NOTE_INDEX[m[1]];
  if (m[2] === '#') semis += 1;
  if (m[2] === 'b') semis -= 1;
  const octave = parseInt(m[3], 10);
  return (octave + 1) * 12 + semis;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Parse a song's melody string into a playable chart with alternating lanes. */
export function buildChart(song: SongDef): ChartNote[] {
  const notes: ChartNote[] = [];
  let beat = 0;
  let lane: 0 | 1 = 0;
  for (const raw of song.melody.split(/\s+/)) {
    const token = raw.trim();
    if (!token || token === '|') continue;
    const [head, durStr] = token.split('/');
    const dur = durStr ? parseFloat(durStr) : 1;
    if (head !== 'R') {
      notes.push({ beat, midi: noteNameToMidi(head), lane, dur });
      lane = lane === 0 ? 1 : 0;
    }
    beat += dur;
  }
  return notes;
}

export function chartLengthBeats(song: SongDef): number {
  let beat = 0;
  for (const raw of song.melody.split(/\s+/)) {
    const token = raw.trim();
    if (!token || token === '|') continue;
    const [, durStr] = token.split('/');
    beat += durStr ? parseFloat(durStr) : 1;
  }
  return beat;
}

export const SONGS: SongDef[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle',
    composer: 'Traditional',
    bpm: 100,
    beatsPerBar: 4,
    difficulty: 1,
    cost: 0,
    theme: { top: '#a7c7f9', bottom: '#ffd9ec', accent: '#7fa8f0' },
    chords: ['C', 'F', 'F', 'G', 'C', 'G', 'C', 'G', 'C', 'F', 'F', 'G', 'C'],
    melody: `
      C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2 |
      G4 G4 F4 F4 | E4 E4 D4/2 | G4 G4 F4 F4 | E4 E4 D4/2 |
      C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2
    `,
  },
  {
    id: 'macdonald',
    title: 'Old MacDonald',
    composer: 'Traditional',
    bpm: 116,
    beatsPerBar: 4,
    difficulty: 1,
    cost: 0,
    theme: { top: '#ffe3a3', bottom: '#c9edb8', accent: '#f5a623' },
    chords: ['G', 'C', 'G', 'D', 'G', 'C', 'G', 'D', 'G', 'C', 'G', 'D', 'G'],
    melody: `
      G4 G4 G4 D4 | E4 E4 D4/2 | B4 B4 A4 A4 | G4/2 R D4 |
      G4 G4 G4 D4 | E4 E4 D4/2 | B4 B4 A4 A4 | G4/2 R/2 |
      D4/0.5 D4/0.5 G4 G4 G4 | D4/0.5 D4/0.5 G4 G4 G4 |
      G4/0.5 G4/0.5 G4 G4/0.5 G4/0.5 G4 | G4 G4 G4/2 |
      G4 G4 G4 D4 | E4 E4 D4/2 | B4 B4 A4 A4 | G4/2 R/2
    `,
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditional',
    bpm: 108,
    beatsPerBar: 4,
    difficulty: 1,
    cost: 200,
    theme: { top: '#ffd9ec', bottom: '#e8e3fb', accent: '#e792b4' },
    chords: ['C', 'C', 'G', 'C', 'C', 'C', 'G', 'C'],
    melody: `
      E4 D4 C4 D4 | E4 E4 E4/2 | D4 D4 D4/2 | E4 G4 G4/2 |
      E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4/2 R/2
    `,
  },
  {
    id: 'frere',
    title: 'Frère Jacques',
    composer: 'Traditional',
    bpm: 112,
    beatsPerBar: 4,
    difficulty: 1,
    cost: 200,
    theme: { top: '#c9e9f6', bottom: '#fff1b8', accent: '#6db3d9' },
    chords: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'],
    melody: `
      C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4/2 | E4 F4 G4/2 |
      G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 | G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 |
      C4 G3 C4/2 | C4 G3 C4/2
    `,
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    composer: 'Beethoven',
    bpm: 120,
    beatsPerBar: 4,
    difficulty: 2,
    cost: 400,
    theme: { top: '#ffe8c9', bottom: '#f9c8c8', accent: '#f0928a' },
    chords: [
      'C', 'G', 'C', 'G',
      'C', 'G', 'G', 'C',
      'G', 'C', 'C', 'G',
      'C', 'G', 'G', 'C',
    ],
    melody: `
      E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/0.5 D4/2 |
      E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2 |
      D4 D4 E4 C4 | D4 E4/0.5 F4/0.5 E4 C4 | D4 E4/0.5 F4/0.5 E4 D4 | C4 D4 G3/2 |
      E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2
    `,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Traditional',
    bpm: 96,
    beatsPerBar: 3,
    difficulty: 2,
    cost: 600,
    theme: { top: '#b8e6d0', bottom: '#e8e3fb', accent: '#5fae8f' },
    chords: [
      'Am', 'Am', 'G', 'G', 'Am', 'Am', 'E', 'E',
      'Am', 'Am', 'G', 'G', 'Am', 'E', 'Am', 'Am',
    ],
    melody: `
      A4 | C5/2 D5 | E5/1.5 F5/0.5 E5 | D5/2 B4 | G4/1.5 A4/0.5 B4 |
      C5/2 A4 | A4/1.5 G#4/0.5 A4 | B4/2 G#4 | E4/2 A4 |
      C5/2 D5 | E5/1.5 F5/0.5 E5 | D5/2 B4 | G4/1.5 A4/0.5 B4 |
      C5/1.5 B4/0.5 A4 | G#4/1.5 F#4/0.5 G#4 | A4/2 A4 | A4/2
    `,
  },
  {
    id: 'elise',
    title: 'Für Elise',
    composer: 'Beethoven',
    bpm: 120,
    beatsPerBar: 3,
    difficulty: 3,
    cost: 600,
    theme: { top: '#e8e3fb', bottom: '#c9e9f6', accent: '#9a82cf' },
    chords: [
      'Am', 'Am', 'E', 'Am', 'Am', 'E', 'Am',
      'Am', 'Am', 'E', 'Am', 'C', 'G', 'Am', 'E', 'Am',
    ],
    melody: `
      E5/0.5 D#5/0.5 | E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 |
      A4 R/0.5 C4/0.5 E4/0.5 A4/0.5 | B4 R/0.5 E4/0.5 G#4/0.5 B4/0.5 |
      C5 R/0.5 E4/0.5 E5/0.5 D#5/0.5 |
      E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 |
      A4 R/0.5 C4/0.5 E4/0.5 A4/0.5 | B4 R/0.5 E4/0.5 C5/0.5 B4/0.5 | A4/2 R/0.5 B4/0.5 |
      C5/0.5 D5/0.5 E5/1.5 G4/0.5 | F5/0.5 E5/0.5 D5/1.5 F4/0.5 |
      E5/0.5 D5/0.5 C5/1.5 E4/0.5 | D5/0.5 C5/0.5 B4/1.5 E4/0.5 |
      E5/0.5 D#5/0.5 E5/0.5 D#5/0.5 E5/0.5 B4/0.5 |
      D5/0.5 C5/0.5 A4 R/0.5 C4/0.5 | E4/0.5 A4/0.5 B4 R/0.5 E4/0.5 |
      G#4/0.5 B4/0.5 C5 R/0.5 E4/0.5 |
      E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 |
      A4 R/0.5 C4/0.5 E4/0.5 A4/0.5 | B4 R/0.5 E4/0.5 C5/0.5 B4/0.5 | A4/2
    `,
  },
  {
    id: 'entertainer',
    title: 'The Entertainer',
    composer: 'Scott Joplin',
    bpm: 96,
    beatsPerBar: 4,
    difficulty: 3,
    cost: 800,
    theme: { top: '#fff1b8', bottom: '#f8b285', accent: '#e08a4e' },
    chords: ['C', 'C', 'C', 'G', 'C', 'C', 'G', 'C', 'C', 'C', 'C', 'G', 'C'],
    melody: `
      D5/0.5 E5/0.5 C5/0.5 A4 B4/0.5 G4/1.5 |
      D4/0.5 D#4/0.5 E4/0.5 C5/1 E4/0.5 C5/1 E4/0.5 | C5/2.5 C5/0.5 D5/0.5 D#5/0.5 |
      E5/0.5 C5/0.5 D5/0.5 E5/1 B4/0.5 D5/1 | C5/2.5 R/1.5 |
      D4/0.5 D#4/0.5 E4/0.5 C5/1 E4/0.5 C5/1 E4/0.5 | C5/2.5 R/0.5 A4/0.5 G4/0.5 |
      F#4/0.5 A4/0.5 C5/0.5 E5/1 D5/0.5 C5/0.5 A4/0.5 | D5/2 R/2 |
      D4/0.5 D#4/0.5 E4/0.5 C5/1 E4/0.5 C5/1 E4/0.5 | C5/2.5 C5/0.5 D5/0.5 D#5/0.5 |
      E5/0.5 C5/0.5 D5/0.5 E5/1 B4/0.5 D5/1 | C5/2 R/2
    `,
  },
];

export function songById(id: string): SongDef {
  const s = SONGS.find((x) => x.id === id);
  return s ?? SONGS[0];
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

/** Seconds a note takes to fall from spawn to the catch line, per difficulty. */
export const FALL_DURATION: Record<number, number> = {
  1: 2.0,
  2: 1.7,
  3: 1.45,
};
