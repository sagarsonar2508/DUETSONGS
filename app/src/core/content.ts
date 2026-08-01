/**
 * App content config — the second half of the admin studio's bridge.
 *
 * public/content.json (written by the Character Studio, shipped with the
 * build) carries app-wide tunables that used to be hardcoded:
 *
 *   branding — home-screen title and tagline
 *   economy  — coin-price overrides: species couples, songs, and the
 *              "create your own star" cost
 *
 * Prices are stored as overrides (only values that differ from the code
 * defaults), so a missing or empty file means "stock game" and new code
 * defaults keep working. Song posters need no entry here — they are
 * presence-based files at public/posters/<songId>.png.
 *
 * Both the game boot (initContent) and the admin studio use
 * normalizeContent so the accepted shape is defined in exactly one place.
 */

import { SPECIES } from '../data/animals';
import { SONGS } from '../data/songs';
import { setCustomCharCost } from './customChars';

export interface Branding {
  title: string;
  tagline: string;
}

export interface EconomyOverrides {
  speciesCosts: Record<string, number>;
  songCosts: Record<string, number>;
  customCharCost: number | null;
}

export interface AppContent {
  version: 1;
  branding: Branding;
  economy: EconomyOverrides;
}

export const CONTENT_FILE = 'content.json';
export const CONTENT_URL = `/${CONTENT_FILE}`;

export const DEFAULT_BRANDING: Branding = {
  title: 'Duet Stars',
  tagline: 'catch the beat · sing the song',
};

/** Live branding — mutated once at boot, read by the home screen. */
export const branding: Branding = { ...DEFAULT_BRANDING };

export function emptyContent(): AppContent {
  return {
    version: 1,
    branding: { ...DEFAULT_BRANDING },
    economy: { speciesCosts: {}, songCosts: {}, customCharCost: null },
  };
}

function asCost(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  return Math.max(0, Math.min(999999, Math.round(x)));
}

function costMap(raw: unknown, validIds: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const cost = asCost(v);
    if (cost !== null && validIds.has(id)) out[id] = cost;
  }
  return out;
}

/** Coerce arbitrary JSON into a safe, well-formed content config. */
export function normalizeContent(raw: unknown): AppContent {
  const out = emptyContent();
  if (typeof raw !== 'object' || raw === null) return out;
  const c = raw as Record<string, unknown>;

  if (typeof c.branding === 'object' && c.branding !== null) {
    const b = c.branding as Record<string, unknown>;
    if (typeof b.title === 'string' && b.title.trim()) {
      out.branding.title = b.title.trim().slice(0, 28);
    }
    if (typeof b.tagline === 'string') {
      out.branding.tagline = b.tagline.trim().slice(0, 60);
    }
  }

  if (typeof c.economy === 'object' && c.economy !== null) {
    const e = c.economy as Record<string, unknown>;
    out.economy.speciesCosts = costMap(e.speciesCosts, new Set(SPECIES.map((s) => s.id)));
    out.economy.songCosts = costMap(e.songCosts, new Set(SONGS.map((s) => s.id)));
    out.economy.customCharCost = asCost(e.customCharCost);
  }
  return out;
}

/** Apply a config to the live data tables (mutation-at-boot, like manifest). */
export function applyContent(content: AppContent): void {
  branding.title = content.branding.title;
  branding.tagline = content.branding.tagline;

  for (const [id, cost] of Object.entries(content.economy.speciesCosts)) {
    const s = SPECIES.find((x) => x.id === id);
    if (s) s.cost = cost;
  }
  for (const [id, cost] of Object.entries(content.economy.songCosts)) {
    const s = SONGS.find((x) => x.id === id);
    if (s) s.cost = cost;
  }
  if (content.economy.customCharCost !== null) {
    setCustomCharCost(content.economy.customCharCost);
  }
}

/** Fetch and apply content.json at game boot. Missing file = stock game. */
export async function initContent(): Promise<void> {
  try {
    const res = await fetch(CONTENT_URL, { cache: 'no-cache' });
    if (res.ok) applyContent(normalizeContent(await res.json()));
  } catch {
    /* no content config — stock game */
  }
}
