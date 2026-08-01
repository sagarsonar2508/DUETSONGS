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
- 3 hearts; a miss costs one. Revive once per song for 100 coins.
- Earn coins → unlock more characters and songs.

## Game design notes

- **Duet mechanic:** melody notes alternate between the two lanes, so the two
  animals genuinely trade phrases (hocket-style) — different animal pairs give
  every song a different character.
- **Scoring:** Perfect ×100 / Good ×60, combo multiplier up to 3×.
  Stars: ≥98% accuracy ★★★, ≥88% ★★, clear ★.
- **Songs:** Twinkle Twinkle, Old MacDonald, Mary Had a Little Lamb, Frère
  Jacques, Ode to Joy, Greensleeves, Für Elise, The Entertainer — all public
  domain, charted in a compact text notation in `app/src/data/songs.ts`.
- Add a song: append a `SongDef` with melody + chords. Add a character: add a
  couple of `AnimalDef`s, a voice patch in `instruments.ts`, and a sculpted
  template in `sprites.ts` — or just use the admin studio.

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
