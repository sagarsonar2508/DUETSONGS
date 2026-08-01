/**
 * Achievements — lifetime goals that pay coins.
 *
 * Progress is derived from the save (lifetime stats + song progress +
 * unlocks), so definitions stay pure data. checkAchievements() is called
 * after anything noteworthy (song finish, star created, song imported) and
 * pays out newly earned rewards.
 */

import { save, persist, songProgress } from './storage';
import { SPECIES } from '../data/animals';
import { SONGS } from '../data/songs';
import { listCustomChars } from './customChars';
import { isUserSong } from './userSongs';

export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  reward: number;
  /** [current, goal] — earned when current >= goal */
  progress: () => [number, number];
}

const builtinSongs = () => SONGS.filter((s) => !isUserSong(s.id));

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-clear', icon: '🎤', name: 'Opening Night',
    desc: 'Clear your first song', reward: 100,
    progress: () => [save.stats.cleared, 1],
  },
  {
    id: 'clear-25', icon: '🎪', name: 'Tour Veteran',
    desc: 'Clear 25 songs', reward: 250,
    progress: () => [save.stats.cleared, 25],
  },
  {
    id: 'catch-1000', icon: '🍬', name: 'Treat Vacuum',
    desc: 'Catch 1,000 treats', reward: 200,
    progress: () => [save.stats.caught, 1000],
  },
  {
    id: 'perfect-500', icon: '🎯', name: 'Dead Center',
    desc: '500 perfect catches', reward: 250,
    progress: () => [save.stats.perfect, 500],
  },
  {
    id: 'flawless', icon: '💎', name: 'Flawless',
    desc: 'Clear a song without reviving', reward: 150,
    progress: () => [save.stats.flawless, 1],
  },
  {
    id: 'star-3', icon: '🌟', name: 'Triple Star',
    desc: '3-star any song', reward: 150,
    progress: () => [
      builtinSongs().some((s) => songProgress(s.id).stars >= 3) ? 1 : 0, 1,
    ],
  },
  {
    id: 'easy-all-3', icon: '🏅', name: 'Easy Street',
    desc: '3-star every Easy song', reward: 400,
    progress: () => {
      const easy = builtinSongs().filter((s) => s.difficulty === 1);
      return [easy.filter((s) => songProgress(s.id).stars >= 3).length, easy.length];
    },
  },
  {
    id: 'star-maker', icon: '⭐', name: 'Star Maker',
    desc: 'Create your own star', reward: 150,
    progress: () => [listCustomChars().length > 0 ? 1 : 0, 1],
  },
  {
    id: 'importer', icon: '🎧', name: 'My Playlist',
    desc: 'Import one of your own songs', reward: 150,
    progress: () => [save.stats.imported, 1],
  },
  {
    id: 'duet-2p', icon: '👥', name: 'True Duet',
    desc: 'Finish a 2-player game', reward: 150,
    progress: () => [save.stats.twoPlayerGames, 1],
  },
  {
    id: 'endless-10', icon: '♾️', name: 'Marathon Singer',
    desc: 'Reach 10 loops in Endless', reward: 300,
    progress: () => [save.stats.endlessBestLoops, 10],
  },
  {
    id: 'rich-5000', icon: '💰', name: 'Coin Collector',
    desc: 'Hold 5,000 coins at once', reward: 200,
    progress: () => [save.coins >= 5000 ? 1 : 0, 1],
  },
  {
    id: 'all-species', icon: '🐾', name: 'Full House',
    desc: 'Unlock every species', reward: 500,
    progress: () => [
      SPECIES.filter((sp) => save.unlockedSpecies.includes(sp.id)).length,
      SPECIES.length,
    ],
  },
];

export function isEarned(id: string): boolean {
  return save.achievements.includes(id);
}

/**
 * Award any newly completed achievements (pays coins, persists).
 * Returns the freshly earned defs so callers can toast them.
 */
export function checkAchievements(): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (isEarned(a.id)) continue;
    const [cur, goal] = a.progress();
    if (cur >= goal) {
      save.achievements.push(a.id);
      save.coins += a.reward; // direct: addCoins persists per call anyway
      fresh.push(a);
    }
  }
  if (fresh.length) persist();
  return fresh;
}
