/**
 * Admin studio state + actions.
 *
 * One store, one render loop: views subscribe, actions mutate and notify.
 * All persistent writes go through here, spread across the app folder:
 *
 *   public/characters/  — art PNGs, voice WAVs, manifest.json
 *   public/posters/     — song poster PNGs
 *   public/content.json — branding + price overrides
 *   assets/             — app icon & splash source images
 *
 * Reading works without any setup (assets under public/ come over the dev
 * server); writing — and reading assets/, which isn't served — requires
 * the app folder to be connected once.
 */

import { ANIMALS, SPECIES, type AnimalDef } from '../data/animals';
import { SONGS, type SongDef } from '../data/songs';
import { CUSTOM_CHAR_COST } from '../core/customChars';
import {
  emptyManifest,
  normalizeManifest,
  voiceFileName,
  MANIFEST_FILE,
  MANIFEST_URL,
  type CharacterManifest,
  type VoiceOverrideSpec,
} from '../core/manifest';
import {
  emptyContent,
  normalizeContent,
  CONTENT_FILE,
  CONTENT_URL,
  DEFAULT_BRANDING,
  type AppContent,
} from '../core/content';
import {
  registerVoiceOverride,
  unregisterVoiceOverride,
} from '../audio/voiceOverrides';
import * as fs from './fsAccess';

export type Pose = 'idle' | 'sing';
export const POSES: readonly Pose[] = ['idle', 'sing'] as const;

export type Section = 'characters' | 'songs' | 'app';
export type AppPage = 'branding' | 'economy' | 'icons';

export type View =
  | { kind: 'welcome' }
  | { kind: 'character'; id: string }
  | { kind: 'create' }
  | { kind: 'songs-home' }
  | { kind: 'song'; id: string }
  | { kind: 'app'; page: AppPage };

export type FolderStatus = 'connected' | 'reconnect' | 'disconnected' | 'unsupported';

export interface CharInfo {
  def: AnimalDef;
  /** defined in src/data/animals.ts (as opposed to created in the studio) */
  builtin: boolean;
  hidden: boolean;
  voice: VoiceOverrideSpec | null;
  art: Record<Pose, boolean>;
}

export interface SongInfo {
  def: SongDef;
  poster: boolean;
  /** effective price (override or code default) */
  cost: number;
  defaultCost: number;
}

/** Pristine code-default prices, snapshotted before any overrides apply
 *  (the studio never calls initContent, so these are the true defaults). */
export const DEFAULT_COSTS = {
  species: Object.fromEntries(SPECIES.map((s) => [s.id, s.cost])) as Record<string, number>,
  songs: Object.fromEntries(SONGS.map((s) => [s.id, s.cost])) as Record<string, number>,
  customChar: CUSTOM_CHAR_COST,
};

export const ICON_ASSETS = [
  { file: 'icon.png', label: 'App icon', size: 1024, hint: 'square launcher icon (iOS + fallback)' },
  { file: 'icon-foreground.png', label: 'Adaptive icon — foreground', size: 1024, hint: 'transparent background, keep art in the middle ⅔ safe zone' },
  { file: 'icon-background.png', label: 'Adaptive icon — background', size: 1024, hint: 'flat color or soft pattern behind the foreground' },
  { file: 'splash.png', label: 'Splash screen', size: 2732, hint: 'logo centered on a light background' },
  { file: 'splash-dark.png', label: 'Splash screen — dark', size: 2732, hint: 'logo centered on a dark background' },
] as const;

export type IconFile = (typeof ICON_ASSETS)[number]['file'];

interface State {
  ready: boolean;
  manifest: CharacterManifest;
  content: AppContent;
  dir: fs.DirHandle | null;
  perm: PermissionState | null;
  view: View;
  artPresent: Map<string, boolean>;
  posterPresent: Map<string, boolean>;
  /** object URLs of assets/ icon sources (read via the folder handle) */
  iconUrls: Partial<Record<IconFile, string>>;
  /** cache-busting counter for art/voice/poster URLs, bumped on every write */
  assetVer: number;
}

export const state: State = {
  ready: false,
  manifest: emptyManifest(),
  content: emptyContent(),
  dir: null,
  perm: null,
  view: { kind: 'welcome' },
  artPresent: new Map(),
  posterPresent: new Map(),
  iconUrls: {},
  assetVer: 1,
};

/* ------------------------------ subscription ------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): void {
  listeners.add(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

/* -------------------------------- selectors ------------------------------- */

export function folderStatus(): FolderStatus {
  if (!fs.fsAccessSupported()) return 'unsupported';
  if (!state.dir) return 'disconnected';
  return state.perm === 'granted' ? 'connected' : 'reconnect';
}

export function canWrite(): boolean {
  return folderStatus() === 'connected';
}

export function sectionOf(view: View): Section {
  switch (view.kind) {
    case 'songs-home':
    case 'song':
      return 'songs';
    case 'app':
      return 'app';
    default:
      return 'characters';
  }
}

function isBuiltin(id: string): boolean {
  return ANIMALS.some((a) => a.id === id);
}

function infoFor(def: AnimalDef, builtin: boolean): CharInfo {
  return {
    def,
    builtin,
    hidden: builtin && state.manifest.hidden.includes(def.id),
    voice: state.manifest.voices[def.id] ?? null,
    art: {
      idle: state.artPresent.get(`${def.id}.idle`) ?? false,
      sing: state.artPresent.get(`${def.id}.sing`) ?? false,
    },
  };
}

/** Full roster as the admin sees it: built-ins first, then studio-created. */
export function roster(): CharInfo[] {
  return [
    ...ANIMALS.map((a) => infoFor(a, true)),
    ...state.manifest.characters.filter((c) => !isBuiltin(c.id)).map((c) => infoFor(c, false)),
  ];
}

export function charInfo(id: string): CharInfo | null {
  return roster().find((c) => c.def.id === id) ?? null;
}

export function usedIds(): Set<string> {
  return new Set(roster().map((c) => c.def.id));
}

/** URL of the custom art file (undefined when only template art exists). */
export function artUrl(id: string, pose: Pose): string | undefined {
  return state.artPresent.get(`${id}.${pose}`)
    ? `/characters/${id}.${pose}.png?v=${state.assetVer}`
    : undefined;
}

export function songInfos(): SongInfo[] {
  return SONGS.map((def) => ({
    def,
    poster: state.posterPresent.get(def.id) ?? false,
    cost: state.content.economy.songCosts[def.id] ?? DEFAULT_COSTS.songs[def.id],
    defaultCost: DEFAULT_COSTS.songs[def.id],
  }));
}

export function songInfo(id: string): SongInfo | null {
  return songInfos().find((s) => s.def.id === id) ?? null;
}

export function posterUrl(songId: string): string | undefined {
  return state.posterPresent.get(songId)
    ? `/posters/${songId}.png?v=${state.assetVer}`
    : undefined;
}

/* --------------------------------- helpers -------------------------------- */

const NEEDS_FOLDER = 'Connect the app folder first (button in the header).';

function requireDir(): fs.DirHandle {
  if (!state.dir || state.perm !== 'granted') throw new Error(NEEDS_FOLDER);
  return state.dir;
}

const charactersDir = () => fs.subdir(requireDir(), ['public', 'characters'], true);
const postersDir = () => fs.subdir(requireDir(), ['public', 'posters'], true);
const publicDir = () => fs.subdir(requireDir(), ['public']);
const assetsDir = () => fs.subdir(requireDir(), ['assets'], true);

function probe(url: string, key: string, map: Map<string, boolean>): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      map.set(key, true);
      resolve();
    };
    img.onerror = () => {
      map.set(key, false);
      resolve();
    };
    img.src = url;
  });
}

async function scanAssets(): Promise<void> {
  const t = Date.now();
  await Promise.all([
    ...roster().flatMap((c) =>
      POSES.map((pose) =>
        probe(`/characters/${c.def.id}.${pose}.png?probe=${t}`, `${c.def.id}.${pose}`, state.artPresent),
      ),
    ),
    ...SONGS.map((s) => probe(`/posters/${s.id}.png?probe=${t}`, s.id, state.posterPresent)),
  ]);
}

function registerVoices(): void {
  for (const [id, spec] of Object.entries(state.manifest.voices)) {
    registerVoiceOverride(id, `/characters/${spec.file}?v=${state.assetVer}`, spec.baseFreq);
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function loadManifest(): Promise<void> {
  // the folder copy is authoritative when available; HTTP otherwise
  if (canWrite()) {
    const text = await fs.readText(await charactersDir(), MANIFEST_FILE);
    try {
      state.manifest = text === null ? emptyManifest() : normalizeManifest(JSON.parse(text));
      return;
    } catch {
      /* corrupt file — fall through to HTTP/empty */
    }
  }
  const raw = await fetchJson(MANIFEST_URL);
  state.manifest = raw === null ? emptyManifest() : normalizeManifest(raw);
}

async function loadContent(): Promise<void> {
  if (canWrite()) {
    const text = await fs.readText(await publicDir(), CONTENT_FILE);
    try {
      state.content = text === null ? emptyContent() : normalizeContent(JSON.parse(text));
      return;
    } catch {
      /* corrupt file — fall through */
    }
  }
  const raw = await fetchJson(CONTENT_URL);
  state.content = raw === null ? emptyContent() : normalizeContent(raw);
}

async function loadIcons(): Promise<void> {
  if (!canWrite()) return;
  const dir = await assetsDir();
  for (const icon of ICON_ASSETS) {
    const file = await fs.readFileBlob(dir, icon.file);
    const prev = state.iconUrls[icon.file];
    if (prev) URL.revokeObjectURL(prev);
    state.iconUrls[icon.file] = file ? URL.createObjectURL(file) : undefined;
  }
}

async function persistManifest(): Promise<void> {
  await fs.writeFile(
    await charactersDir(),
    MANIFEST_FILE,
    JSON.stringify(state.manifest, null, 2) + '\n',
  );
}

async function persistContent(): Promise<void> {
  state.content = normalizeContent(state.content); // belt & braces
  await fs.writeFile(
    await publicDir(),
    CONTENT_FILE,
    JSON.stringify(state.content, null, 2) + '\n',
  );
}

async function reloadAll(): Promise<void> {
  await Promise.all([loadManifest(), loadContent()]);
  registerVoices();
  await Promise.all([scanAssets(), loadIcons()]);
}

/** Wrap an action: returns an error message, or null on success. */
async function attempt(fn: () => Promise<void>): Promise<string | null> {
  try {
    await fn();
    notify();
    return null;
  } catch (e) {
    notify();
    return (e as Error).message || 'Something went wrong.';
  }
}

/* --------------------------------- actions -------------------------------- */

export async function init(): Promise<void> {
  state.dir = await fs.loadSavedDir();
  state.perm = state.dir ? await fs.permissionState(state.dir) : null;
  await Promise.all([loadManifest(), loadContent()]);
  registerVoices();
  // show the studio immediately; thumbnails upgrade as the scans stream in
  state.ready = true;
  notify();
  await Promise.all([scanAssets(), loadIcons()]);
  notify();
}

/** Pick (or re-pick) the app folder. Must run in a user gesture. */
export async function connectFolder(): Promise<string | null> {
  return attempt(async () => {
    const dir = await fs.pickAppDir().catch((e: Error) =>
      e.name === 'AbortError' ? null : Promise.reject(e),
    );
    if (!dir) throw new Error('That folder has no public/ inside — pick the app folder (or the repo root).');
    state.dir = dir;
    state.perm = 'granted';
    await reloadAll();
  });
}

/** Re-grant permission on a restored handle. Must run in a user gesture. */
export async function reconnectFolder(): Promise<string | null> {
  return attempt(async () => {
    if (!state.dir) throw new Error('No saved folder — connect it once.');
    const ok = await fs.requestPermission(state.dir);
    if (!ok) throw new Error('Permission denied — pick the folder again.');
    state.perm = 'granted';
    await reloadAll();
  });
}

export async function disconnectFolder(): Promise<void> {
  await fs.forgetDir();
  state.dir = null;
  state.perm = null;
  notify();
}

export function show(view: View): void {
  state.view = view;
  notify();
}

export function showSection(section: Section): void {
  show(
    section === 'characters'
      ? { kind: 'welcome' }
      : section === 'songs'
        ? { kind: 'songs-home' }
        : { kind: 'app', page: 'branding' },
  );
}

/* ------------------------------ art actions ------------------------------- */

export async function saveArt(id: string, pose: Pose, png: Blob): Promise<string | null> {
  return attempt(async () => {
    await fs.writeFile(await charactersDir(), `${id}.${pose}.png`, png);
    state.artPresent.set(`${id}.${pose}`, true);
    state.assetVer++;
  });
}

export async function removeArt(id: string, pose: Pose): Promise<string | null> {
  return attempt(async () => {
    await fs.deleteFile(await charactersDir(), `${id}.${pose}.png`);
    state.artPresent.set(`${id}.${pose}`, false);
    state.assetVer++;
  });
}

/* ----------------------------- voice actions ------------------------------ */

export async function saveVoice(
  id: string,
  wav: Blob,
  baseFreq: number,
): Promise<string | null> {
  return attempt(async () => {
    const file = voiceFileName(id);
    await fs.writeFile(await charactersDir(), file, wav);
    state.manifest.voices[id] = { file, baseFreq: Math.round(baseFreq * 10) / 10 };
    await persistManifest();
    state.assetVer++;
    registerVoiceOverride(id, `/characters/${file}?v=${state.assetVer}`, baseFreq);
  });
}

export async function removeVoice(id: string): Promise<string | null> {
  return attempt(async () => {
    const dir = await charactersDir();
    const spec = state.manifest.voices[id];
    if (spec) await fs.deleteFile(dir, spec.file);
    delete state.manifest.voices[id];
    await persistManifest();
    unregisterVoiceOverride(id);
  });
}

/* --------------------------- character actions ---------------------------- */

export async function createCharacter(def: AnimalDef): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    if (usedIds().has(def.id)) throw new Error(`The id "${def.id}" is already taken.`);
    state.manifest.characters.push(def);
    await persistManifest();
    for (const pose of POSES) state.artPresent.set(`${def.id}.${pose}`, false);
    state.view = { kind: 'character', id: def.id };
  });
}

export async function updateCharacter(def: AnimalDef): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    const i = state.manifest.characters.findIndex((c) => c.id === def.id);
    if (i < 0) throw new Error('Only studio-created characters can be edited.');
    state.manifest.characters[i] = def;
    await persistManifest();
  });
}

/** Delete a studio-created character and every file that belongs to it. */
export async function deleteCharacter(id: string): Promise<string | null> {
  return attempt(async () => {
    const dir = await charactersDir();
    const i = state.manifest.characters.findIndex((c) => c.id === id);
    if (i < 0) throw new Error('Built-in characters can be hidden, not deleted.');
    state.manifest.characters.splice(i, 1);
    const spec = state.manifest.voices[id];
    delete state.manifest.voices[id];
    await persistManifest();
    for (const pose of POSES) {
      await fs.deleteFile(dir, `${id}.${pose}.png`);
      state.artPresent.delete(`${id}.${pose}`);
    }
    if (spec) await fs.deleteFile(dir, spec.file);
    unregisterVoiceOverride(id);
    state.view = { kind: 'welcome' };
  });
}

/** Hide/restore a built-in character (they stay in code, but leave the game). */
export async function setHidden(id: string, hidden: boolean): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    if (!isBuiltin(id)) throw new Error('Only built-in characters can be hidden.');
    const set = new Set(state.manifest.hidden);
    if (hidden) set.add(id);
    else set.delete(id);
    if (ANIMALS.every((a) => set.has(a.id)) && state.manifest.characters.length === 0) {
      throw new Error('The game needs at least one character.');
    }
    state.manifest.hidden = [...set];
    await persistManifest();
  });
}

/* ------------------------------ poster actions ---------------------------- */

export async function savePoster(songId: string, png: Blob): Promise<string | null> {
  return attempt(async () => {
    await fs.writeFile(await postersDir(), `${songId}.png`, png);
    state.posterPresent.set(songId, true);
    state.assetVer++;
  });
}

export async function removePoster(songId: string): Promise<string | null> {
  return attempt(async () => {
    await fs.deleteFile(await postersDir(), `${songId}.png`);
    state.posterPresent.set(songId, false);
    state.assetVer++;
  });
}

/* ----------------------------- content actions ---------------------------- */

export async function saveBranding(title: string, tagline: string): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    state.content.branding = {
      title: title.trim() || DEFAULT_BRANDING.title,
      tagline: tagline.trim() || DEFAULT_BRANDING.tagline,
    };
    await persistContent();
  });
}

/** Store full price sets; values equal to the code default are pruned so
 *  content.json stays a minimal override file. */
export async function saveEconomy(next: {
  species: Record<string, number>;
  songs: Record<string, number>;
  customChar: number;
}): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    const prune = (vals: Record<string, number>, defaults: Record<string, number>) =>
      Object.fromEntries(
        Object.entries(vals).filter(([id, v]) => defaults[id] !== undefined && v !== defaults[id]),
      );
    state.content.economy = {
      speciesCosts: prune(next.species, DEFAULT_COSTS.species),
      songCosts: prune(next.songs, DEFAULT_COSTS.songs),
      customCharCost: next.customChar === DEFAULT_COSTS.customChar ? null : next.customChar,
    };
    await persistContent();
  });
}

export async function saveSongCost(songId: string, cost: number): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    if (cost === DEFAULT_COSTS.songs[songId]) delete state.content.economy.songCosts[songId];
    else state.content.economy.songCosts[songId] = cost;
    await persistContent();
  });
}

export async function resetEconomy(): Promise<string | null> {
  return attempt(async () => {
    requireDir();
    state.content.economy = {
      speciesCosts: {},
      songCosts: {},
      customCharCost: null,
    };
    await persistContent();
  });
}

/* ------------------------------- icon actions ----------------------------- */

export async function saveIcon(file: IconFile, png: Blob): Promise<string | null> {
  return attempt(async () => {
    await fs.writeFile(await assetsDir(), file, png);
    const prev = state.iconUrls[file];
    if (prev) URL.revokeObjectURL(prev);
    state.iconUrls[file] = URL.createObjectURL(png);
  });
}
