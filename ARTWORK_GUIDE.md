# 🎨 Artwork Guide — generating character art for Duet Stars

The game auto-loads custom art from `app/public/characters/`. Use the local
admin panel (`npm run dev` → http://127.0.0.1:5173/admin.html) to sanitize
and install images, then rebuild. Any character without custom art keeps
the built-in sculpted style, so you can migrate one character at a time.

## What to generate

**Required per character — 2 images:**

| Pose | Filename | Description |
|------|----------|-------------|
| Idle | `<charId>.idle.png` | mouth closed, calm sweet expression |
| Singing | `<charId>.sing.png` | mouth wide open (singing), joyful — same pose/angle as idle, ONLY the mouth/expression changes |

Character IDs: `cat-m` `cat-f` `chick-m` `chick-f` `dog-m` `dog-f` `frog-m`
`frog-f` `owl-m` `owl-f` `duck-m` `duck-f` `fox-m` `fox-f` `panda-m` `panda-f`
`ghost-m` `ghost-f` `robot-m` `robot-f` `dragon-m` `dragon-f` `star-m` `star-f`
(24 characters × 2 poses = 48 images.)

If `sing` is missing the game reuses `idle`, so you can start with 16 images.

## Framing rules (important — the game depends on this)

- **Front view, full body, sitting upright** (like a cat sitting facing you)
- Character **centered horizontally**, feet/bottom at the **bottom of the subject**
- Whole character visible with margin — nothing cropped
- **Plain white background** (the admin panel keys it out) or transparent PNG
- Square-ish canvas, 1024–2048 px
- Head roughly the **top 45–50%** of the character, body below — big-head chibi
- No props, no ground shadow, no text or watermark

## Midjourney prompt template

Base style prompt (keep identical across ALL characters for consistency):

```
cute kawaii chibi ANIMAL, mobile rhythm game character, front view, full body,
sitting upright facing viewer, big round head, small body, tiny paws,
flat pastel cel shading, clean thick dark-brown outlines, simple shapes,
adorable face with small bean eyes and blush cheeks, plain white background,
sticker style, no shadow --v 6 --style raw --ar 1:1
```

Per-character subject lines (replace ANIMAL):

| Character | Subject |
|-----------|---------|
| cat-m (Milo) | cream white cat with light brown patch over one ear and striped tail |
| cat-f (Mimi) | soft pink-white cat with a small pink flower behind one ear, long eyelashes |
| chick-m (Pip) | yellow baby chick with tiny orange beak and three head feathers |
| chick-f (Pippa) | pale yellow baby chick with a small pink bow, long eyelashes |
| dog-m (Bruno) | light brown puppy with darker floppy ears and patch over one eye |
| dog-f (Bella) | cream puppy with silky floppy ears, small pink flower, eyelashes |
| frog-m (Ferdie) | pastel green frog with eyes on top of head, wide happy mouth |
| frog-f (Lily) | mint green frog with waterlily flower on head, eyelashes |
| owl-m (Otto) | lavender purple owl with ear tufts and big round eyes |
| owl-f (Luna) | light lilac owl with ear tufts, small pink flower, eyelashes |
| duck-m (Quackers) | pale yellow duckling with wide flat orange bill and head feather swoosh |
| duck-f (Daisy) | white duckling with orange bill, small pink bow, eyelashes |
| fox-m (Rusty) | orange fox with big dark-tipped ears, white muzzle, fluffy white-tipped tail |
| fox-f (Roxy) | rose-gold fox with white muzzle, small pink flower, eyelashes |
| panda-m (Bao) | classic black and white panda, black limbs and eye patches |
| panda-f (Mei) | white panda with black limbs, plum blossom flower on head, eyelashes |

For the **sing** variant append: `, mouth wide open singing joyfully, same pose`

**Consistency tips:** generate the idle image first, then use it as a
character reference (`--cref <image url>` in Midjourney) for the sing variant
and keep `--style raw` + the same seed where possible.

## Install workflow

1. `npm run dev` → open http://127.0.0.1:5173/admin.html (the Character Studio)
2. Connect the app folder once (header button → pick the `app` folder)
3. Pick the character in the sidebar → Artwork section → "Replace…" on the idle or sing slot → drop the image
4. Adjust background-removal tolerance until the checkerboard shows through cleanly
5. Check the in-game preview (bench alignment) → "Save into project"
6. Rebuild: `npm run build` (web) or `npm run apk` (Android)

The studio can also record/upload a real voice per character (saved as
`<charId>.voice.wav` + registered in `manifest.json`), create new characters
from the species templates, and hide or delete roster members — see the
in-app "How it works" panel.

Sanitization performed automatically: raster-only (SVG rejected), 25 MB cap,
decode → re-encode strips all EXIF/metadata, background keyed from corners,
transparent margins trimmed, art normalized to the game's standard frame
(ground line at 92%, max height 83%, centered) as a clean 1024×1024 PNG.
