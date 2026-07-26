# 🐾 Animal Duet

A cute rhythm game inspired by Duet Cats — but upgraded: **8 species × male &
female = 16 characters**, each with its own synthesized singing voice (females
bright and sparkly, males dark and round), performing public-domain classics
as a duet. Catch the falling treats in time and *you* perform the song —
sustained notes fall as **elongated treats you must hold** while the voice
holds the note. Dress characters in **outfits** (tuxedo, wedding dress + veil,
bows, crowns, hats, scarves) bought with coins.

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
- Earn coins → unlock 6 more animals and 6 more songs.

## Game design notes

- **Duet mechanic:** melody notes alternate between the two lanes, so the two
  animals genuinely trade phrases (hocket-style) — different animal pairs give
  every song a different character.
- **Scoring:** Perfect ×100 / Good ×60, combo multiplier up to 3×.
  Stars: ≥98% accuracy ★★★, ≥88% ★★, clear ★.
- **Songs:** Twinkle Twinkle, Old MacDonald, Mary Had a Little Lamb, Frère
  Jacques, Ode to Joy, Greensleeves, Für Elise, The Entertainer — all public
  domain, charted in a compact text notation in `app/src/data/songs.ts`.
- Add a song: append a `SongDef` with melody + chords. Add an animal: add a
  couple of `AnimalDef`s, a voice patch in `instruments.ts`, and a draw
  function in `art.ts`. Add an outfit: an `OutfitDef` + a layer in `art.ts`.

## Android APK

```bash
cd app && npm run apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```
