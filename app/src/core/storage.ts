/**
 * Local save data — everything persists in localStorage on this device only.
 * v2: species couples (m/f characters) + wardrobe.
 */

export interface SongProgress {
  bestScore: number;
  stars: number;
  plays: number;
  unlocked: boolean;
}

export interface Settings {
  musicVol: number;
  sfxVol: number;
  name: string;
  leaderboard: boolean;
  haptics: boolean;
  /** audio lead in ms — how early to schedule sound so it is HEARD on time.
   *  -1 = auto-detect from the device's reported output latency. */
  audioLeadMs: number;
}

export interface Save {
  version: number;
  coins: number;
  /** unlocked species ids — a species unlocks its couple */
  unlockedSpecies: string[];
  left: string;
  right: string;
  songs: Record<string, SongProgress>;
  /** owned outfit ids + what each character is wearing */
  ownedOutfits: string[];
  equipped: Record<string, string>;
  settings: Settings;
}

const KEY = 'animal-duet-save-v1';

function defaults(): Save {
  return {
    version: 2,
    coins: 200,
    unlockedSpecies: ['cat'],
    left: 'cat-m',
    right: 'cat-f',
    songs: {},
    ownedOutfits: ['none'],
    equipped: {},
    settings: {
      musicVol: 0.8,
      sfxVol: 1.0,
      name: '',
      leaderboard: false,
      haptics: true,
      audioLeadMs: -1,
    },
  };
}

interface SaveV1 {
  version: 1;
  coins?: number;
  unlockedAnimals?: string[];
  left?: string;
  right?: string;
  songs?: Record<string, SongProgress>;
  settings?: Partial<Settings>;
}

function migrateV1(old: SaveV1): Save {
  const d = defaults();
  const species = new Set<string>(['cat']);
  for (const id of old.unlockedAnimals ?? []) species.add(id);
  const mapChar = (id: string | undefined, fallback: string): string =>
    id ? (id.includes('-') ? id : `${id}-m`) : fallback;
  return {
    ...d,
    coins: old.coins ?? d.coins,
    unlockedSpecies: [...species],
    left: mapChar(old.left, 'cat-m'),
    right: old.right === old.left ? 'cat-f' : mapChar(old.right, 'cat-f'),
    songs: old.songs ?? {},
    settings: { ...d.settings, ...(old.settings ?? {}) },
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as { version?: number };
    if (!parsed.version || parsed.version < 2) {
      return migrateV1(parsed as SaveV1);
    }
    const d = defaults();
    const p = parsed as Partial<Save>;
    return {
      ...d,
      ...p,
      version: 2,
      settings: { ...d.settings, ...(p.settings ?? {}) },
      songs: p.songs ?? {},
      unlockedSpecies:
        p.unlockedSpecies && p.unlockedSpecies.length > 0
          ? p.unlockedSpecies
          : d.unlockedSpecies,
      ownedOutfits:
        p.ownedOutfits && p.ownedOutfits.length > 0 ? p.ownedOutfits : d.ownedOutfits,
      equipped: p.equipped ?? {},
    };
  } catch {
    return defaults();
  }
}

export const save: Save = load();
// Persist any migration immediately so it only runs once.
persist();

export function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage full or unavailable — game still works for this session */
  }
}

export function songProgress(id: string): SongProgress {
  if (!save.songs[id]) {
    save.songs[id] = { bestScore: 0, stars: 0, plays: 0, unlocked: false };
  }
  return save.songs[id];
}

export function addCoins(n: number): void {
  save.coins = Math.max(0, save.coins + n);
  persist();
}

export function isSpeciesUnlocked(id: string): boolean {
  return save.unlockedSpecies.includes(id);
}

export function unlockSpecies(id: string): void {
  if (!isSpeciesUnlocked(id)) {
    save.unlockedSpecies.push(id);
    persist();
  }
}

export function ownsOutfit(id: string): boolean {
  return save.ownedOutfits.includes(id);
}

export function buyOutfit(id: string): void {
  if (!ownsOutfit(id)) {
    save.ownedOutfits.push(id);
    persist();
  }
}

export function equippedOutfit(charId: string): string {
  return save.equipped[charId] ?? 'none';
}

export function equipOutfit(charId: string, outfitId: string): void {
  save.equipped[charId] = outfitId;
  persist();
}

export function recordResult(
  songId: string,
  score: number,
  stars: number,
): { newBest: boolean } {
  const p = songProgress(songId);
  p.plays += 1;
  const newBest = score > p.bestScore;
  if (newBest) p.bestScore = score;
  if (stars > p.stars) p.stars = stars;
  persist();
  return { newBest };
}

export function resetProgress(): void {
  Object.assign(save, defaults());
  persist();
}

/** Test mode: unlock every species, outfit and song, and top up coins. */
export function unlockEverything(
  speciesIds: string[],
  outfitIds: string[],
  songIds: string[],
): void {
  save.coins = Math.max(save.coins, 99999);
  save.unlockedSpecies = [...speciesIds];
  save.ownedOutfits = [...outfitIds];
  for (const id of songIds) {
    songProgress(id).unlocked = true;
  }
  persist();
}
