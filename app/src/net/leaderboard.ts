/**
 * Optional leaderboard client. The game is fully playable offline — this
 * talks only to the local backend on 127.0.0.1 and silently disables itself
 * if the backend isn't running. Nothing ever leaves the device.
 */

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8787';

export interface ScoreEntry {
  name: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  ts: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function submitScore(
  songId: string,
  entry: Omit<ScoreEntry, 'ts'>,
): Promise<{ rank: number } | null> {
  return request<{ rank: number }>(`/api/scores/${encodeURIComponent(songId)}`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function topScores(songId: string): Promise<{ scores: ScoreEntry[] } | null> {
  return request<{ scores: ScoreEntry[] }>(
    `/api/scores/${encodeURIComponent(songId)}`,
  );
}
