# Character content (managed by the Character Studio)

Files here are installed by the local admin studio
(http://127.0.0.1:5173/admin.html in dev) and ship with the build:

- `<charId>.<pose>.png` — sanitized custom art (`cat-m.idle.png`,
  `cat-m.sing.png`); characters without files use the built-in sculpted
  SVG art. See ../../../ARTWORK_GUIDE.md.
- `<charId>.voice.wav` — recorded voice sample (mono 16-bit WAV, ≤1.5 s);
  the game pitch-shifts it to sing the melody instead of the synth patch.
- `manifest.json` — studio-created characters, hidden built-ins, and the
  voice registry (`charId → { file, baseFreq }`). Missing manifest = stock
  game. Schema lives in `app/src/core/manifest.ts`.
