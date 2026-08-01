/**
 * App bootstrap + screen router.
 */

import './styles/main.css';
import { router, type PlayOpts, type ScreenId } from './core/router';
import { unlockEverything } from './core/storage';
import { initPlatform, setBackHandler, setPauseHandler } from './core/platform';
import { SPECIES } from './data/animals';
import { SONGS } from './data/songs';
import { audio } from './audio/engine';
import { MenuMusic } from './audio/backing';
import { Game } from './game/gameplay';
import { renderHome } from './ui/home';
import { renderSongs } from './ui/songs';
import { renderAnimals } from './ui/animalsScreen';
import { renderSettings } from './ui/settings';
import { renderAwards } from './ui/awards';

// Test mode via URL: http://127.0.0.1:5173/?all=1 unlocks everything.
if (new URLSearchParams(location.search).get('all') === '1') {
  unlockEverything(
    SPECIES.map((x) => x.id),
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
  awards: renderAwards,
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
  // hardware back: close any open overlay, else go home; on home let it exit
  setBackHandler(() => {
    const overlay = document.querySelector('.overlay');
    if (overlay) {
      overlay.remove();
      return true;
    }
    if (screen === 'home') return false;
    router.go('home');
    return true;
  });
  setPauseHandler(() => menuMusic.stop());
};

router.play = (songId: string, opts: PlayOpts = {}) => {
  cleanup?.();
  cleanup = null;
  menuMusic.stop();
  game?.destroy();
  audio.ensure();
  game = new Game(
    root,
    songId,
    {
      onQuit: () => {
        game = null;
        router.go('songs');
      },
      onRestart: () => {
        router.play(songId, opts);
      },
    },
    opts,
  );
};

// Audio contexts must be unlocked by a user gesture on mobile.
const unlock = () => {
  audio.ensure();
  menuMusic.start();
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock);

void initPlatform();

// Load the admin-authored content (character manifest + app content config)
// and locally-created custom characters, then boot the UI.
Promise.allSettled([
  import('./core/manifest').then((m) => m.initManifest()),
  import('./core/content').then((m) => m.initContent()),
  import('./core/customChars').then((m) => m.initCustomChars()),
  import('./core/userSongs').then((m) => m.initUserSongs()),
]).then(() => router.go('home'));
