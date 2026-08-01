# ⭐ Duet Stars

A cute rhythm game inspired by Duet Cats — but upgraded: **12 species × male &
female = 24 characters** (animals, ghosts, robots, dragons and literal stars),
each with its own synthesized singing voice (females bright and sparkly, males
dark and round), performing public-domain classics as a duet. Catch the
falling treats in time and *you* perform the song — sustained notes fall as
**elongated treats you must hold** while the voice holds the note.

Everything is local: no image/audio assets (all art is parametric canvas
drawing, all sound is Web Audio synthesis), no external requests, no licensing
issues. The optional backend binds to `127.0.0.1` only.

## Structure

```
animalDuet/
├── app/        # the game — Vite + TypeScript + Canvas + Web Audio
│   └── src/
│       ├── audio/   # engine, animal voice synths, backing band
│       ├── core/    # save data (localStorage), router
│       ├── data/    # animal roster, song charts (compact notation)
│       ├── game/    # gameplay scene, canvas art, particles
│       ├── net/     # optional leaderboard client (graceful offline)
│       └── ui/      # home / songs / animals / settings / results
├── backend/    # optional local leaderboard (Express, JSON file store)
└── start.sh    # run both
```

## Run

```bash
# one-time
cd app && npm install
cd ../backend && npm install

# start everything (game on http://127.0.0.1:5173)
./start.sh

# or just the game (leaderboard auto-disables)
cd app && npm run dev
```

Open http://127.0.0.1:5173 — on a phone-sized window for the intended feel.

## How to play

- **Touch:** hold and drag on the left / right half — each side moves that
  side's animal. Multi-touch supported.
- **Keyboard:** `A`/`D` moves the left animal, `←`/`→` the right. `Esc` pauses.
- Catch treats when they reach your animal — each catch *sings the melody
  note* in that animal's voice. Perfect catches (dead center) score more.
- Sudden death: a single miss ends the run — revive once per song for 100 coins.
- Earn coins → unlock more characters and songs.
- **2-player duet:** toggle 👥 2P on the Songs screen — one player per lane on
  the same device (multi-touch), with a per-player breakdown at the end.
- **Endless mode:** toggle ∞ — the song loops, speeding up each lap, until
  the miss. Coins per loop.
- **Daily Duet:** a date-seeded song + character pair on the home screen with
  a coin bonus — locked content is free to *try* in the daily.
- **Awards:** 13 achievements with coin rewards (🏆 on the home screen), plus
  daily login streak coins.
- Results can be **shared** as a rendered image card via the system share
  sheet.

## Game design notes

- **Duet mechanic:** melody notes alternate between the two lanes, so the two
  animals genuinely trade phrases (hocket-style) — different animal pairs give
  every song a different character.
- **Scoring:** Perfect ×100 / Good ×60, combo multiplier up to 3×.
  Stars: ≥98% accuracy ★★★, ≥88% ★★, clear ★.
- **Songs (16):** Twinkle Twinkle, Old MacDonald, Mary Had a Little Lamb,
  Frère Jacques, Ode to Joy, Greensleeves, Für Elise, The Entertainer, Happy
  Birthday, Row Your Boat, London Bridge, Yankee Doodle, Jingle Bells, Silent
  Night, Korobeiniki, Mountain King (Grieg) — all public-domain melodies,
  charted in a compact text notation in `app/src/data/songs.ts`.
- Add a song: append a `SongDef` with melody + chords. Add a character: add a
  couple of `AnimalDef`s, a voice patch in `instruments.ts`, and a sculpted
  template in `sprites.ts` — or just use the admin studio.

## Play your own song

The song list has an import card: pick any audio file from the device and an
on-device neural transcription (Spotify's open-source [basic-pitch] model,
Apache-2.0, bundled locally — no network) extracts the melody, detects tempo
and key, and builds a chart the characters sing in their own voices. The
original audio is discarded after analysis — nothing is stored, played back,
uploaded, or redistributed, which keeps the feature clean of music-licensing
issues. Charts live in IndexedDB, deletable from the song list.

[basic-pitch]: https://github.com/spotify/basic-pitch-ts

## Admin Studio (local content management)

`npm run dev` → http://127.0.0.1:5173/admin.html — a local, dev-only studio
(never bundled into the build output). Connect the `app` folder once (File
System Access API, Chromium browsers) and everything is editable:

- **🐾 Characters** — view/replace artwork per pose (auto-sanitized), record
  or upload a real singing voice per character, create new characters from
  the species templates, hide built-ins, delete studio characters.
- **🎵 Songs** — upload posters for song cards, edit unlock prices.
- **📱 App** — home-screen title & tagline, every coin price in one table,
  and the app icon / splash source images in `app/assets/`.

Everything is stored as plain files the game loads at boot:
`public/characters/` (art, voices, `manifest.json`), `public/posters/`,
`public/content.json`. No files = stock game. After changing icons, run
`npx @capacitor/assets generate --android` before building the APK.

## Android APK

```bash
cd app && npm run apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```
