/**
 * App bootstrap + screen router.
 */

import './styles/main.css';
import { router, type ScreenId } from './core/router';
import { unlockEverything } from './core/storage';
import { SPECIES, OUTFITS } from './data/animals';
import { SONGS } from './data/songs';
import { audio } from './audio/engine';
import { MenuMusic } from './audio/backing';
import { Game } from './game/gameplay';
import { renderHome } from './ui/home';
import { renderSongs } from './ui/songs';
import { renderAnimals } from './ui/animalsScreen';
import { renderSettings } from './ui/settings';

// Test mode via URL: http://127.0.0.1:5173/?all=1 unlocks everything.
if (new URLSearchParams(location.search).get('all') === '1') {
  unlockEverything(
    SPECIES.map((x) => x.id),
    OUTFITS.map((x) => x.id),
    SONGS.map((x) => x.id),
  );
}

const root = document.getElementById('app')!;
const menuMusic = new MenuMusic();
let cleanup: (() => void) | null = null;
let game: Game | null = null;

const SCREENS: Record<ScreenId, (r: HTMLElement) => () => void> = {
  home: renderHome,
  songs: renderSongs,
  animals: renderAnimals,
  settings: renderSettings,
};

router.go = (screen: ScreenId) => {
  cleanup?.();
  cleanup = null;
  if (game) {
    game.destroy();
    game = null;
  }
  cleanup = SCREENS[screen](root);
  root.querySelector('.screen')?.classList.add('screen-enter');
  menuMusic.start();
};

router.play = (songId: string) => {
  cleanup?.();
  cleanup = null;
  menuMusic.stop();
  game?.destroy();
  audio.ensure();
  game = new Game(root, songId, {
    onQuit: () => {
      game = null;
      router.go('songs');
    },
    onRestart: () => {
      router.play(songId);
    },
  });
};

// Audio contexts must be unlocked by a user gesture on mobile.
const unlock = () => {
  audio.ensure();
  menuMusic.start();
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock);

// Load locally-created custom characters, then boot the UI.
import('./core/customChars')
  .then((m) => m.initCustomChars())
  .catch(() => {})
  .finally(() => router.go('home'));
