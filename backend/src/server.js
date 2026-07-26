/**
 * Animal Duet — local leaderboard service.
 *
 * Deliberately tiny: the game is fully playable without it (frontend
 * silently disables the leaderboard if this isn't running). Binds to
 * 127.0.0.1 only — nothing is ever exposed off this device. Scores are
 * persisted to a JSON file with atomic writes.
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'scores.json');
const PORT = process.env.PORT || 8787;
const MAX_PER_SONG = 500;

fs.mkdirSync(DATA_DIR, { recursive: true });

/** @type {Record<string, Array<{name:string,score:number,accuracy:number,maxCombo:number,ts:number}>>} */
let db = {};
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch {
  db = {};
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFile(tmp, JSON.stringify(db), (err) => {
      if (!err) fs.rename(tmp, DATA_FILE, () => {});
    });
  }, 250);
}

// naive per-IP rate limit: 20 writes/minute is plenty for a rhythm game
const writeLog = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const log = (writeLog.get(ip) || []).filter((t) => now - t < 60_000);
  if (log.length >= 20) return true;
  log.push(now);
  writeLog.set(ip, log);
  return false;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '4kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'animal-duet-backend' });
});

app.get('/api/scores/:songId', (req, res) => {
  const scores = db[req.params.songId] || [];
  res.json({ scores: scores.slice(0, 20) });
});

app.post('/api/scores/:songId', (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'slow down' });
  }
  const { songId } = req.params;
  const { name, score, accuracy, maxCombo } = req.body || {};
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    name.length > 16 ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 10_000_000 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 1 ||
    !Number.isFinite(maxCombo) ||
    maxCombo < 0 ||
    maxCombo > 100_000
  ) {
    return res.status(400).json({ error: 'invalid score payload' });
  }
  const list = db[songId] || (db[songId] = []);
  list.push({
    name: name.trim(),
    score: Math.round(score),
    accuracy,
    maxCombo: Math.round(maxCombo),
    ts: Date.now(),
  });
  list.sort((a, b) => b.score - a.score);
  if (list.length > MAX_PER_SONG) list.length = MAX_PER_SONG;
  const rank = list.findIndex((e) => e.score === Math.round(score)) + 1;
  scheduleSave();
  res.json({ rank });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Animal Duet backend listening on http://127.0.0.1:${PORT} (local only)`);
});
