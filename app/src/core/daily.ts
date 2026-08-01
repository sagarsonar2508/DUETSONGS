/**
 * Daily challenge — a date-seeded song + duet pair with a coin bonus.
 *
 * The same date gives everyone the same challenge. Locked songs and locked
 * characters are fair game (the daily is a free "rental" — a taste of
 * content you haven't bought yet). The bonus pays once per day, on clear.
 */

import { ANIMALS, animalById, type AnimalDef } from '../data/animals';
import { SONGS, songById, type SongDef } from '../data/songs';
import { isUserSong } from './userSongs';
import { save, persist, addCoins } from './storage';

export function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface DailyChallenge {
  song: SongDef;
  left: AnimalDef;
  right: AnimalDef;
  reward: number;
  done: boolean;
}

export function dailyChallenge(): DailyChallenge {
  const rng = mulberry32(hashStr(`duet-stars-${todayStr()}`));
  const pool = SONGS.filter((s) => !isUserSong(s.id));
  const song = pool[Math.floor(rng() * pool.length)] ?? songById('twinkle');
  const li = Math.floor(rng() * ANIMALS.length);
  let ri = Math.floor(rng() * (ANIMALS.length - 1));
  if (ri >= li) ri += 1; // distinct pair
  return {
    song,
    left: animalById(ANIMALS[li].id),
    right: animalById(ANIMALS[ri].id),
    reward: 100 + song.difficulty * 50,
    done: save.daily.date === todayStr() && save.daily.done,
  };
}

/** Called from the game when a daily run is cleared. Returns the bonus paid. */
export function completeDaily(): number {
  const today = todayStr();
  if (save.daily.date === today && save.daily.done) return 0;
  const { reward } = dailyChallenge();
  save.daily = { date: today, done: true };
  addCoins(reward);
  persist();
  return reward;
}

/* ------------------------------ login streak ------------------------------ */

/** Bump the daily login streak. Returns the coins awarded (0 = already
 *  counted today). Day 1 pays 20, +10 per consecutive day, capped at 100. */
export function tickLoginStreak(): { reward: number; count: number } {
  const today = todayStr();
  if (save.streak.last === today) return { reward: 0, count: save.streak.count };
  const yesterday = new Date(Date.now() - 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  const yStr = `${yesterday.getFullYear()}-${p(yesterday.getMonth() + 1)}-${p(yesterday.getDate())}`;
  const count = save.streak.last === yStr ? save.streak.count + 1 : 1;
  save.streak = { last: today, count };
  const reward = Math.min(100, 10 + count * 10);
  addCoins(reward);
  persist();
  return { reward, count };
}
