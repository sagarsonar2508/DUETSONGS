/**
 * Tiny screen router. main.ts assigns the implementations; UI modules import
 * this object so there are no circular imports.
 */

export type ScreenId = 'home' | 'songs' | 'animals' | 'settings';

export interface Router {
  go(screen: ScreenId): void;
  play(songId: string): void;
}

export const router: Router = {
  go: () => {},
  play: () => {},
};
