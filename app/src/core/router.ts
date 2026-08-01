/**
 * Tiny screen router. main.ts assigns the implementations; UI modules import
 * this object so there are no circular imports.
 */

export type ScreenId = 'home' | 'songs' | 'animals' | 'settings' | 'awards';

/** Extra ways to start a song beyond the classic tap-to-play. */
export interface PlayOpts {
  /** endless: the song loops, speeding up each lap, until the miss */
  mode?: 'normal' | 'endless';
  /** force the duet pair (daily challenge) */
  chars?: [string, string];
  /** this run is today's daily challenge */
  daily?: boolean;
}

export interface Router {
  go(screen: ScreenId): void;
  play(songId: string, opts?: PlayOpts): void;
}

export const router: Router = {
  go: () => {},
  play: () => {},
};
