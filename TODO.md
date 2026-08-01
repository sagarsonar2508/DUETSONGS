# Duet Stars — TODO

## Content authoring (all tooling ready — use the studio: `npm run dev` → /admin.html)

- [ ] **Song posters** — 16 songs, all still on gradient cards. Upload square art
      per song (Songs tab → drop image → auto-cropped to 512×512).
- [ ] **Custom character art** — all 24 characters are on the built-in vector
      templates. Optional Midjourney pass: up to 48 images (idle + sing per
      character), prompts in ARTWORK_GUIDE.md, install via Characters tab.
- [ ] **Recorded voices** — all characters sing with synth patches. Record or
      upload real samples per character (Characters tab → Voice → Record).
- [ ] **Economy balance pass** — new species cost 2000–3000 coins but the coin
      earn rate hasn't changed, so dragons/stars are a long grind. Tune in
      App tab → Economy (or raise per-song coin rewards in code).

## Pre-release checklist

- [ ] **Gate the `?all=1` cheat URL** — it ships in production today; anyone
      who knows it unlocks everything. Gate behind a dev flag before release.
- [ ] **Outfit refund (optional)** — the wardrobe feature was removed; players
      who had bought outfits keep nothing for those coins. Decide: one-time
      coin refund migration, or let it go.
- [ ] **Leaderboard decision** — backend binds to 127.0.0.1 only (dev-only).
      Ship it hosted somewhere, or remove the leaderboard toggle in Settings.
- [ ] **Release signing** — `npm run apk` builds a *debug* APK. Play Store
      needs a keystore + signing config (`android/app/build.gradle`) and an
      `assembleRelease`/`bundleRelease` step.
- [ ] **Play Store listing** — mic-usage disclosure (RECORD_AUDIO is used by
      "Create your Star", audio stays on-device), privacy policy URL. For the
      song-import feature: describe it as "play your own music files" only
      (never name copyrighted songs/artists), and never add any in-app way to
      download/rip music — file picker only.
- [ ] **iOS** — not set up at all (Android only). `npx cap add ios` when ready.
- [ ] **Device test pass** — install the APK on a real phone: audio latency
      (Settings → calibration), mic recording, custom stars surviving app
      restart, new characters/voices in gameplay. Uninstall any old
      "Animal Duet" build first (the app id changed).
